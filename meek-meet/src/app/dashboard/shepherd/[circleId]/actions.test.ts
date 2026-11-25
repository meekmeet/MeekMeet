import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  reorderRoutines,
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

// ============ QUESTIONS ============

describe("createQuestion", () => {
  it("rejects invalid circle IDs", async () => {
    await expect(createQuestion("bad", "content")).rejects.toThrow("Invalid circle ID");
  });

  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(createQuestion(circleId, "content")).rejects.toThrow("Unauthorized");
  });

  it("throws when the user is not the shepherd", async () => {
    asNonShepherd();
    await expect(createQuestion(circleId, "content")).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });

  it("rejects empty content", async () => {
    asShepherd();
    await expect(createQuestion(circleId, "   ")).rejects.toThrow("Content is required");
  });

  it("rejects content over 1000 characters", async () => {
    asShepherd();
    await expect(createQuestion(circleId, "x".repeat(1001))).rejects.toThrow(
      "Content must be at most 1000 characters"
    );
  });

  it("appends after the highest existing order index", async () => {
    asShepherd();
    mockSupa.enqueue({ order_index: 4 }).enqueue(null);
    await createQuestion(circleId, "  What brings you peace?  ");
    expect(mockSupa.tables).toEqual(["circle_shepherds", "circle_questions", "circle_questions"]);
  });

  it("starts at order 0 when no questions exist", async () => {
    asShepherd();
    mockSupa.enqueue(null, { message: "no rows" }).enqueue(null);
    await expect(createQuestion(circleId, "First question?")).resolves.toBeUndefined();
  });

  it("throws when the insert fails", async () => {
    asShepherd();
    mockSupa.enqueue(null).enqueue(null, { message: "insert failed" });
    await expect(createQuestion(circleId, "Q?")).rejects.toThrow("insert failed");
  });
});

describe("updateQuestion", () => {
  it("rejects invalid IDs", async () => {
    await expect(updateQuestion("bad", "content", true)).rejects.toThrow("Invalid question ID");
  });

  it("throws when the question does not exist", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue(null, { message: "missing" });
    await expect(updateQuestion(itemId, "content", true)).rejects.toThrow("Question not found");
  });

  it("throws when the user is not the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }); // question lookup
    mockSupa.enqueue(null); // shepherd check
    await expect(updateQuestion(itemId, "content", true)).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });

  it("updates content and active state", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(updateQuestion(itemId, "Updated?", false)).resolves.toBeUndefined();
  });

  it("validates content before touching the database", async () => {
    await expect(updateQuestion(itemId, "", true)).rejects.toThrow("Content is required");
  });
});

describe("deleteQuestion", () => {
  it("rejects invalid IDs", async () => {
    await expect(deleteQuestion("bad")).rejects.toThrow("Invalid question ID");
  });

  it("throws when the question does not exist", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue(null, { message: "missing" });
    await expect(deleteQuestion(itemId)).rejects.toThrow("Question not found");
  });

  it("deletes for the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(deleteQuestion(itemId)).resolves.toBeUndefined();
  });
});

describe("reorderQuestions", () => {
  it("rejects invalid circle IDs", async () => {
    await expect(reorderQuestions("bad", [itemId])).rejects.toThrow("Invalid circle ID");
  });

  it("throws when the order array is empty", async () => {
    asShepherd();
    await expect(reorderQuestions(circleId, [])).rejects.toThrow("Invalid order");
  });

  it("throws when the order is not an array", async () => {
    asShepherd();
    await expect(reorderQuestions(circleId, "not-array" as never)).rejects.toThrow("Invalid order");
  });

  it("throws on invalid IDs inside the order", async () => {
    asShepherd();
    await expect(reorderQuestions(circleId, [itemId, "bad"])).rejects.toThrow(
      "Invalid question ID in order"
    );
  });

  it("updates every question in the given order", async () => {
    asShepherd();
    const id1 = "88888888-8888-8888-8888-888888888881";
    const id2 = "88888888-8888-8888-8888-888888888882";
    await reorderQuestions(circleId, [id1, id2]);
    // shepherd check + 2 updates
    expect(mockSupa.tables).toEqual(["circle_shepherds", "circle_questions", "circle_questions"]);
  });
});

// ============ ROUTINES ============

