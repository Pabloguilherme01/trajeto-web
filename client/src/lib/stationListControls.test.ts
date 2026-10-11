import { describe, expect, it } from "vitest";
import { filterAndSortStations, fuelFilterPriceKey, inferredBrand, normalizeStationCnpj, sameStationIdentity, stationCoordinatePoint, stationCoordinateWithFallback, stationSupportsFuel } from "./stationListControls";

describe("station list controls", () => {
  const stations = [
    { name: "Posto Shell", isOpen: true, distanceMeters: 2200 },
    { name: "Posto Ipiranga", isOpen: false, distanceMeters: 900 },
    { name: "Posto Local", isOpen: null, distanceMeters: null },
  ];

  it("derives only brands explicitly present in the mapped place name", () => {
    expect(inferredBrand("Posto Shell")).toBe("Shell");
    expect(inferredBrand("Posto Vale")).toBe("Outras / não declarada");
  });

  it("filters status and orders mapped stations without inventing unavailable distances", () => {
    expect(filterAndSortStations(stations, "all", "open", "distance").map(station => station.name)).toEqual(["Posto Shell"]);
    expect(filterAndSortStations(stations, "all", "all", "distance").map(station => station.name)).toEqual(["Posto Ipiranga", "Posto Shell", "Posto Local"]);
    expect(filterAndSortStations(stations, "all", "all", "relevance").map(station => station.name)).toEqual(["Posto Shell", "Posto Ipiranga", "Posto Local"]);
  });

  it("reconhece combustíveis sem confundir gasolina comum com aditivada", () => {
    expect(stationSupportsFuel(["etanol"], [], "etanol")).toBe(true);
    expect(stationSupportsFuel([], ["ÓLEO DIESEL S10"], "diesel-s10")).toBe(true);
    expect(stationSupportsFuel([], ["GASOLINA ADITIVADA"], "gasolina-comum")).toBe(false);
    expect(fuelFilterPriceKey("all")).toBe("gasolina-comum");
    expect(fuelFilterPriceKey("gnv")).toBe("gnv");
  });

  it("normaliza CNPJ para cruzar catálogo local, ANP e preços", () => {
    expect(normalizeStationCnpj("13.902.675/0001-78")).toBe("13902675000178");
    expect(normalizeStationCnpj("13902675000178")).toBe("13902675000178");
    expect(normalizeStationCnpj("")).toBe("");
    expect(sameStationIdentity({ cnpj: "13.902.675/0001-78" }, { cnpj: "13902675000178" })).toBe(true);
  });

  it("não transforma coordenada ausente ou 0,0 em distância utilizável", () => {
    expect(stationCoordinatePoint(null, null)).toBeNull();
    expect(stationCoordinatePoint(undefined, undefined)).toBeNull();
    expect(stationCoordinatePoint(0, 0)).toBeNull();
    expect(stationCoordinatePoint(-15.6811689, -48.2680336)).toEqual({ lat: -15.6811689, lng: -48.2680336 });
  });

  it("accepts complete valid official or local coordinate pairs without mixing sources", () => {
    const local = { latitude: -15.79, longitude: -48.28 };
    const official = { latitude: -15.78, longitude: -48.29 };
    expect(stationCoordinateWithFallback(official, local)).toEqual({ lat: -15.78, lng: -48.29 });
    expect(stationCoordinateWithFallback({ latitude: 0, longitude: 0 }, local)).toEqual({ lat: -15.79, lng: -48.28 });
    expect(stationCoordinateWithFallback({ latitude: -15.78, longitude: null }, local)).toEqual({ lat: -15.79, lng: -48.28 });
    expect(stationCoordinateWithFallback({ latitude: 95, longitude: -48.29 }, local)).toEqual({ lat: -15.79, lng: -48.28 });
    expect(stationCoordinateWithFallback(null, local)).toEqual({ lat: -15.79, lng: -48.28 });
    expect(stationCoordinateWithFallback({ latitude: 0, longitude: 0 }, null)).toBeNull();
    expect(stationCoordinateWithFallback(null, null)).toBeNull();
    expect(stationCoordinateWithFallback({ latitude: 95, longitude: 0 }, { latitude: -15.8, longitude: null })).toBeNull();
  });

  it("identifica a mesma unidade por CNPJ, endereço ou coordenadas sem fundir vizinhos", () => {
    expect(sameStationIdentity({ cnpj: "12.345.678/0001-90" }, { cnpj: "12345678000190" })).toBe(true);
    expect(sameStationIdentity({ address: "BR-070, Quadra 10, Jardim Brasília" }, { address: "BR 070 Quadra 10 Jardim Brasilia" })).toBe(true);
    expect(sameStationIdentity({ lat: -15.8, lng: -48.25 }, { lat: -15.8001, lng: -48.2501 })).toBe(true);
    expect(sameStationIdentity(
      { cnpj: "12.345.678/0001-90", lat: -15.8, lng: -48.25 },
      { cnpj: "98.765.432/0001-10", lat: -15.80001, lng: -48.25001 },
    )).toBe(false);
    expect(sameStationIdentity({ address: "Rua A, Jardim Brasília" }, { address: "Rua B, Jardim Brasília" })).toBe(false);
  });
});


describe("station filtering parity with the previous implementation", () => {
  it("keeps stable ordering and exact results for all brands, hours and sort modes", () => {
    const rows = Array.from({ length: 800 }, (_, index) => ({
      name: ["Posto Shell", "Auto Posto Ipiranga", "Petrobras", "Posto ALE", "Posto Local"][index % 5] +
        (index % 7 === 0 ? " São José" : "") + " " + index,
      isOpen: [true, false, null][index % 3] as boolean | null,
      distanceMeters: index % 13 === 0 ? null : (index * 37) % 163,
      id: index,
    }));
    const original = (brandFilter: string, hoursFilter: "all" | "open" | "closed" | "unknown",
      sortBy: "distance" | "relevance" | "brand" | "hours") => rows
      .filter(station => (brandFilter === "all" || inferredBrand(station.name) === brandFilter) &&
        (hoursFilter === "all" || (hoursFilter === "open" && station.isOpen === true) ||
          (hoursFilter === "closed" && station.isOpen === false) ||
          (hoursFilter === "unknown" && station.isOpen === null)))
      .map((station, index) => ({ station, index }))
      .sort((a, b) => {
        if (sortBy === "relevance") return a.index - b.index;
        if (sortBy === "brand") return inferredBrand(a.station.name).localeCompare(inferredBrand(b.station.name), "pt-BR") ||
          a.station.name.localeCompare(b.station.name, "pt-BR");
        if (sortBy === "hours") return Number(b.station.isOpen === true) - Number(a.station.isOpen === true) ||
          Number(a.station.isOpen === false) - Number(b.station.isOpen === false) ||
          a.station.name.localeCompare(b.station.name, "pt-BR");
        return (a.station.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
          (b.station.distanceMeters ?? Number.MAX_SAFE_INTEGER);
      }).map(({ station }) => station);
    for (const brand of ["all", "Shell", "Ipiranga", "Petrobras", "ALE", "Outras / não declarada", "inexistente"]) {
      for (const hours of ["all", "open", "closed", "unknown"] as const) {
        for (const sort of ["distance", "relevance", "brand", "hours"] as const) {
          const actual = filterAndSortStations(rows, brand, hours, sort);
          expect(actual.map(item => item.id)).toEqual(original(brand, hours, sort).map(item => item.id));
          expect(actual.every(item => rows[item.id] === item)).toBe(true);
        }
      }
    }
    expect(rows[0].id).toBe(0);
    expect(rows[799].id).toBe(799);
  });
});
