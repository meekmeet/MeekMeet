import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./geocode", () => ({ geocodeAddress: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "./geocode";
import { updateCircleRegion } from "./update-circle-region";

const mockSupa = new MockSupabaseClient();
const circleId = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
  vi.mocked(geocodeAddress).mockResolvedValue({
    latitude: -33.86,
    longitude: 151.2,
    formattedAddress: "Sydney",
    adminAreaLevel1: "NSW",
    adminAreaLevel2: "Sydney Council",
    country: "Australia",
  });
});

describe("updateCircleRegion", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(updateCircleRegion(circleId)).rejects.toThrow("Not authenticated");
  });

  it("throws when the user is neither admin nor shepherd", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    // profiles role lookup → member; shepherd lookup → none
    mockSupa.enqueue({ role: "member" }).enqueue(null);
    await expect(updateCircleRegion(circleId)).rejects.toThrow("Not authorized");
  });

  it("allows admins without a shepherd record", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    // role → admin; circle fetch; update
    mockSupa.enqueue({ role: "admin" }).enqueue({ location: "Sydney", meeting_address: "1 St" }).enqueue(null);
    const geo = await updateCircleRegion(circleId);
    expect(geo.latitude).toBe(-33.86);
    expect(mockSupa.tables).toEqual(["profiles", "circles", "circles"]);
  });

  it("allows shepherds without admin role", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    // role → member; shepherd record exists; circle fetch; update
    mockSupa
      .enqueue({ role: "member" })
      .enqueue({ id: "shep-1" })
      .enqueue({ location: "Sydney", meeting_address: "1 St" })
      .enqueue(null);
    await expect(updateCircleRegion(circleId)).resolves.toBeDefined();
  });

  it("throws when the circle does not exist", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa.enqueue({ role: "admin" }).enqueue(null, { message: "not found" });
    await expect(updateCircleRegion(circleId)).rejects.toThrow("Circle not found");
  });

  it("throws when there is no address to geocode", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa.enqueue({ role: "admin" }).enqueue({ location: null, meeting_address: null });
    await expect(updateCircleRegion(circleId)).rejects.toThrow("No address to geocode");
  });

  it("joins meeting_address and location for the geocode query", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ role: "admin" })
      .enqueue({ location: "Sydney", meeting_address: "1 Example St" })
      .enqueue(null);
    await updateCircleRegion(circleId);
    expect(vi.mocked(geocodeAddress)).toHaveBeenCalledWith("1 Example St, Sydney");
  });

  it("falls back to location alone when meeting_address is null", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa.enqueue({ role: "admin" }).enqueue({ location: "Sydney", meeting_address: null }).enqueue(null);
    await updateCircleRegion(circleId);
    expect(vi.mocked(geocodeAddress)).toHaveBeenCalledWith("Sydney");
  });

  it("throws when geocoding fails", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    vi.mocked(geocodeAddress).mockResolvedValue(null);
    mockSupa.enqueue({ role: "admin" }).enqueue({ location: "Sydney", meeting_address: null });
    await expect(updateCircleRegion(circleId)).rejects.toThrow(
      "Geocoding failed or not configured"
    );
  });

  it("throws when the update fails", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ role: "admin" })
      .enqueue({ location: "Sydney", meeting_address: null })
      .enqueue(null, { message: "db error" });
    await expect(updateCircleRegion(circleId)).rejects.toThrow("db error");
  });

  it("returns the geocode result on success", async () => {
    const user = makeAuthUser();
    mockSupa.asUser(user);
    mockSupa.enqueue({ role: "admin" }).enqueue({ location: "Sydney", meeting_address: null }).enqueue(null);
    const result = await updateCircleRegion(circleId);
    expect(result).toMatchObject({ latitude: -33.86, longitude: 151.2 });
  });
});