describe("createRoutine", () => {
  it("rejects empty titles", async () => {
    asShepherd();
    await expect(createRoutine(circleId, "  ", "desc", 30)).rejects.toThrow("Title is required");
  });

  it("rejects titles over 200 characters", async () => {
    asShepherd();
    await expect(createRoutine(circleId, "x".repeat(201), "", 30)).rejects.toThrow(
      "Title must be at most 200 characters"
    );
  });

  it("rejects descriptions over 2000 characters", async () => {
    asShepherd();
    await expect(createRoutine(circleId, "Title", "x".repeat(2001), 30)).rejects.toThrow(
      "Description must be at most 2000 characters"
    );
  });

  it("allows null description", async () => {
    asShepherd();
    mockSupa.enqueue(null).enqueue(null);
    await expect(createRoutine(circleId, "Opening prayer", "", 10)).resolves.toBeUndefined();
  });

  it.each([0, -5, 1441, NaN, Infinity])(
    "stores null duration for out-of-range value %s",
    async (duration) => {
      asShepherd();
      mockSupa.enqueue(null).enqueue(null);
      await expect(
        createRoutine(circleId, "Song", "desc", duration as number)
      ).resolves.toBeUndefined();
    }
  );

  it("accepts durations within 1..1440", async () => {
    asShepherd();
    mockSupa.enqueue(null).enqueue(null);
    await expect(createRoutine(circleId, "Song", "desc", 1440)).resolves.toBeUndefined();
  });

  it("throws for non-shepherds", async () => {
    asNonShepherd();
    await expect(createRoutine(circleId, "T", "d", 10)).rejects.toThrow(
      "You are not the shepherd of this circle"
    );
  });
});

describe("updateRoutine", () => {
  it("rejects invalid IDs", async () => {
    await expect(updateRoutine("bad", "T", "", 10)).rejects.toThrow("Invalid routine ID");
  });

  it("throws when the routine does not exist", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue(null, { message: "missing" });
    await expect(updateRoutine(itemId, "T", "", 10)).rejects.toThrow("Routine not found");
  });

  it("updates for the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(updateRoutine(itemId, "New title", null, null)).resolves.toBeUndefined();
  });
});

describe("deleteRoutine", () => {
  it("rejects invalid IDs", async () => {
    await expect(deleteRoutine("bad")).rejects.toThrow("Invalid routine ID");
  });

  it("deletes for the circle shepherd", async () => {
    mockSupa.asUser(shepherd);
    mockSupa.enqueue({ circle_id: circleId }).enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(deleteRoutine(itemId)).resolves.toBeUndefined();
  });
});

describe("reorderRoutines", () => {
  it("throws when the order array is empty", async () => {
    asShepherd();
    await expect(reorderRoutines(circleId, [])).rejects.toThrow("Invalid order");
  });

  it("throws on invalid IDs inside the order", async () => {
    asShepherd();
    await expect(reorderRoutines(circleId, ["bad"])).rejects.toThrow("Invalid routine ID in order");
  });
});

// ============ MEETINGS ============

describe("createMeeting", () => {
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

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

  it("defaults invalid durations to 120", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 0 as number, "", "", "")
    ).resolves.toBeUndefined();
  });

  it.each(["in_person", "digital", "hybrid"] as const)(
    "accepts meeting type %s",
    async (meetingType) => {
      asShepherd();
      mockSupa.enqueue(null);
      await expect(
        createMeeting(circleId, future, 60, "Hall", "1 St", "Notes", meetingType)
      ).resolves.toBeUndefined();
    }
  );

  it("falls back to in_person for invalid meeting types", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "telepathy" as never)
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

  it("treats blank join URL as null", async () => {
    asShepherd();
    mockSupa.enqueue(null);
    await expect(createMeeting(circleId, future, 60, "", "", "", "in_person", "   ")).resolves.toBeUndefined();
  });

  it("throws when the insert fails", async () => {
    asShepherd();
    mockSupa.enqueue(null, { message: "insert failed" });
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
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
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
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    asShepherd();
    mockSupa.enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(
      createMeeting(circleId, future, 60, "", "", "", "digital", "https://meet.google.com/abc")
    ).resolves.toBeUndefined();
    // No standing-room lookup happened.
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(0);
  });

  it("does not fall back for in-person meetings", async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    asShepherd();
    mockSupa.enqueue({ id: "shep-1", role: "lead" }).enqueue(null);
    await expect(createMeeting(circleId, future, 60, "Hall", "1 St", "")).resolves.toBeUndefined();
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(0);
  });

  it("throws when the update fails", async () => {
    asShepherd();
    mockSupa.enqueue(null, { message: "update failed" });
    await expect(updateCircle(circleId, base)).rejects.toThrow("update failed");
  });
});
