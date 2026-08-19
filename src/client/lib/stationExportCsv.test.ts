import { describe, expect, it } from "vitest";
import { buildStationExportCsv, stationExportCsvFilename } from "./stationExportCsv";

describe("stationExportCsv", () => {
  const station = { placeId: "place-1", name: "Posto \"Centro\"", address: "Av. Central; 10", isOpen: true, distanceMeters: 1200, distanceLabel: "1.2 km", phone: null, website: "https://example.com", lat: -15.8, lng: -48.2 };

  it("exporta apenas paradas carregadas com origem, critérios e campos seguros para Excel", () => {
    const csv = buildStationExportCsv([station], { query: "Águas Lindas, GO", sortBy: "distance", brandFilter: "all", hoursFilter: "all" }, new Date("2026-08-18T12:00:00Z"));

    expect(csv).toContain("\uFEFF");
    expect(csv).toContain('"Google Maps Places e Distance Matrix; somente paradas carregadas nesta consulta"');
    expect(csv).toContain('"Posto ""Centro"""');
    expect(csv).toContain('"Av. Central; 10"');
  });

  it("gera nome de arquivo legível e sem acentos", () => {
    expect(stationExportCsvFilename("Águas Lindas de Goiás", new Date("2026-08-18T12:00:00Z"))).toBe("trajeto-paradas-aguas-lindas-de-goias-2026-08-18.csv");
  });
});
