import { describe, expect, it, vi } from "vitest";
import { findNearbyStations } from "./stationNearby";

describe("findNearbyStations", () => {
  it("requests only fields used by the nearby directory and normalizes results", async () => {
    const searchNearby = vi.fn().mockResolvedValue({
      places: [
        {
          id: "p1",
          displayName: { text: "Posto Teste" },
          formattedAddress: "Rua A",
          location: { lat: -15.8, lng: -48.2 },
          googleMapsURI: "https://maps.google.com/?cid=1",
          businessStatus: "OPERATIONAL",
        },
        { id: "p2" },
      ],
    });

    const result = await findNearbyStations({ searchNearby }, { lat: -15.8, lng: -48.2 });

    expect(searchNearby).toHaveBeenCalledWith(expect.objectContaining({
      fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "businessStatus"],
      includedPrimaryTypes: ["gas_station"],
      rankPreference: "DISTANCE",
      maxResultCount: 20,
    }));
    expect(result).toEqual([{
      id: "p1",
      name: "Posto Teste",
      address: "Rua A",
      lat: -15.8,
      lng: -48.2,
      mapsUrl: "https://maps.google.com/?cid=1",
      businessStatus: "OPERATIONAL",
    }]);
  });
});
