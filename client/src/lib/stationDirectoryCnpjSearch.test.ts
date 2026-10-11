import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildIndexedStationDirectorySearch } from "./stationDirectorySearch";
import { normalizeStationCnpj } from "./stationListControls";

type Row = { key: string; local: { cnpj: string; displayName: string } | null; anp: { cnpj: string; razaoSocial: string } | null };
const rows: Row[] = [
  { key: "12345678000190", local: { cnpj: "12.345.678/0001-90", displayName: "Posto São José" }, anp: null },
  { key: "00012345000167", local: null, anp: { cnpj: "00.012.345/0001-67", razaoSocial: "Posto Águas Lindas" } },
  { key: "98765432000110", local: { cnpj: "98.765.432/0001-10", displayName: "Posto Sol" }, anp: null },
];

describe("numeric-only CNPJ directory search", () => {
  it("finds local and ANP-only stations by a full CNPJ with or without punctuation", () => {
    const search = buildIndexedStationDirectorySearch(rows, row => [
      row.local?.displayName, row.local?.cnpj, row.key,
      row.anp?.razaoSocial, row.anp?.cnpj,
    ]);
    expect(search("12345678000190")).toEqual([rows[0]]);
    expect(search("12.345.678/0001-90")).toEqual([rows[0]]);
    expect(search("00012345000167")).toEqual([rows[1]]);
    expect(search("00.012.345/0001-67")).toEqual([rows[1]]);
    expect(search("98765432000110")).toEqual([rows[2]]);
    expect(search("00012345000167", "Águas Lindas")).toEqual([rows[1]]);
    expect(search("99999999000199")).toEqual([]);
  });

  it("uses existing normalized business identities and does not persist identifiers", () => {
    expect(rows.every(item => normalizeStationCnpj(item.local?.cnpj || item.anp?.cnpj) === item.key)).toBe(true);
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    const block = source.slice(source.indexOf("const directoryTextSearch"), source.indexOf("const directoryCardsFiltered"));
    expect(block).toContain("item.key");
    expect(block).toContain("item.local?.cnpj");
    expect(block).toContain("item.anp?.cnpj");
  });
});
