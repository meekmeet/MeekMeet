import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";
import { getNextNewMoon } from "@meekmeet/core/utils";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import {
  createMeeting,
  cancelMeeting,
  deleteMeeting,
  updateCircle,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const shepherd = makeAuthUser();
const circleId = "22222222-2222-2222-2222-222222222222";
const itemId = "77777777-7777-7777-7777-777777777777";

function asShepherd(role: "lead" | "assistant" = "lead") {
  mockSupa.asUser(shepherd);
  mockSupa.enqueue({ id: "shep-1", role });
}

function asNonShepherd() {
  mockSupa.asUser(shepherd);
  mockSupa.enqueue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

// ============ MEETINGS ============

describe("createMeeting", () => {
  // Circles gather on the new moon — every happy-path date below is the
  // upcoming new moon.
  const future = getNextNewMoon().toISOString();

  it("throws for non-shepherds", async () => {
    asNonShepherd();
    await expect(createMeeting(circleId, future, 120, "", "", "")).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });

  it("rejects unparseable dates", async () => {
    asShepherd();
    await expect(createMeeting(circleId, "not-a-date", 120, "", "", "")).rejects.toThrow(
      "Invalid scheduled date"
    );
  });

  it("rejects a date that is not the new moon", async () => {
    asShepherd();
    const fullMoon = new Date(
      getNextNewMoon().getTime() + Math.round(14.77 * 24 * 3600 * 1000)
    ).toISOString();
    await expect(createMeeting(circleId, fullMoon, 120, "", "", "")).rejects.toThrow(
      /Circles gather on the new moon/
    );
  });

  it("accepts the evening beside the new moon (tolerance)", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    const eve = new Date(getNextNewMoon().getTime() - 20 * 3600 * 1000).toISOString();
    await expect(createMeeting(circleId, eve, 60, "", "", "")).resolves.toBeUndefined();
  });

  it("names the nearest new moon in the rejection message", async () => {
    asShepherd();
    const away = new Date(
      getNextNewMoon().getTime() + 7 * 24 * 3600 * 1000
    ).toISOString();
    await expect(createMeeting(circleId, away, 60, "", "", "")).rejects.toThrow(
      /nearest new moon is/
    );
  });

  it("defaults invalid durations to 120", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 0 as number, "", "", "")
    ).resolves.toBeUndefined();
  });

  it.each(["in_person", "hybrid"] as const)(
    "rejects %s meetings — Meek Meet gathers online only",
    async (meetingType) => {
      asShepherd();
      await expect(
        createMeeting(circleId, future, 60, "Hall", "1 St", "Notes", meetingType)
      ).rejects.toThrow(/gathers online only/);
    }
  );

  it("rejects invalid meeting types (nothing falls back to in-person)", async () => {
    asShepherd();
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "telepathy" as never)
    ).rejects.toThrow(/gathers online only/);
  });

  it("accepts digital meetings", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "Notes", "digital")
    ).resolves.toBeUndefined();
  });

  it("documents that join URLs are stored without format validation", async () => {
    // createMeeting accepts any non-empty string for joinUrl; the app only
    // links to it for signed-in RSVPs. Validation would go here if added.
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "digital", "not-a-url")
    ).resolves.toBeUndefined();
  });

  it("accepts a valid https join URL", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "digital", "https://zoom.us/j/123")
    ).resolves.toBeUndefined();
  });

  it("treats blank join URL as null (the standing room may hold the door)", async () => {
    asShepherd();
    mockSupa.enqueue({ zoom_room_url: null }).enqueue(null);
    await expect(createMeeting(circleId, future, 60, "", "", "", "digital", "   ")).resolves.toBeUndefined();
  });

  it("throws when the insert fails", async () => {
    asShepherd();
    mockSupa.enqueue(null).enqueue(null, { message: "insert failed" });
    await expect(createMeeting(circleId, future, 60, "", "", "")).rejects.toThrow("insert failed");
  });
});

describe("cancelMeeting", () => {
  it("rejects invalid IDs", async () => {
    await expect(cancelMeeting("bad")).rejects.toThrow("Invalid meeting ID");
  });

  it("throws when the meeting does not exist", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue(null, { message: "missing" });
    await expect(cancelMeeting(itemId)).rejects.toThrow("Meeting not found");
  });

  it("cancels for the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(cancelMeeting(itemId)).resolves.toBeUndefined();
    expect(mockSupa.tables).toEqual(["meetings", "circle_shepherds", "meetings"]);
  });

  it("throws for non-shepherds", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue(null);
    await expect(cancelMeeting(itemId)).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });
});

