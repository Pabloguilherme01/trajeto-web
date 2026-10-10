import { describe, expect, it } from "vitest";
import { stationMapKey } from "./stationMapKey";

describe("map marker identity shared between online and offline", () => {
  it("keeps distinct official station records even when addresses and coordinates coincide", () => {
    const base = { name: "Posto A", address: "Rua Brasília", lat: -15.7545, lng: -48.2816 };
    expect(stationMapKey({ ...base, cnpj: "00000000000001" }))
      .not.toBe(stationMapKey({ ...base, cnpj: "00000000000002" }));
  });

  it("uses the same id, cnpj, placeId priority on both map modes", () => {
    const station = { name: "Posto", address: "Rua", lat: -15.7545, lng: -48.2816 };
    expect(stationMapKey({ ...station, id: "atlas-id", cnpj: "cnpj", placeId: "place" })).toBe("atlas-id");
    expect(stationMapKey({ ...station, cnpj: "cnpj", placeId: "place" })).toBe("cnpj");
    expect(stationMapKey({ ...station, placeId: "place" })).toBe("place");
    expect(stationMapKey(station)).toBe("Posto|-15.7545|-48.2816");
  });
});
