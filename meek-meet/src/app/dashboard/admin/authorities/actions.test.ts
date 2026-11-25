import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ auditEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getAuthorities, createAuthority, deleteAuthority, seedSampleAuthorities } from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();
const authorityId = "44444444-4444-4444-4444-444444444444";

function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ role: "admin" });
}

function asNonAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ role: "member" });
}

const form = {
  authority_type: "council",
  region_type: "lga",
  region_code: "sydney",
  region_name: "City of Sydney",
  name: "Lord Mayor of Sydney",
  contact_email: "council@cityofsydney.nsw.gov.au",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("getAuthorities", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(getAuthorities()).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(getAuthorities()).rejects.toThrow("Not authorized");
  });

  it("returns authorities ordered by name for admins", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: authorityId }]);
    expect(await getAuthorities()).toEqual([{ id: authorityId }]);
  });

  it("returns empty array when none exist", async () => {
    asAdmin();
    mockSupa.enqueue([]);
    expect(await getAuthorities()).toEqual([]);
  });

  it("throws when the query errors", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(getAuthorities()).rejects.toThrow("db error");
  });
});

describe("createAuthority", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(createAuthority(form)).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(createAuthority(form)).rejects.toThrow("Not authorized");
  });

  it("inserts the authority for admins", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await expect(createAuthority(form)).resolves.toBeUndefined();
    expect(mockSupa.tables).toEqual(["profiles", "authorities"]);
  });

  it("throws when the insert fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "unique violation" });
    await expect(createAuthority(form)).rejects.toThrow("unique violation");
  });
});

describe("deleteAuthority", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(deleteAuthority(authorityId)).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(deleteAuthority(authorityId)).rejects.toThrow("Not authorized");
  });

  it("deletes for admins", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await expect(deleteAuthority(authorityId)).resolves.toBeUndefined();
  });

  it("throws when the delete fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "fk constraint" });
    await expect(deleteAuthority(authorityId)).rejects.toThrow("fk constraint");
  });
});

describe("seedSampleAuthorities", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(seedSampleAuthorities()).rejects.toThrow("Not authenticated");
  });

  it("throws for non-admin users", async () => {
    asNonAdmin();
    await expect(seedSampleAuthorities()).rejects.toThrow("Not authorized");
  });

  it("upserts the three sample councils", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await expect(seedSampleAuthorities()).resolves.toBeUndefined();
    expect(mockSupa.rpc).not.toHaveBeenCalled();
  });

  it("throws when the upsert fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(seedSampleAuthorities()).rejects.toThrow("db error");
  });
});
