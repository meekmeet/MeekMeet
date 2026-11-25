import { describe, it, expect, vi, afterEach } from "vitest";
import { geocodeAddress } from "./geocode";

afterEach(() => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  vi.unstubAllGlobals();
});

const okResponse = {
  status: "OK",
  results: [
    {
      formatted_address: "10 Example St, Sydney NSW 2000, Australia",
      geometry: { location: { lat: -33.8688, lng: 151.2093 } },
      address_components: [
        { long_name: "Sydney", short_name: "Sydney", types: ["locality", "political"] },
        { long_name: "New South Wales", short_name: "NSW", types: ["administrative_area_level_1"] },
        { long_name: "Sydney Council", short_name: "Sydney", types: ["administrative_area_level_2"] },
        { long_name: "Australia", short_name: "AU", types: ["country"] },
        { long_name: "2000", short_name: "2000", types: ["postal_code"] },
      ],
    },
  ],
};

describe("geocodeAddress", () => {
  it("returns null when GOOGLE_MAPS_API_KEY is not set", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await geocodeAddress("Sydney")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns a mapped result on OK status", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => okResponse }));
    const result = await geocodeAddress("Sydney");
    expect(result).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
      formattedAddress: "10 Example St, Sydney NSW 2000, Australia",
      locality: "Sydney",
      adminAreaLevel1: "New South Wales",
      adminAreaLevel2: "Sydney Council",
      country: "Australia",
      postalCode: "2000",
    });
  });

  it("requests the AU region and includes the API key", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => okResponse });
    vi.stubGlobal("fetch", fetchMock);
    await geocodeAddress("some address");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("address")).toBe("some address");
    expect(url.searchParams.get("key")).toBe("gmaps-key");
    expect(url.searchParams.get("region")).toBe("au");
  });

  it.each([
    ["ZERO_RESULTS", { status: "ZERO_RESULTS", results: [] }],
    ["OVER_QUERY_LIMIT", { status: "OVER_QUERY_LIMIT", error_message: "quota" }],
    ["REQUEST_DENIED", { status: "REQUEST_DENIED", error_message: "bad key" }],
    ["INVALID_REQUEST", { status: "INVALID_REQUEST" }],
  ])("returns null on %s", async (_name, payload) => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => payload }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await geocodeAddress("Sydney")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns null when results array is empty on OK", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ status: "OK", results: [] }) })
    );
    expect(await geocodeAddress("Sydney")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await geocodeAddress("Sydney")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("handles missing optional address components as undefined", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "gmaps-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          status: "OK",
          results: [
            {
              formatted_address: "Somewhere",
              geometry: { location: { lat: 1, lng: 2 } },
              address_components: [],
            },
          ],
        }),
      })
    );
    const result = await geocodeAddress("Somewhere");
    expect(result).toMatchObject({
      latitude: 1,
      longitude: 2,
      locality: undefined,
      adminAreaLevel1: undefined,
      country: undefined,
      postalCode: undefined,
    });
  });
});
