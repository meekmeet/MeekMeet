import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ auditEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getApplications,
  getTerritoryStatuses,
  approveApplication,
  rejectApplication,
  getPendingDocuments,
  reviewDocument,
  getApplicationDocuments,
  getDocumentSignedUrl,
  toggleMessageStatus,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();
const applicationId = "55555555-5555-5555-5555-555555555555";
const otherApplicationId = "66666666-6666-6666-6666-666666666666";

/** Queue auth user + admin role check. */
function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ role: "admin" });
}

/** Queue auth user + non-admin role check. */
function asNonAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ role: "member" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.upserts.length = 0;
  mockSupa.inserts.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("getApplications", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(getApplications()).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getApplications()).rejects.toThrow("Not authorized");
  });

  it("returns all applications for admins without a status filter", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: applicationId }, { id: otherApplicationId }]);
    const result = await getApplications();
    expect(result).toHaveLength(2);
  });

  it.each(["pending", "approved", "rejected"] as const)(
    "filters by status %s",
    async (status) => {
      asAdmin();
      mockSupa.enqueue([{ id: applicationId, status }]);
      const result = await getApplications(status);
      expect(result).toHaveLength(1);
    }
  );

  it("returns an empty array when the query yields nothing", async () => {
    asAdmin();
    mockSupa.enqueue([]);
    expect(await getApplications()).toEqual([]);
  });

  it("throws when the query errors", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(getApplications()).rejects.toThrow("db error");
  });
});

describe("approveApplication", () => {
  it("rejects invalid application IDs", async () => {
    await expect(approveApplication("not-a-uuid", admin.id)).rejects.toThrow(
      "Invalid application ID"
    );
  });

  it("rejects invalid user IDs", async () => {
    await expect(approveApplication(applicationId, "bad-id")).rejects.toThrow("Invalid user ID");
  });

  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(approveApplication(applicationId, admin.id)).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(approveApplication(applicationId, admin.id)).rejects.toThrow("Not authorized");
  });

  it("calls the review RPC with the approved decision", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane Doe", email: "jane@example.com" });
    await approveApplication(applicationId, admin.id);
    expect(mockSupa.rpc).toHaveBeenCalledWith("review_shepherd_application", {
      p_application_id: applicationId,
      p_decision: "approved",
    });
  });

  it("sends an approval email with escaped name", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane <b>Doe</b>", email: "jane@example.com" });
    await approveApplication(applicationId, admin.id);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("jane@example.com");
    expect(sent.subject).toMatch(/approved/i);
    expect(sent.html).toContain("Jane &lt;b&gt;Doe&lt;/b&gt;");
    expect(sent.html).not.toContain("<b>Doe</b>");
  });

  it("succeeds even when the email send fails", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(approveApplication(applicationId, admin.id)).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });

  it("throws when the RPC fails", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: { message: "rpc boom" } });
    await expect(approveApplication(applicationId, admin.id)).rejects.toThrow("rpc boom");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not email when the application row is gone", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue(null, { message: "missing" });
    await approveApplication(applicationId, admin.id);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("revalidates the applications page", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue(null);
    await approveApplication(applicationId, admin.id);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/applications");
  });
});

describe("rejectApplication", () => {
  it("rejects invalid application IDs", async () => {
    await expect(rejectApplication("nope")).rejects.toThrow("Invalid application ID");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(rejectApplication(applicationId)).rejects.toThrow("Not authorized");
  });

  it("calls the review RPC with the rejected decision", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "John", email: "john@example.com" });
    await rejectApplication(applicationId);
    expect(mockSupa.rpc).toHaveBeenCalledWith("review_shepherd_application", {
      p_application_id: applicationId,
      p_decision: "rejected",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toMatch(/update on your leader application/i);
  });

  it("throws when the RPC fails", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: { message: "rpc boom" } });
    await expect(rejectApplication(applicationId)).rejects.toThrow("rpc boom");
  });
});