describe("deleteMeeting", () => {
  it("rejects invalid IDs", async () => {
    await expect(deleteMeeting("bad")).rejects.toThrow("Invalid meeting ID");
  });

  it("deletes for the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(deleteMeeting(itemId)).resolves.toBeUndefined();
  });
});

// ============ CIRCLE SETTINGS ============

describe("updateCircle", () => {
  const base = {
    name: "Circle Name",
    description: "A description",
    location: "Sydney",
    meetingPlace: "Community Hall",
    meetingAddress: "1 Main St",
    imageUrl: "",
  };

  it("throws for non-shepherds", async () => {
    asNonShepherd();
    await expect(updateCircle(circleId, base)).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });

  it("requires a non-empty name", async () => {
    asShepherd();
    await expect(updateCircle(circleId, { ...base, name: "  " })).rejects.toThrow(
      "Name is required"
    );
  });

  it("requires a non-empty location", async () => {
    asShepherd();
    await expect(updateCircle(circleId, { ...base, location: "" })).rejects.toThrow(
      "Location is required"
    );
  });

  it("rejects malformed image URLs", async () => {
    asShepherd();
    await expect(updateCircle(circleId, { ...base, imageUrl: "not a url" })).rejects.toThrow(
      "Image URL must be a valid URL"
    );
  });

  it.each([
    "https://example.com/image.png",
    "http://example.com/image.jpg",
  ])("accepts valid image URL %s", async (imageUrl) => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(updateCircle(circleId, { ...base, imageUrl })).resolves.toBeUndefined();
  });

  it("treats blank image URL as null", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(updateCircle(circleId, { ...base, imageUrl: "   " })).resolves.toBeUndefined();
  });

  it("rejects javascript: image URLs", async () => {
    asShepherd();
    await expect(
      updateCircle(circleId, { ...base, imageUrl: "javascript:alert(1)" })
    ).rejects.toThrow("Image URL must be a valid URL");
  });

  it("updates the circle for the shepherd", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(updateCircle(circleId, base)).resolves.toBeUndefined();
    expect(mockSupa.tables).toEqual(["circle_shepherds", "circles"]);
  });

  it("rejects malformed standing-room URLs", async () => {
    asShepherd();
    await expect(
      updateCircle(circleId, { ...base, zoomRoomUrl: "not a url" })
    ).rejects.toThrow("Room URL must be a valid URL");
    asShepherd();
    await expect(
      updateCircle(circleId, { ...base, zoomRoomUrl: "javascript:alert(1)" })
    ).rejects.toThrow("Room URL must be a valid URL");
  });

  it("accepts a valid standing-room URL", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      updateCircle(circleId, { ...base, zoomRoomUrl: "https://zoom.us/j/123456" })
    ).resolves.toBeUndefined();
  });

  it("clears the standing room when blanked out", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      updateCircle(circleId, { ...base, zoomRoomUrl: "   " })
    ).resolves.toBeUndefined();
  });

  it("falls back to the circle's standing room for digital meetings", async () => {
    const future = getNextNewMoon().toISOString();
    asShepherd();
    // shepherd check → standing-room lookup → meeting insert
    mockSupa
      .enqueue({ id: "shep-1", role: "lead" })
      .enqueue({ zoom_room_url: "https://zoom.us/j/standing-room" })
      .enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "digital")
    ).resolves.toBeUndefined();
    expect(mockSupa.tables).toEqual(["circle_shepherds", "circles", "meetings"]);
  });

  it("uses an explicit join URL over the standing room", async () => {
    const future = getNextNewMoon().toISOString();
    asShepherd();
    mockSupa.enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "digital", "https://meet.google.com/abc")
    ).resolves.toBeUndefined();
    // No standing-room lookup happened.
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(0);
  });

  it("always looks for the standing room when no join URL is given (meetings are digital)", async () => {
    const future2 = getNextNewMoon().toISOString();
    asShepherd();
    mockSupa.enqueue({ zoom_room_url: null }).enqueue(null);
    await expect(createMeeting(circleId, future2, 60, "", "", "")).resolves.toBeUndefined();
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(1);
  });

  it("throws when the update fails", async () => {
    asShepherd();
    mockSupa.enqueue(null, { message: "update failed" });
    await expect(updateCircle(circleId, base)).rejects.toThrow("update failed");
  });
});
