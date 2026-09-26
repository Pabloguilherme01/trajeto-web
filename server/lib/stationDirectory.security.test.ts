import { describe, expect, it } from "vitest";
import { publicStationDetails } from "./stationDirectory";
import type { PlaceDetailsResult } from "../_core/map";

const base: PlaceDetailsResult = {
  result: {
    place_id: "ChIJtest",
    name: "Posto Teste",
    formatted_address: "Rua Teste, 1",
    geometry: { location: { lat: -15.8, lng: -47.9 } },
    website: "https://example.com",
  },
  status: "OK",
};

describe("station directory external URLs", () => {
  it("keeps http and https URLs", () => {
    expect(publicStationDetails("ChIJtest", base).website).toBe("https://example.com");
  });

  it("drops non-http schemes instead of exposing them to the client", () => {
    const result = publicStationDetails("ChIJtest", {
      ...base,
      result: { ...base.result, website: "javascript:alert(1)" },
    });
    expect(result.website).toBeNull();
  });

  it("drops malformed URLs", () => {
    const result = publicStationDetails("ChIJtest", {
      ...base,
      result: { ...base.result, website: "not a url" },
    });
    expect(result.website).toBeNull();
  });
});
