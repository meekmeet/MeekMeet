import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({ getResend: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import {
  getLeaderRoomData,
  markRsvpAttendance,
  updateMeetingAccess,
  notifyMembersOfJoinDetails,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const LEADER = makeAuthUser({ id: "22222222-2222-2222-2222-222222222222" });

const CIRCLE_ID = "33333333-3333-3333-3333-333333333333";
const MEETING_ID = "11111111-1111-1111-1111-111111111111";
const RSVP_ID = "44444444-4444-4444-4444-444444444444";

const MEETING = {
  id: MEETING_ID,
  circle_id: CIRCLE_ID,
  scheduled_at: "2026-12-01T09:00:00.000Z",
  location_name: "Gosford Library",
  location_address: "123 Chapel St",
  meeting_type: "hybrid",
  join_url: "https://zoom.us/j/room",
  access_id: null,
  access_code: null,
  notes: "Bring the printed run sheet.",
  circles: { name: "Gosford Circle" },
};

const CIRCLE = {
  name: "Gosford Circle",
  description: "A circle for the Gosford street.",
  location: "Gosford NSW",
  meeting_place: "Gosford Library",
  meeting_address: "123 Chapel St",
  image_url: null,
  zoom_room_url: "https://zoom.us/j/standing",
};

const sendMock = vi.fn().mockResolvedValue({ id: "email-1" });

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.inserts.length = 0;
  mockSupa.asUser(LEADER);
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
  sendMock.mockResolvedValue({ id: "email-1" });
  vi.mocked(getResend).mockReturnValue({ emails: { send: sendMock } } as never);
});

describe("getLeaderRoomData", () => {
  it("gates on leadership: a plain member cannot open the room", async () => {
    mockSupa.enqueue(null); // no circle_shepherds row
    mockSupa.enqueue({ role: "member" }); // profile
    await expect(getLeaderRoomData(CIRCLE_ID, MEETING_ID)).rejects.toThrow(
      "Only the circle's leader"
    );
  });

  it("rejects unauthenticated callers", async () => {
    mockSupa.asUser(null);
    await expect(getLeaderRoomData(CIRCLE_ID, MEETING_ID)).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("lets a circle leader in: meeting, circle, roster with handbooks, counts", async () => {
    mockSupa.enqueue({ circle_id: CIRCLE_ID }); // circle_shepherds row
    mockSupa.enqueue({ role: "member" }); // profile (not admin — leader row suffices)
    mockSupa.enqueue(MEETING); // meeting
    mockSupa.enqueue(CIRCLE); // circle
    mockSupa.enqueue([
      {
        id: RSVP_ID,
        user_id: "u1",
        status: "going",
        attendance: null,
        profiles: { full_name: "Miriam" },
      },
      {
        id: "r2",
        user_id: "u2",
        status: "maybe",
        attendance: "attended",
        profiles: { full_name: "Sam" },
      },
    ]); // rsvps
    mockSupa.enqueue([
      {
        profile_id: "u1",
        variant: "first_circle",
        completed_at: "2026-11-28T00:00:00Z",
        responses: [{ question_id: "hom-1", question: "Q?", answer: "A." }],
        intentions: "carry the street",
      },
    ]); // handbooks

    const room = await getLeaderRoomData(CIRCLE_ID, MEETING_ID);

    expect(room.meeting.circle_name).toBe("Gosford Circle");
    expect(room.meeting.join_url).toBe("https://zoom.us/j/room");
    expect(room.meeting.access_id).toBeNull();
    expect(room.circle.location).toBe("Gosford NSW");
    expect(room.circle.zoom_room_url).toBe("https://zoom.us/j/standing");
    expect(room.roster).toHaveLength(2);

    const miriam = room.roster[0];
    expect(miriam.name).toBe("Miriam");
    expect(miriam.attendance).toBeNull();
    expect(miriam.handbook?.completed).toBe(true);
    expect(miriam.handbook?.variant).toBe("first_circle");
    expect(miriam.handbook?.responses[0].answer).toBe("A.");
    expect(miriam.handbook?.intentions).toBe("carry the street");

    const sam = room.roster[1];
    expect(sam.attendance).toBe("attended");
    expect(sam.handbook).toBeNull(); // no handbook yet

    expect(room.counts).toEqual({
      reserved: 1,
      maybe: 1,
      sealed: 1,
      firstCircle: 1,
    });
  });

  it("carries the access details when the leader set them", async () => {
    mockSupa.enqueue({ circle_id: CIRCLE_ID });
    mockSupa.enqueue({ role: "member" });
    mockSupa.enqueue({
      ...MEETING,
      access_id: "852 0149 6332",
      access_code: "MEEK",
    });
    mockSupa.enqueue(CIRCLE);
    mockSupa.enqueue([]);
    mockSupa.enqueue([]);

    const room = await getLeaderRoomData(CIRCLE_ID, MEETING_ID);
    expect(room.meeting.access_id).toBe("852 0149 6332");
    expect(room.meeting.access_code).toBe("MEEK");
  });

  it("lets an admin in even without a leader row", async () => {
    mockSupa.enqueue(null); // no circle_shepherds row
    mockSupa.enqueue({ role: "admin" }); // profile
    mockSupa.enqueue(MEETING);
    mockSupa.enqueue(CIRCLE);
    mockSupa.enqueue([]); // rsvps
    mockSupa.enqueue([]); // handbooks

    const room = await getLeaderRoomData(CIRCLE_ID, MEETING_ID);
    expect(room.roster).toEqual([]);
  });

  it("throws when the meeting is not in this circle", async () => {
    mockSupa.enqueue({ circle_id: CIRCLE_ID });
    mockSupa.enqueue({ role: "member" });
    mockSupa.enqueue(null, { message: "not found" });
    await expect(getLeaderRoomData(CIRCLE_ID, MEETING_ID)).rejects.toThrow(
      "Meeting not found"
    );
  });
});

describe("markRsvpAttendance", () => {
  it("writes through the mark_attendance RPC, never a direct table update", async () => {
    await markRsvpAttendance(RSVP_ID, "attended");
    expect(mockSupa.rpc).toHaveBeenCalledWith("mark_attendance", {
      p_rsvp_id: RSVP_ID,
      p_attendance: "attended",
    });
    expect(mockSupa.tables).not.toContain("rsvps");
  });

  it("supports absent and clearing the mark", async () => {
    await markRsvpAttendance(RSVP_ID, "absent");
    expect(mockSupa.rpc).toHaveBeenCalledWith("mark_attendance", {
      p_rsvp_id: RSVP_ID,
      p_attendance: "absent",
    });
    await markRsvpAttendance(RSVP_ID, null);
    expect(mockSupa.rpc).toHaveBeenCalledWith("mark_attendance", {
      p_rsvp_id: RSVP_ID,
      p_attendance: null,
    });
  });

  it("rejects invalid values before touching the database", async () => {
    await expect(
      markRsvpAttendance(RSVP_ID, "late" as never)
    ).rejects.toThrow("Invalid attendance value");
    expect(mockSupa.rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid RSVP ids", async () => {
    await expect(markRsvpAttendance("nope", "attended")).rejects.toThrow(
      "Invalid RSVP ID"
    );
  });

  it("surfaces RPC errors (e.g. the caller is not the leader)", async () => {
    mockSupa.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Only the circle leader can mark attendance" },
    });
    await expect(markRsvpAttendance(RSVP_ID, "attended")).rejects.toThrow(
      "Only the circle leader"
    );
  });
});

describe("updateMeetingAccess", () => {
  const ACCESS = { joinUrl: "https://zoom.us/j/new", accessId: "123 456", accessCode: "MEEK" };

  function asMeetingLeader() {
    mockSupa.enqueue({ id: MEETING_ID, circle_id: CIRCLE_ID }); // meeting lookup
    mockSupa.enqueue({ circle_id: CIRCLE_ID }); // leadership check
  }

  it("updates join link, meeting ID, and passcode for the circle's leader", async () => {
    asMeetingLeader();
    await updateMeetingAccess(MEETING_ID, ACCESS);
    expect(mockSupa.updates).toContainEqual({
      join_url: ACCESS.joinUrl,
      access_id: ACCESS.accessId,
      access_code: ACCESS.accessCode,
    });
  });

  it("blank fields clear the way in", async () => {
    asMeetingLeader();
    await updateMeetingAccess(MEETING_ID, { joinUrl: "", accessId: "", accessCode: "  " });
    expect(mockSupa.updates).toContainEqual({
      join_url: null,
      access_id: null,
      access_code: null,
    });
  });

  it("rejects malformed join URLs", async () => {
    asMeetingLeader();
    await expect(
      updateMeetingAccess(MEETING_ID, { ...ACCESS, joinUrl: "not a url" })
    ).rejects.toThrow("Join URL must be a valid URL");
  });

  it("enforces field length limits", async () => {
    asMeetingLeader();
    await expect(
      updateMeetingAccess(MEETING_ID, { ...ACCESS, accessId: "9".repeat(101) })
    ).rejects.toThrow("Meeting ID must be at most 100 characters");
  });

  it("refuses non-leaders", async () => {
    mockSupa.enqueue({ id: MEETING_ID, circle_id: CIRCLE_ID });
    mockSupa.enqueue(null); // no leadership row
    await expect(updateMeetingAccess(MEETING_ID, ACCESS)).rejects.toThrow(
      "Only the circle's leader can change the way in"
    );
  });

  it("rejects invalid meeting IDs before any query", async () => {
    await expect(updateMeetingAccess("nope", ACCESS)).rejects.toThrow(
      "Invalid meeting ID"
    );
  });
});

describe("notifyMembersOfJoinDetails", () => {
  const MEETING_WITH_ACCESS = {
    ...MEETING,
    access_id: "852 0149 6332",
    access_code: "MEEK",
  };

  function enqueueLeaderAndMeeting() {
    mockSupa.enqueue({ id: MEETING_ID, circle_id: CIRCLE_ID }); // meeting lookup
    mockSupa.enqueue({ circle_id: CIRCLE_ID }); // leadership check
    mockSupa.enqueue(MEETING_WITH_ACCESS); // full meeting row
  }

  it("sends the way in to every reserved member", async () => {
    enqueueLeaderAndMeeting();
    mockSupa.enqueue([
      { user_id: "u1", profiles: { email: "miriam@example.com", full_name: "Miriam" } },
      { user_id: "u2", profiles: { email: "sam@example.com", full_name: "Sam" } },
      { user_id: "u3", profiles: { email: null, full_name: "No Email" } },
    ]); // going rsvps

    const result = await notifyMembersOfJoinDetails(MEETING_ID);

    expect(result.notified).toBe(2);
    expect(sendMock).toHaveBeenCalledTimes(2);
    const firstCall = sendMock.mock.calls[0][0];
    expect(firstCall.to).toBe("miriam@example.com");
    expect(firstCall.html).toContain("https://zoom.us/j/room");
    expect(firstCall.html).toContain("852 0149 6332");
    expect(firstCall.html).toContain("MEEK");
    expect(firstCall.html).toContain("Gosford Circle");
    expect(firstCall.subject).toContain("the way in");
  });

  it("refuses to send when the join link is not set", async () => {
    enqueueLeaderAndMeeting();
    mockSupa.results[2] = { data: { ...MEETING_WITH_ACCESS, join_url: null }, error: null };
    await expect(notifyMembersOfJoinDetails(MEETING_ID)).rejects.toThrow(
      "Set the way in first"
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("refuses non-leaders before sending anything", async () => {
    mockSupa.enqueue({ id: MEETING_ID, circle_id: CIRCLE_ID });
    mockSupa.enqueue(null); // no leadership row
    await expect(notifyMembersOfJoinDetails(MEETING_ID)).rejects.toThrow(
      "Only the circle's leader"
    );
    expect(sendMock).not.toHaveBeenCalled();
  });
});
