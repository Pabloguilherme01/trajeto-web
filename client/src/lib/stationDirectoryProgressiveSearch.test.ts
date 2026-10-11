import { describe, expect, it } from "vitest";
import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import { buildIndexedStationDirectorySearch } from "./stationDirectorySearch";

type RecordItem = { id: number; title: string; district: string; cnpj: string; detail: string };
const fields = (record: RecordItem) => [
  record.title, record.district, record.cnpj, record.detail,
];
const words = ["Posto São José", "Postos do Cerrado", "Oficina", "Mercado", "Padaria", "POS", "Hospital"];

const source = Array.from({ length: 1850 }, (_, index) => ({
  id: index,
  title: words[index % words.length] + " " + (index % 45),
  district: ["Águas Lindas", "Jardim Brasília", "Centro", "Setor 3"][index % 4],
  cnpj: String(10000000000000 + index),
  detail: index % 3 === 0 ? "BR-070" : "Avenida dos Ipês",
}));

function fullScan(items: RecordItem[], query: string, secondary = "") {
  const terms = [query, secondary].flatMap(value =>
    normalizeCatalogText(value).replace(/[ºª]/g, "").split(" ").filter(Boolean));
  return items.filter(item => matchesCatalogTerms(terms, createCatalogSearchIndex(fields(item))));
}

describe("progressive station directory search parity", () => {
  it("matches the full scan across expansions, deletions, aliases and changed filters", () => {
    const search = buildIndexedStationDirectorySearch(source, fields);
    const sequences: Array<[string, string]> = [
      ["", ""], ["p", ""], ["po", ""], ["pos", ""], ["post", ""],
      ["posto", ""], ["postos", ""], ["postos do", ""], ["posto", ""],
      ["post", ""], ["", ""], ["1234", ""], ["12345", ""],
      ["100000000000", ""], ["1000000000000", ""], ["", ""],
      ["são", ""], ["são josé", ""], ["São José", "centro"],
      ["São José", "centro 3"], ["São José", ""],
      ["", "Jardim"], ["posto", "Jardim"], ["postos", "Jardim"],
      ["postos", "Jardim Brasília"], ["posto", "Águas Lindas"],
      ["", ""], ["BR-070", ""], ["BR-070", "posto"],
      ["BR-070", "postos"], ["BR-070", "3"], ["", ""],
      ["ipês", ""], ["ipê", ""], ["nao existe", ""],
      ["posto", ""], ["", ""],
    ];
    for (const [query, secondary] of sequences) {
      const actual = search(query, secondary);
      expect(actual.map(item => item.id), query + " / " + secondary)
        .toEqual(fullScan(source, query, secondary).map(item => item.id));
    }
  });

  it("does not accidentally narrow when a short or numeric term becomes longer", () => {
    const data = [
      { id: 1, title: "POS", district: "", cnpj: "1234", detail: "" },
      { id: 2, title: "Posto", district: "", cnpj: "12345", detail: "" },
      { id: 3, title: "Postos", district: "", cnpj: "123456", detail: "" },
    ];
    const search = buildIndexedStationDirectorySearch(data, fields);
    expect(search("pos").map(item => item.id)).toEqual([1]);
    expect(search("post").map(item => item.id)).toEqual([2, 3]);
    expect(search("posto").map(item => item.id)).toEqual([2, 3]);
    expect(search("postos").map(item => item.id)).toEqual([3]);
    expect(search("1234").map(item => item.id)).toEqual([1]);
    expect(search("12345").map(item => item.id)).toEqual([2]);
    expect(search("123456").map(item => item.id)).toEqual([3]);
  });

  it("returns independent arrays, preserves identity/order and isolates replaced snapshots", () => {
    let fieldsCalled = 0;
    const search = buildIndexedStationDirectorySearch(source, item => {
      fieldsCalled++;
      return fields(item);
    });
    const first = search("posto");
    const order = first.map(item => item.id);
    first.splice(0, first.length);
    expect(search("posto").map(item => item.id)).toEqual(order);
    expect(search("postos").every(item => source.includes(item))).toBe(true);
    expect(fieldsCalled).toBe(source.length);
    const refreshed = source.map((item, i) => i === 0 ? { ...item, title: "Novo local" } : item);
    const freshSearch = buildIndexedStationDirectorySearch(refreshed, fields);
    expect(freshSearch("novo").map(item => item.id)).toEqual([0]);
    expect(search("novo")).toEqual([]);
  });
});
