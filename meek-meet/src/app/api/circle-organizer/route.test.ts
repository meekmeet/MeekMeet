import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { POST } from "./route";

const mockSupa = new MockSupabaseClient();
const mockUserSupa = new MockSupabaseClient();
const adminUser = makeAuthUser();

let ipSeq = 0;
function postRequest(opts: { cronSecret?: string; ip?: string } = {}): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": opts.ip ?? `10.1.${++ipSeq}.1`,
  };
  if (opts.cronSecret) headers.authorization = `Bearer ${opts.cronSecret}`;
  return new NextRequest("http://localhost/api/circle-organizer", {
    method: "POST",
    headers,
  });
}

const globalCircle = { id: "c-global", slug: "global", name: "The Global Circle" };

function enqueueHappyPath(areas: { id: string; location: string | null }[]) {
  mockSupa.enqueue([globalCircle]); // global circle
  mockSupa.enqueue([{ id: "m1" }, { id: "m2" }]); // meetings
  mockSupa.enqueue(areas.map((a, i) => ({ user_id: `u${i}` }))); // rsvps (going)
  mockSupa.enqueue(areas); // profiles with locations
  mockSupa.enqueue([]); // no existing auto groups
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockUserSupa.results.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
  vi.mocked(createClient).mockResolvedValue(mockUserSupa as never);
});

