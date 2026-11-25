import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getMembers } from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();

function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ id: admin.id, role: "admin" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("getMembers", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(getMembers()).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admins", async () => {
    mockSupa.asUser(admin);
    mockSupa.enqueue({ id: admin.id, role: "member" });
    await expect(getMembers()).rejects.toThrow("Not authorized");
  });

  it("returns the newest members first", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: "u1", email: "a@b.co", full_name: "A", role: "member" }]);
    const members = await getMembers();
    expect(members).toHaveLength(1);
    expect(mockSupa.tables).toEqual(["profiles", "profiles"]);
  });

  it("applies the search term when given", async () => {
    asAdmin();
    mockSupa.enqueue([]);
    await getMembers("lisa");
    expect(mockSupa.tables).toEqual(["profiles", "profiles"]);
  });

  it("propagates query errors", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(getMembers()).rejects.toThrow("db error");
  });
});
