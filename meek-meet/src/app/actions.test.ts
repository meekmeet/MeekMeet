import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createClient } from "@/lib/supabase/server";
import { submitApplication, createOrUpdateRsvp, deleteRsvp } from "./actions";

const mockSupa = new MockSupabaseClient();
const user = makeAuthUser();
const meetingId = "99999999-9999-9999-9999-999999999999";

const validApplication = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "0400 000 000",
  location: "Sydney",
  denomination: "Catholic",
  wwccNumber: "WCC123456",
  wwccExpiry: "2027-01-01",
  policeCheckDate: "2026-01-01",
  emergencyName: "John Doe",
  emergencyPhone: "0401 000 000",
  referenceName: "Pastor Joe",
  referenceContact: "joe@church.example",
};

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("submitApplication", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(submitApplication(validApplication)).rejects.toThrow("Not authenticated");
  });

  it("throws when a pending application already exists", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: "existing-application" });
    await expect(submitApplication(validApplication)).rejects.toThrow(
      "You already have a pending application."
    );
  });

  it("requires a name", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(submitApplication({ ...validApplication, name: " " })).rejects.toThrow(
      "Name is required"
    );
  });

  it("requires a valid email", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(submitApplication({ ...validApplication, email: "nope" })).rejects.toThrow(
      "Invalid email address"
    );
  });

  it.each([
    "phone",
    "location",
    "denomination",
    "wwccNumber",
    "emergencyName",
    "emergencyPhone",
    "referenceName",
    "referenceContact",
  ] as const)("requires %s", async (field) => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(submitApplication({ ...validApplication, [field]: "" })).rejects.toThrow(
      /is required/
    );
  });

  it("rejects invalid optional dates", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(
      submitApplication({ ...validApplication, wwccExpiry: "not-a-date" })
    ).rejects.toThrow("WWCC Expiry must be a valid date");
  });

  it("accepts empty optional dates", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null).enqueue({ id: "new-app" });
    await expect(
      submitApplication({
        ...validApplication,
        wwccExpiry: "",
        policeCheckDate: "",
      })
    ).resolves.toBe("new-app");
  });

  it("inserts the application and returns its id", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null).enqueue({ id: "app-1" });
    const id = await submitApplication(validApplication);
    expect(id).toBe("app-1");
    expect(mockSupa.tables).toEqual(["shepherd_applications", "shepherd_applications"]);
  });

  it("throws when the insert fails", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null).enqueue(null, { message: "insert failed" });
    await expect(submitApplication(validApplication)).rejects.toThrow("insert failed");
  });

  it("sends a confirmation email with escaped user input", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(null)
      .enqueue({ id: "app-1" });
    await submitApplication({
      ...validApplication,
      name: "Jane <script>Doe</script>",
      location: "Sydney <b>NSW</b>",
      denomination: "Catholic & Protestant",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("jane@example.com");
    expect(sent.html).toContain("Jane &lt;script&gt;Doe&lt;/script&gt;");
    expect(sent.html).toContain("Sydney &lt;b&gt;NSW&lt;/b&gt;");
    expect(sent.html).toContain("Catholic &amp; Protestant");
    expect(sent.html).not.toContain("<script>");
  });

  it("still succeeds when the confirmation email fails", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null).enqueue({ id: "app-1" });
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(submitApplication(validApplication)).resolves.toBe("app-1");
    errorSpy.mockRestore();
  });
});

describe("createOrUpdateRsvp", () => {
  it("rejects invalid meeting IDs", async () => {
    await expect(createOrUpdateRsvp("bad", "going")).rejects.toThrow("Invalid meeting ID");
  });

  it.each(["attending", "yes", "", "GOING"])("rejects invalid status %s", async (status) => {
    await expect(
      createOrUpdateRsvp(meetingId, status as "going")
    ).rejects.toThrow("Invalid RSVP status");
  });

  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(createOrUpdateRsvp(meetingId, "going")).rejects.toThrow("Not authenticated");
  });

  it.each(["going", "maybe", "not_going"] as const)("upserts status %s", async (status) => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(createOrUpdateRsvp(meetingId, status)).resolves.toBeUndefined();
  });

  it("throws when the upsert fails", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null, { message: "conflict" });
    await expect(createOrUpdateRsvp(meetingId, "going")).rejects.toThrow("conflict");
  });
});

describe("deleteRsvp", () => {
  it("rejects invalid meeting IDs", async () => {
    await expect(deleteRsvp("bad")).rejects.toThrow("Invalid meeting ID");
  });

  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(deleteRsvp(meetingId)).rejects.toThrow("Not authenticated");
  });

  it("deletes the user's RSVP", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null);
    await expect(deleteRsvp(meetingId)).resolves.toBeUndefined();
  });

  it("throws when the delete fails", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null, { message: "delete failed" });
    await expect(deleteRsvp(meetingId)).rejects.toThrow("delete failed");
  });
});