describe("getPendingDocuments", () => {
  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getPendingDocuments()).rejects.toThrow("Not authorized");
  });

  it("returns pending documents with applications for admins", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: "d1", status: "pending" }]);
    const result = await getPendingDocuments();
    expect(result).toEqual([{ id: "d1", status: "pending" }]);
    expect(mockSupa.tables).toEqual(["profiles", "shepherd_application_documents"]);
  });

  it("throws when the query errors", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "boom" });
    await expect(getPendingDocuments()).rejects.toThrow("boom");
  });
});

describe("reviewDocument", () => {
  it("rejects invalid document IDs", async () => {
    await expect(reviewDocument("bad", "verified")).rejects.toThrow("Invalid document ID");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(reviewDocument(applicationId, "verified")).rejects.toThrow("Not authorized");
  });

  it.each(["verified", "rejected"] as const)("marks a document %s", async (decision) => {
    asAdmin();
    mockSupa.enqueue(null);
    await reviewDocument(applicationId, decision);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/verification");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/applications");
  });

  it("throws when the update fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "update failed" });
    await expect(reviewDocument(applicationId, "verified")).rejects.toThrow("update failed");
  });
});

describe("getApplicationDocuments", () => {
  it("rejects invalid application IDs", async () => {
    await expect(getApplicationDocuments("bad")).rejects.toThrow("Invalid application ID");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getApplicationDocuments(applicationId)).rejects.toThrow("Not authorized");
  });

  it("returns documents for admins", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: "d1" }]);
    expect(await getApplicationDocuments(applicationId)).toEqual([{ id: "d1" }]);
  });
});

describe("getDocumentSignedUrl", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(getDocumentSignedUrl("path/doc.pdf")).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getDocumentSignedUrl("path/doc.pdf")).rejects.toThrow("Not authorized");
  });

  it("returns a signed URL for admins", async () => {
    asAdmin();
    mockSupa.mockStorage({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/doc.pdf" },
        error: null,
      }),
    });
    const url = await getDocumentSignedUrl("path/doc.pdf");
    expect(url).toBe("https://signed.example/doc.pdf");
  });

  it("throws when signing fails", async () => {
    asAdmin();
    mockSupa.mockStorage({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
    });
    await expect(getDocumentSignedUrl("path/doc.pdf")).rejects.toThrow("denied");
  });
});

describe("toggleMessageStatus", () => {
  it("rejects invalid message IDs", async () => {
    await expect(toggleMessageStatus("bad", "open")).rejects.toThrow("Invalid message ID");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(toggleMessageStatus(applicationId, "open")).rejects.toThrow("Not authorized");
  });

  it("resolves an open message", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await toggleMessageStatus(applicationId, "open");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/inbox");
  });

  it("reopens a resolved message", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await toggleMessageStatus(applicationId, "resolved");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/inbox");
  });

  it("throws when the update fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(toggleMessageStatus(applicationId, "open")).rejects.toThrow("db error");
  });
});

