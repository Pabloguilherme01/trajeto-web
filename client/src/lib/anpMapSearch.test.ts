import { expect, it } from "vitest";
import {
  groupAnpFuelRows, normalizeAnpFuelRow,
  type AnpStation,
} from "@shared/anpRevendedores";
import { matchesCatalogText } from "./catalogSearch";
import { filterAnpMapStations } from "./anpMapSearch";

function stationRow(i: number) {
  const row = normalizeAnpFuelRow({
    cnpj: String(i).padStart(14, "0"),
    razaoSocial: i % 3 === 0 ? "Posto Brasília " + i : "Combustíveis São José " + i,
    endereco: i % 4 === 0 ? "Av. das Palmeiras " + i : "Rua Central " + i,
    bairro: "Mansões Odisseia", municipio: "Águas Lindas de Goiás", uf: "GO",
    latitude: "-15,75", longitude: "-48,28", produto: "Gasolina",
  });
  if (!row) throw new Error("Invalid ANP fixture");
  return row;
}

const stations = groupAnpFuelRows(Array.from({ length: 320 }, (_, i) => stationRow(i)));

function previousMapSearch(items: readonly AnpStation[], query: string) {
  return items.flatMap(station => {
    const lat = station.latitude, lng = station.longitude;
    return typeof lat === "number" && typeof lng === "number" &&
      matchesCatalogText(query, [station.razaoSocial ?? "Posto", station.endereco ?? undefined])
      ? [{
          id: station.cnpj,
          name: station.razaoSocial ?? "Posto",
          source: "ANP" as const,
          address: [station.endereco, station.bairro, station.municipio, station.uf]
            .filter(Boolean).join(", ") || station.razaoSocial || "Posto",
          lat, lng,
        }]
      : [];
  });
}

it("preserves station identity, order, exact labels and queries from the old map filter", () => {
  for (const query of [
    "", " ", "postO", "BRASÍLIA", "São José", "sao jose", "Rua Central",
    "PALMEIRAS", "100", "10", "Combustíveis", "xyz-inexistente",
  ]) {
    expect(filterAnpMapStations(stations, query)).toEqual(previousMapSearch(stations, query));
  }
});

it("does not allocate search indexes for blank queries or expose mutable marker output", () => {
  const expected = previousMapSearch(stations, "");
  const first = filterAnpMapStations(stations, "");
  expect(first).toEqual(expected);
  first.pop();
  expect(filterAnpMapStations(stations, "")).toEqual(expected);
});

it("uses fresh indexes for a newly loaded ANP snapshot and excludes missing coordinates", () => {
  const first = stations[0];
  const updated = [{
    ...first, razaoSocial: "Posto Atualizado Novo", endereco: "Rua Nova 2026",
  }, {
    ...stations[1], latitude: null,
  }];
  expect(filterAnpMapStations(updated, "Atualizado").map(x => x.id)).toEqual([first.cnpj]);
  expect(filterAnpMapStations(stations, "Atualizado")).toEqual([]);
  expect(filterAnpMapStations(updated, "Rua Nova 2026").map(x => x.id)).toEqual([first.cnpj]);
  expect(filterAnpMapStations(updated, "")).toEqual(previousMapSearch(updated, ""));
});

it("preserves fallback name and address when source fields are incomplete", () => {
  const missing = {
    ...stations[0], razaoSocial: null, endereco: null, bairro: null,
    municipio: null, uf: null,
  };
  expect(filterAnpMapStations([missing], "posto"))
    .toEqual(previousMapSearch([missing], "posto"));
});
