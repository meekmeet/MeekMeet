import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getLeaderRoomData, markRsvpAttendance } from "./actions";

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
  notes: "Bring the printed run sheet.",
  circles: { name: "Gosford Circle" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.inserts.length = 0;
  mockSupa.asUser(LEADER);
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
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

  it("lets a circle leader in and shapes the roster with handbooks", async () => {
    mockSupa.enqueue({ circle_id: CIRCLE_ID }); // circle_shepherds row
    mockSupa.enqueue({ role: "member" }); // profile (not admin — leader row suffices)
    mockSupa.enqueue(MEETING); // meeting
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
  });

  it("lets an admin in even without a leader row", async () => {
    mockSupa.enqueue(null); // no circle_shepherds row
    mockSupa.enqueue({ role: "admin" }); // profile
    mockSupa.enqueue(MEETING);
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
