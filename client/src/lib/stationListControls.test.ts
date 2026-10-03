import { describe, expect, it } from "vitest";
import { filterAndSortStations, fuelFilterPriceKey, inferredBrand, sameStationIdentity, stationSupportsFuel } from "./stationListControls";

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