describe("circle territory — the suburb claim on approval", () => {
  const fullHouse = Array.from({ length: 12 }, (_, i) => ({ user_id: `u${i}` }));

  it("creates the suburb's circle and seats the leader when the suburb is open", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com", location: "Gosford NSW" });
    mockSupa.enqueue([]); // no circles claim the suburb
    mockSupa.enqueue(null); // member_areas count → 0 waiting
    mockSupa.enqueue(null); // slug clash check → free
    mockSupa.enqueue({ id: "circle-1" }); // circle insert
    mockSupa.enqueue(null); // circle_shepherds link

    await approveApplication(applicationId, admin.id);

    const circleInsert = mockSupa.inserts.find(
      (i) => i && typeof i === "object" && "area_key" in i
    ) as Record<string, unknown>;
    expect(circleInsert).toBeDefined();
    expect(circleInsert.name).toBe("New Moon Circle — Gosford NSW");
    expect(circleInsert.area_key).toBe("gosford nsw");
    expect(circleInsert.shepherd_id).toBe(admin.id);
    expect(circleInsert.kind).toBe("local");

    const link = mockSupa.inserts.find(
      (i) => i && typeof i === "object" && (i as { circle_id?: string }).circle_id === "circle-1"
    ) as Record<string, unknown>;
    expect(link).toBeDefined();
    expect(link.user_id).toBe(admin.id);
    expect(link.role).toBe("lead");

    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("New Moon Circle — Gosford NSW");
    expect(sent.html).toContain("yours to keep");
  });

  it("locks the suburb: no rival circle while the claiming circle has room", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com", location: "Gosford NSW" });
    mockSupa.enqueue([{ id: "c1", name: "New Moon Circle — Gosford NSW" }]); // claiming circle
    mockSupa.enqueue([{ id: "m1" }]); // its meetings
    mockSupa.enqueue([{ user_id: "u1" }, { user_id: "u2" }]); // 2 seated — room left
    mockSupa.enqueue(null); // member_areas count → 0 waiting

    await approveApplication(applicationId, admin.id);

    expect(
      mockSupa.inserts.find((i) => i && typeof i === "object" && "area_key" in i)
    ).toBeUndefined();
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("currently held by an existing circle");
  });

  it("releases the suburb when the claiming circle is full — successor circle II", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com", location: "Gosford NSW" });
    mockSupa.enqueue([{ id: "c1", name: "New Moon Circle — Gosford NSW" }]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(fullHouse); // 12 seated — full
    mockSupa.enqueue(null); // member_areas count
    mockSupa.enqueue(null); // slug clash check
    mockSupa.enqueue({ id: "c2" }); // successor insert
    mockSupa.enqueue(null); // link

    await approveApplication(applicationId, admin.id);

    const circleInsert = mockSupa.inserts.find(
      (i) => i && typeof i === "object" && "area_key" in i
    ) as Record<string, unknown>;
    expect(circleInsert.name).toBe("New Moon Circle — Gosford NSW II");
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("New Moon Circle — Gosford NSW II");
  });

  it("releases the suburb on waiting demand even with seats left", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com", location: "Gosford NSW" });
    mockSupa.enqueue([{ id: "c1", name: "New Moon Circle — Gosford NSW" }]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue([{ user_id: "u1" }]); // 1 seated
    mockSupa.results.push({ data: null, error: null, count: 10 } as never); // 10 waiting ≥ 8
    mockSupa.enqueue(null); // slug clash
    mockSupa.enqueue({ id: "c2" });
    mockSupa.enqueue(null); // link

    await approveApplication(applicationId, admin.id);

    const circleInsert = mockSupa.inserts.find(
      (i) => i && typeof i === "object" && "area_key" in i
    ) as Record<string, unknown>;
    expect(circleInsert).toBeDefined();
    expect(circleInsert.name).toBe("New Moon Circle — Gosford NSW II");
  });

  it("still approves and emails when the application has no location", async () => {
    asAdmin();
    mockSupa.rpc.mockResolvedValueOnce({ error: null });
    mockSupa.enqueue({ full_name: "Jane", email: "jane@example.com", location: null });

    await approveApplication(applicationId, admin.id);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(
      mockSupa.inserts.find((i) => i && typeof i === "object" && "area_key" in i)
    ).toBeUndefined();
  });
});

describe("getTerritoryStatuses", () => {
  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getTerritoryStatuses(["Gosford NSW"])).rejects.toThrow("Not authorized");
  });

  it("dedupes suburbs and reports each one's status", async () => {
    asAdmin();
    // Gosford: no circles → open (queried once despite two spellings)
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    // Newcastle: full circle → expandable
    mockSupa.enqueue([{ id: "c9", name: "New Moon Circle — Newcastle NSW" }]);
    mockSupa.enqueue([{ id: "m9" }]);
    mockSupa.enqueue(Array.from({ length: 12 }, (_, i) => ({ user_id: `n${i}` })));
    mockSupa.enqueue(null);

    const res = await getTerritoryStatuses([
      "Gosford NSW",
      "gosford  nsw",
      "Newcastle NSW",
    ]);

    expect(Object.keys(res)).toHaveLength(2);
    expect(res["gosford nsw"].status).toBe("open");
    expect(res["newcastle nsw"].status).toBe("expandable");
    expect(res["newcastle nsw"].circles).toEqual(["New Moon Circle — Newcastle NSW"]);
  });
});
