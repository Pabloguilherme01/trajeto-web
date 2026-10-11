import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchesCatalogText } from "./catalogSearch";
import { buildIndexedStationDirectorySearch } from "./stationDirectorySearch";

type Station = { label: string; street?: string; district?: string; cnpj?: string; brand?: string };
const fields = (station: Station) => [
  station.label, station.street, station.district, station.cnpj, station.brand,
];
function previous(records: Station[], query: string, secondaryQuery = "") {
  const hasQuery = query.trim().toLocaleLowerCase("pt-BR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return records.filter(record => {
    const text = fields(record).filter(Boolean).join(" ").toLocaleLowerCase("pt-BR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (!hasQuery || matchesCatalogText(query, [text])) &&
      (!secondaryQuery || matchesCatalogText(secondaryQuery, [text]));
  });
}

describe("indexed station directory filters", () => {
  it("preserves matching, token boundaries, accents, CNPJ and source order", () => {
    const records: Station[] = [
      { label: "Posto São José", district: "Jardim Brasília", street: "BR-070", cnpj: "12.345.678/0001-90", brand: "Shell" },
      { label: "Combustíveis Central", district: "Águas Lindas", street: "Quadra 12", cnpj: "98.765.432/0001-10", brand: "Bandeira branca" },
      { label: "Posto Sol", street: "Avenida JK", district: "Setor 3", brand: "Ipiranga" },
    ];
    const search = buildIndexedStationDirectorySearch(records, fields);
    for (const query of ["", " ", "posto", "sao jose", "São", "BR-070", "Jardim Brasília",
      "12345678", "12.345", "Shell", "posto sol", "agua", "3", "xyz"]) {
      expect(search(query)).toEqual(previous(records, query));
      expect(search(query, "posto")).toEqual(previous(records, query, "posto"));
    }
  });

  it("builds indexes once per snapshot and never reuses stale data", () => {
    const records = Array.from({ length: 1800 }, (_, i) => ({
      label: "Posto " + i, district: i % 2 ? "Centro" : "Jardim",
    }));
    let indexed = 0;
    const search = buildIndexedStationDirectorySearch(records, record => {
      indexed++;
      return fields(record);
    });
    expect(indexed).toBe(records.length);
    for (const q of ["Centro", "Posto", "Jardim 100", "1800", ""]) search(q);
    expect(indexed).toBe(records.length);
    const updated = records.map(record =>
      record.label === "Posto 0" ? { ...record, label: "Novo estabelecimento" } : record);
    expect(buildIndexedStationDirectorySearch(updated, fields)("novo").map(item => item.label))
      .toEqual(["Novo estabelecimento"]);
    expect(search("novo")).toEqual([]);
  });

  it("wires mobile search and both reset actions to one handler", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-label="Buscar no diretório de postos"');
    expect(source).toContain("value={directorySearch}");
    expect(source.match(/onClick=\{resetDirectoryFilters\}/g)).toHaveLength(2);
    for (const setter of ["setNeighborhoodFilter", "setBrandFilter", "setAddressOnly",
      "setVerifiedOnly", "setMappedOnly", "setFuelFilter", "setDirectorySearch"]) {
      expect(source.slice(source.indexOf("const resetDirectoryFilters"), source.indexOf("useEffect(() => { if (mapFirst)"))).toContain(setter);
    }
  });
});