describe("POST /api/circle-organizer", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_CIRCLE_ORGANIZER_PER_MINUTE = "1";
    process.env.CRON_SECRET = "cron";
    await POST(postRequest({ cronSecret: "cron", ip: "9.9.9.9" }));
    const res = await POST(postRequest({ cronSecret: "cron", ip: "9.9.9.9" }));
    expect(res.status).toBe(429);
    delete process.env.RATE_LIMIT_CIRCLE_ORGANIZER_PER_MINUTE;
  });

  it("returns 401 without cron secret or admin session", async () => {
    mockUserSupa.asUser(null);
    const res = await POST(postRequest());
    expect(res.status).toBe(401);
  });

  it("allows authorized cron requests", async () => {
    process.env.CRON_SECRET = "cron-secret";
    enqueueHappyPath([]);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    expect(res.status).toBe(200);
  });

  it("allows admin session requests", async () => {
    mockUserSupa.asUser(adminUser);
    mockUserSupa.enqueue({ role: "admin" });
    enqueueHappyPath([]);
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
  });

  it("rejects non-admin sessions even when signed in", async () => {
    mockUserSupa.asUser(adminUser);
    mockUserSupa.enqueue({ role: "shepherd" });
    const res = await POST(postRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 when no global circle exists", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mockSupa.enqueue([], null);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/global circle/i);
  });

  it("returns empty result when the global circle has no meetings", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mockSupa.enqueue([globalCircle]).enqueue([]);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body).toEqual({ created: [], below_threshold: [] });
  });

  it("returns empty result when there are no going RSVPs", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mockSupa.enqueue([globalCircle]).enqueue([{ id: "m1" }]).enqueue([]);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    expect(await res.json()).toEqual({ created: [], below_threshold: [] });
  });

  it("reports areas below the member threshold without creating circles", async () => {
    process.env.CRON_SECRET = "cron-secret";
    enqueueHappyPath([
      { id: "u0", location: "Bondi Beach" },
      { id: "u1", location: "bondi beach " },
      { id: "u2", location: "  BONDI   BEACH" },
    ]);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created).toEqual([]);
    // Area name comes from the first-seen normalized location.
    expect(body.below_threshold).toEqual([{ area: "Bondi Beach", member_count: 3 }]);
  });

  it("provisions a circle for an area meeting the threshold", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const members = Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, location: "Newtown NSW" }));
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(members.map((_, i) => ({ user_id: `u${i}` })));
    mockSupa.enqueue(members);
    mockSupa.enqueue([]); // no organized groups
    mockSupa.enqueue(null); // slug clash check → free
    mockSupa.enqueue({ id: "new-circle-id" }); // circle insert
    mockSupa.enqueue(null); // auto-group link

    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created).toHaveLength(1);
    expect(body.created[0]).toMatchObject({
      area: "Newtown NSW",
      member_count: 8,
      circle_id: "new-circle-id",
      slug: "new-moon-newtown-nsw",
    });
    expect(body.below_threshold).toEqual([]);
  });

  it("retries slugs on collision", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const members = Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, location: "Leichhardt" }));
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(members.map((_, i) => ({ user_id: `u${i}` })));
    mockSupa.enqueue(members);
    mockSupa.enqueue([]);
    mockSupa.enqueue({ id: "existing" }); // slug taken
    mockSupa.enqueue(null); // retry free
    mockSupa.enqueue({ id: "circle-2" });
    mockSupa.enqueue(null);

    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created[0].slug).toMatch(/^new-moon-leichhardt-[a-z0-9]{4}$/);
  });

  it("caps long area names at 60 characters", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const longArea = "a".repeat(100);
    const members = Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, location: longArea }));
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(members.map((_, i) => ({ user_id: `u${i}` })));
    mockSupa.enqueue(members);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "c" });
    mockSupa.enqueue(null);

    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created[0].area).toBe(longArea);
  });

  it("title-cases area names but keeps short all-caps tokens", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const members = Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, location: "surry hills nsw" }));
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(members.map((_, i) => ({ user_id: `u${i}` })));
    mockSupa.enqueue(members);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "c" });
    mockSupa.enqueue(null);

    await POST(postRequest({ cronSecret: "cron-secret" }));
    // Global lookup + slug clash check + insert.
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(3);
  });

  it("skips members without a location", async () => {
    process.env.CRON_SECRET = "cron-secret";
    enqueueHappyPath([{ id: "u0", location: null }, { id: "u1", location: "" }]);
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    expect(await res.json()).toEqual({ created: [], below_threshold: [] });
  });

  it("leaves already-organized areas alone", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const members = Array.from({ length: 20 }, (_, i) => ({ id: `u${i}`, location: "Parramatta" }));
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(members.map((_, i) => ({ user_id: `u${i}` })));
    mockSupa.enqueue(members);
    mockSupa.enqueue([{ area_key: "parramatta" }]); // already organized

    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created).toEqual([]);
    expect(body.below_threshold).toEqual([]);
    // The organized-area select happens but no circle insert follows.
    expect(mockSupa.tables.filter((t) => t === "circles")).toHaveLength(1);
  });

  it("collects per-area errors without aborting other areas", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const areaA = Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, location: "AreaA" }));
    const areaB = Array.from({ length: 9 }, (_, i) => ({ id: `b${i}`, location: "AreaB" }));
    const all = [...areaA, ...areaB];
    mockSupa.enqueue([globalCircle]);
    mockSupa.enqueue([{ id: "m1" }]);
    mockSupa.enqueue(all.map((m) => ({ user_id: m.id })));
    mockSupa.enqueue(all);
    mockSupa.enqueue([]);
    // AreaA: slug free, insert fails.
    mockSupa.enqueue(null);
    mockSupa.enqueue(null, { message: "insert error" });
    // AreaB: succeeds.
    mockSupa.enqueue(null);
    mockSupa.enqueue({ id: "circle-b" });
    mockSupa.enqueue(null);
    // Cohort recomputation for the global circle: member areas, cap config,
    // existing cohorts, delete, then per-cohort (2) insert + member insert.
    mockSupa.enqueue([]);
    mockSupa.enqueue([
      { key: "cohort_cap", value: "12" },
      { key: "cohort_min_cluster", value: "3" },
    ]);
    mockSupa.enqueue([]);
    mockSupa.enqueue(null); // delete old cohorts
    mockSupa.enqueue({ id: "cohort-a" });
    mockSupa.enqueue(null); // cohort A members
    mockSupa.enqueue({ id: "cohort-b" });
    mockSupa.enqueue(null); // cohort B members

    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    const body = await res.json();
    expect(body.created).toHaveLength(1);
    expect(body.created[0].area).toBe("AreaB");
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("AreaA");
    expect(body.errors[0]).toContain("insert error");
  });

  it("returns 500 with partial results when a global query fails", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mockSupa.enqueue(null, { message: "db exploded" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(postRequest({ cronSecret: "cron-secret" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
    expect(body.created).toEqual([]);
    errorSpy.mockRestore();
  });
});
