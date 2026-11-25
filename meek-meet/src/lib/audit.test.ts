import { describe, it, expect, vi } from "vitest";
import { auditEvent } from "./audit";

function makeSupabase(error: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return { from: vi.fn(() => ({ insert })), insert };
}

describe("auditEvent", () => {
  it("writes an audit row with the actor and namespaced action", async () => {
    const supa = makeSupabase();
    await auditEvent(supa, "user-1", {
      action: "admin.invite",
      targetType: "profile",
      targetId: "x@example.com",
      detail: { outcome: "invited" },
    });
    expect(supa.from).toHaveBeenCalledWith("admin_audit_log");
    expect(supa.insert).toHaveBeenCalledWith({
      actor: "user-1",
      action: "admin.invite",
      target_type: "profile",
      target_id: "x@example.com",
      detail: { outcome: "invited" },
    });
  });

  it("defaults optional fields", async () => {
    const supa = makeSupabase();
    await auditEvent(supa, "user-1", { action: "authority.seed_samples" });
    expect(supa.insert).toHaveBeenCalledWith({
      actor: "user-1",
      action: "authority.seed_samples",
      target_type: null,
      target_id: null,
      detail: {},
    });
  });

  it("never throws when the insert fails", async () => {
    const supa = makeSupabase({ message: "db down" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      auditEvent(supa, "user-1", { action: "admin.invite" })
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("never throws when the client throws", async () => {
    const supa = {
      from: vi.fn(() => {
        throw new Error("exploded");
      }),
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      auditEvent(supa, "user-1", { action: "admin.invite" })
    ).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});
