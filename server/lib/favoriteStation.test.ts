import { describe, expect, it } from "vitest";
import { favoriteStationValues } from "./favoriteStation";

describe("favoriteStationValues", () => {
  it("normalizes the public station details stored in a user's favorites", () => {
    expect(favoriteStationValues({ placeId: " place-1 ", stationName: " Posto Central ", stationAddress: " Rua A, 10 ", lat: -15.79, lng: -47.88 })).toEqual({ placeId: "place-1", stationName: "Posto Central", stationAddress: "Rua A, 10", lat: "-15.79", lng: "-47.88" });
  });

  it("rejects a favorite when its geographic coordinates are invalid", () => {
    expect(() => favoriteStationValues({ placeId: "place-1", stationName: "Posto", stationAddress: "Rua A", lat: Number.NaN, lng: -47.88 })).toThrow("localização");
  });
});
