import { describe, expect, it } from "vitest";
import { buildStationDirectoryModel } from "./stationDirectoryModel";

describe("buildStationDirectoryModel", () => {
  it("normalizes identity, coordinates and completeness", () => {
    const model = buildStationDirectoryModel({
      key: "123",
      name: "Posto Teste",
      cnpj: "123",
      address: "Rua A",
      lat: -15.8,
      lng: -48.2,
      source: "ANP",
      official: true,
      price: 6.19,
      priceDate: "2026-09-30",
    });

    expect(model.hasOfficialRecord).toBe(true);
    expect(model.hasCoordinates).toBe(true);
    expect(model.hasPrice).toBe(true);
    expect(model.dataCompleteness).toBe(100);
  });

  it("does not manufacture completeness from missing data", () => {
    const model = buildStationDirectoryModel({
      key: "456",
      name: "Sem dados",
      source: "local",
    });

    expect(model.hasOfficialRecord).toBe(false);
    expect(model.hasCoordinates).toBe(false);
    expect(model.hasPrice).toBe(false);
    expect(model.dataCompleteness).toBe(0);
  });
});
