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
import { inviteAdmin, revokeAdmin, revokeAdminInvite, getAdminRoster } from "./actions";

const mockSupa = new MockSupabaseClient();
const masterUser = makeAuthUser({ email: "meekmeets@gmail.com" });
const otherUser = makeAuthUser({ email: "other@example.com", id: "22222222-2222-2222-2222-222222222222" });
const inviteId = "33333333-3333-3333-3333-333333333333";

/** Auth user + profile lookup, role admin + master email. */
function asMaster(fullName = "Master Admin") {
  mockSupa.asUser(masterUser);
  mockSupa.enqueue({
    id: masterUser.id,
    email: masterUser.email,
    full_name: fullName,
    role: "admin",
  });
}

function asRegularAdmin() {
  mockSupa.asUser(otherUser);
  mockSupa.enqueue({
    id: otherUser.id,
    email: otherUser.email,
    full_name: "Regular Admin",
    role: "admin",
  });
}

function asNonAdmin() {
  mockSupa.asUser(otherUser);
  mockSupa.enqueue({ id: otherUser.id, email: otherUser.email, full_name: "Member", role: "member" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("inviteAdmin", () => {
  it("rejects invalid emails before any database work", async () => {
    await expect(inviteAdmin("not-an-email")).rejects.toThrow("Invalid email address");
    expect(mockSupa.auth.getUser).not.toHaveBeenCalled();
  });

  it("rejects empty email", async () => {
    await expect(inviteAdmin("   ")).rejects.toThrow("Email is required");
  });

  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(inviteAdmin("new@example.com")).rejects.toThrow("Not authenticated");
  });

  it("throws for signed-in non-admins", async () => {
    asNonAdmin();
    await expect(inviteAdmin("new@example.com")).rejects.toThrow(
      "Only the master admin can manage admins"
    );
  });

  it("throws for regular admins — inviting is master-only", async () => {
    asRegularAdmin();
    await expect(inviteAdmin("new@example.com")).rejects.toThrow(
      "Only the master admin can manage admins"
    );
    expect(mockSupa.rpc).not.toHaveBeenCalled();
  });

  it("is case-insensitive about the master email", async () => {
    mockSupa.asUser(masterUser);
    mockSupa.enqueue({
      id: masterUser.id,
      email: "MeekMeets@Gmail.com",
      full_name: "Master",
      role: "admin",
    });
    mockSupa.rpc.mockResolvedValueOnce({ data: "invited", error: null });
    await expect(inviteAdmin("new@example.com")).resolves.toBe("invited");
  });

  it("sends the invite email for a pending invite and records the send", async () => {
    asMaster("Sarah");
    mockSupa.rpc.mockResolvedValueOnce({ data: "invited", error: null });
    await expect(inviteAdmin("new@example.com")).resolves.toBe("invited");
    expect(mockSupa.rpc).toHaveBeenCalledWith("invite_admin", {
      p_email: "new@example.com",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("new@example.com");
    expect(sent.subject).toContain("Sarah");
    expect(sent.html).toContain("ACCEPT YOUR INVITATION");
    expect(sent.html).toContain("https://meekmeet.com/login");
    expect(mockSupa.rpc).toHaveBeenCalledWith("record_admin_invite_email_sent", {
      p_email: "new@example.com",
    });
  });

  it("sends the granted email when an existing user is promoted", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({ data: "promoted", error: null });
    await expect(inviteAdmin("existing@example.com")).resolves.toBe("promoted");
    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toContain("admin access");
    expect(sent.html).toContain("OPEN THE ADMIN AREA");
    expect(sent.html).toContain("/dashboard/admin");
  });

  it("propagates RPC errors (e.g. already an admin)", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "this user is already an admin" },
    });
    await expect(inviteAdmin("admin@example.com")).rejects.toThrow(
      "this user is already an admin"
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still succeeds when the email send fails", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({ data: "invited", error: null });
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(inviteAdmin("new@example.com")).resolves.toBe("invited");
    errorSpy.mockRestore();
  });
});

