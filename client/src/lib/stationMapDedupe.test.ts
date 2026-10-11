import { describe, expect, it } from "vitest";
import { normalizeStationCnpj, sameStationIdentity } from "./stationListControls";
import { deduplicateStationMapItems } from "./stationMapDedupe";

type Row = {
  cnpj?: string | null; placeId?: string | null;
  name: string; address: string; lat?: number; lng?: number;
  source?: string;
};
function previous(rows: Row[]) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
  const seen = new Set<string>();
  const merged: Row[] = [];
  for (const station of rows) {
    const key = station.cnpj
      ? "cnpj:" + normalizeStationCnpj(station.cnpj)
      : station.placeId ? "place:" + station.placeId
        : "address:" + normalize(station.address || station.name);
    if (seen.has(key)) continue;
    const duplicate = merged.some(existing => sameStationIdentity(
      { cnpj: existing.cnpj, address: existing.address, lat: existing.lat, lng: existing.lng },
      { cnpj: station.cnpj, address: station.address, lat: station.lat, lng: station.lng },
    ));
    if (duplicate) continue;
    seen.add(key);
    merged.push(station);
  }
  return merged;
}

describe("station map CNPJ deduplication parity", () => {
  it("preserves original priority and every match rule including incomplete records", () => {
    const rows: Row[] = [
      { cnpj: "12.345.678/0001-90", name: "ANP A", address: "BR-070, Centro", lat: -15.75, lng: -48.28, source: "ANP" },
      { cnpj: "12345678000190", name: "Local A", address: "BR-070", lat: -15.75, lng: -48.28, source: "local" },
      { cnpj: "11.111.111/0001-11", name: "Outro CNPJ", address: "BR-070, Centro", lat: -15.75, lng: -48.28 },
      { cnpj: null, name: "Google A", address: "BR-070 Centro", lat: -15.75, lng: -48.28 },
      { cnpj: null, name: "Offline sem ponto", address: "Av. São José, quadra 1234" },
      { cnpj: null, name: "Mesmo endereço", address: "Av Sao Jose Quadra 1234" },
      { cnpj: null, name: "Distante", address: "Av. São José, quadra 1234", lat: -15.70, lng: -48.20 },
      { cnpj: "47.000.222/0001-78", name: "ANP B", address: "Rua diferente", lat: -15.71, lng: -48.22 },
      { placeId: "google-2", name: "Novo", address: "Endereço B", lat: -15.8, lng: -48.2 },
      { placeId: "google-2", name: "Mesmo placeId", address: "Outro endereço", lat: -15.8, lng: -48.1 },
      { cnpj: "invalid", name: "Inválido 1", address: "Endereço X" },
      { cnpj: "invalid", name: "Inválido 2", address: "Endereço Y" },
    ];
    const actual = deduplicateStationMapItems(rows);
    expect(actual).toEqual(previous(rows));
    expect(actual[0]).toBe(rows[0]);
    expect(actual).toContain(rows[2]); // Different known CNPJs are distinct.
  });

  it("preserves results and object identity in a larger synthetic map collection", () => {
    const official: Row[] = Array.from({ length: 320 }, (_, i) => ({
      cnpj: String(10000000000000 + i), name: "Posto " + i,
      address: "Quadra " + i, lat: -15.74 + i / 200_000, lng: -48.28,
      source: "ANP",
    }));
    const local: Row[] = Array.from({ length: 340 }, (_, i) => ({
      cnpj: i % 16 === 0 ? null : String(10000000000000 + (i % 320)),
      name: "Local " + i, address: "Quadra " + (i % 320),
      lat: -15.74 + (i % 320) / 200_000, lng: -48.28, source: "local",
    }));
    const live: Row[] = Array.from({ length: 85 }, (_, i) => ({
      placeId: "google-" + i, name: "Referência " + i, address: "Avenida " + i,
      lat: -15.72 - i / 1000, lng: -48.31, source: "Google",
    }));
    const rows = [...official, ...local, ...live];
    const first = rows.slice();
    expect(deduplicateStationMapItems(rows)).toEqual(previous(rows));
    expect(rows).toEqual(first);
    expect(deduplicateStationMapItems(rows).every(item => first.includes(item))).toBe(true);
  });

  it("does not merge two known CNPJs even when their coordinates coincide", () => {
    const rows: Row[] = [
      { cnpj: "11111111000111", name: "Posto 1", address: "Mesmo endereço", lat: -15.76, lng: -48.28 },
      { cnpj: "22222222000122", name: "Posto 2", address: "Mesmo endereço", lat: -15.76, lng: -48.28 },
    ];
    expect(deduplicateStationMapItems(rows)).toEqual(rows);
  });
});
