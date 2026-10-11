import { describe, expect, it } from "vitest";
import { mergeStationDirectoryRows } from "./stationDirectoryMerge";
import { normalizeStationCnpj, sameStationIdentity } from "./stationListControls";

type Local = {
  cnpj: string; address?: string | null; neighborhood?: string | null;
  anp?: { latitude?: number | null; longitude?: number | null } | null;
};
type Official = {
  cnpj: string; endereco?: string | null; bairro?: string | null;
  latitude?: number | null; longitude?: number | null;
};

// Independent reference: exactly the previous Stations.tsx reconciliation.
function previous(locals: Local[], official: Official[]) {
  const byCnpj = new Map(official.map(station => [normalizeStationCnpj(station.cnpj), station]));
  const cards: Array<{ key: string; local: Local | null; anp: Official | null }> =
    locals.map(local => {
      const key = normalizeStationCnpj(local.cnpj) || local.cnpj;
      return { key, local, anp: byCnpj.get(key) ?? null };
    });
  for (const anp of official) {
    const key = normalizeStationCnpj(anp.cnpj) || anp.cnpj;
    if (cards.some(item => sameStationIdentity(
      {
        cnpj: item.anp?.cnpj || item.local?.cnpj,
        address: [item.anp?.endereco || item.local?.address,
          item.anp?.bairro || item.local?.neighborhood].filter(Boolean).join(" "),
        lat: Number(item.anp?.latitude ?? item.local?.anp?.latitude),
        lng: Number(item.anp?.longitude ?? item.local?.anp?.longitude),
      },
      {
        cnpj: anp.cnpj,
        address: [anp.endereco, anp.bairro].filter(Boolean).join(" "),
        lat: Number(anp.latitude),
        lng: Number(anp.longitude),
      },
    ))) continue;
    cards.push({ key, local: null, anp });
  }
  return cards;
}

describe("directory merging with CNPJ index", () => {
  it("keeps first local order, last official CNPJ snapshot, and distinct known CNPJs", () => {
    const locals: Local[] = [
      { cnpj: "12.345.678/0001-90", neighborhood: "Jardim Brasília", address: "BR-070" },
      { cnpj: "99.888.777/0001-11", address: "R. A" },
    ];
    const official: Official[] = [
      { cnpj: "12345678000190", endereco: "BR-070" },
      { cnpj: "12345678000190", endereco: "BR-070 atualizado" },
      { cnpj: "87.654.321/0001-00", endereco: "BR-070" },
      { cnpj: "87654321000100", endereco: "BR-070" },
    ];
    const actual = mergeStationDirectoryRows(locals, official);
    expect(actual).toEqual(previous(locals, official));
    expect(actual).toHaveLength(3);
    expect(actual[0].anp).toBe(official[1]);
    expect(actual[2].anp).toBe(official[2]);
  });

  it("preserves fallback for missing CNPJs, addresses and coordinates, including invalid points", () => {
    const locals: Local[] = [
      { cnpj: "", address: "Avenida Brasília, Q. 12", neighborhood: "Centro" },
      { cnpj: "11.222.333/0001-44", address: "Rua Um", anp: { latitude: -15.78, longitude: -48.29 } },
      { cnpj: "texto-invalido", address: "Quadra 77", neighborhood: "Setor São José" },
    ];
    const official: Official[] = [
      { cnpj: "44.555.666/0001-77", endereco: "Avenida Brasilia Q 12", bairro: "Centro" },
      { cnpj: "", endereco: "Rua Um", latitude: -15.78, longitude: -48.29 },
      { cnpj: "", endereco: "Desconhecido", latitude: 0, longitude: 0 },
      { cnpj: "", endereco: "Desconhecido", latitude: 0, longitude: 0 },
      { cnpj: "99.000.111/0001-22", endereco: "Rua Um", latitude: -15.78, longitude: -48.29 },
      { cnpj: "77.111.333/0001-44", endereco: "Quadra 77", bairro: "Setor Sao Jose" },
    ];
    expect(mergeStationDirectoryRows(locals, official)).toEqual(previous(locals, official));
  });

  it("keeps the same output on a larger future ANP snapshot without mutating source arrays", () => {
    const locals = Array.from({ length: 240 }, (_, i) => ({
      cnpj: String(10000000000000 + i), address: "Avenida " + i,
      neighborhood: "Setor " + i, anp: { latitude: -15.8 + i / 100000, longitude: -48.2 },
    }));
    const official = Array.from({ length: 280 }, (_, i) => ({
      cnpj: String(10000000000000 + (i % 265)), endereco: "Avenida " + i,
      bairro: "Setor " + i, latitude: null, longitude: null,
    }));
    const oldLocal = JSON.stringify(locals);
    const oldOfficial = JSON.stringify(official);
    const result = mergeStationDirectoryRows(locals, official);
    expect(result).toEqual(previous(locals, official));
    expect(JSON.stringify(locals)).toBe(oldLocal);
    expect(JSON.stringify(official)).toBe(oldOfficial);
  });
});