describe("revokeAdmin", () => {
  it("rejects invalid user IDs", async () => {
    await expect(revokeAdmin("bad")).rejects.toThrow("Invalid user ID");
  });

  it("throws for regular admins — revoking is master-only", async () => {
    asRegularAdmin();
    await expect(revokeAdmin(otherUser.id)).rejects.toThrow(
      "Only the master admin can manage admins"
    );
    expect(mockSupa.rpc).not.toHaveBeenCalled();
  });

  it("calls the revoke RPC for the master", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(revokeAdmin(otherUser.id)).resolves.toBeUndefined();
    expect(mockSupa.rpc).toHaveBeenCalledWith("revoke_admin", {
      p_user_id: otherUser.id,
    });
  });

  it("propagates RPC errors (e.g. cannot revoke the master)", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "the master admin cannot be revoked" },
    });
    await expect(revokeAdmin(masterUser.id)).rejects.toThrow(
      "the master admin cannot be revoked"
    );
  });
});

describe("revokeAdminInvite", () => {
  it("rejects invalid invite IDs", async () => {
    await expect(revokeAdminInvite("bad")).rejects.toThrow("Invalid invite ID");
  });

  it("throws for regular admins", async () => {
    asRegularAdmin();
    await expect(revokeAdminInvite(inviteId)).rejects.toThrow(
      "Only the master admin can manage admins"
    );
  });

  it("cancels a pending invite for the master", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(revokeAdminInvite(inviteId)).resolves.toBeUndefined();
    expect(mockSupa.rpc).toHaveBeenCalledWith("revoke_admin_invite", {
      p_invite_id: inviteId,
    });
  });

  it("propagates 'pending invite not found'", async () => {
    asMaster();
    mockSupa.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "pending invite not found" },
    });
    await expect(revokeAdminInvite(inviteId)).rejects.toThrow(
      "pending invite not found"
    );
  });
});

describe("getAdminRoster", () => {
  it("returns admins and invites for the master", async () => {
    asMaster();
    mockSupa
      .enqueue([
        { id: masterUser.id, email: masterUser.email, full_name: "Master", created_at: "2026-01-01" },
        { id: otherUser.id, email: "admin2@example.com", full_name: "Second", created_at: "2026-02-01" },
      ]);
    mockSupa.rpc.mockResolvedValueOnce({
      data: [
        { id: inviteId, email: "pending@example.com", status: "pending", created_at: "2026-03-01", accepted_at: null, email_sent_at: "2026-03-01T10:00:00Z" },
        { id: "44444444-4444-4444-4444-444444444444", email: "admin2@example.com", status: "accepted", created_at: "2026-02-01", accepted_at: "2026-02-02T09:00:00Z", email_sent_at: "2026-02-01T12:00:00Z" },
      ],
      error: null,
    });

    const roster = await getAdminRoster();
    expect(roster.admins).toHaveLength(2);
    expect(roster.admins[0].is_master).toBe(true);
    expect(roster.admins[1].is_master).toBe(false);
    expect(roster.admins[1].admin_since).toBe("2026-02-02T09:00:00Z");
    expect(roster.admins[0].admin_since).toBeNull();
    expect(roster.invites).toHaveLength(2);
    expect(roster.invites[0].email_sent_at).toBe("2026-03-01T10:00:00Z");
    expect(mockSupa.tables[0]).toBe("profiles");
    expect(mockSupa.rpc).toHaveBeenCalledWith("get_admin_invites");
  });

  it("throws for regular admins", async () => {
    asRegularAdmin();
    await expect(getAdminRoster()).rejects.toThrow(
      "Only the master admin can manage admins"
    );
  });

  it("propagates roster query errors", async () => {
    asMaster();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(getAdminRoster()).rejects.toThrow("db error");
  });
});
