import { describe, expect, it } from "vitest";
import { filterCityAtlas, filterCityAtlasStreets } from "./cityAtlasSearch";
import { normalizeCatalogText } from "./catalogSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";

const categories: CityAtlasLayer[] = [
  "saude", "educacao", "servicos", "transporte", "combustivel",
  "compras", "alimentacao", "meio-ambiente", "referencia",
];
const entries: CityAtlasItem[] = Array.from({ length: 3200 }, (_, i) => ({
  id: "atlas-" + i,
  name: i % 7 === 0 ? "Avenida Brasília " + i : "Referência " + i,
  detail: i % 5 === 0 ? "Saúde pública" : "Endereço cadastrado",
  address: i % 3 === 0 ? "Mansões Odisseia" : "Jardim Brasília",
  category: categories[i % categories.length],
  sourceLabel: "Atlas local",
  keywords: [i % 13 === 0 ? "posto especial" : "referência urbana"],
}));

function previousFilter(items: CityAtlasItem[], query: string, layer: "todos" | CityAtlasLayer) {
  const terms = normalizeCatalogText(query).split(" ").filter(Boolean);
  return items.filter(item => {
    if (layer !== "todos" && item.category !== layer) return false;
    if (!terms.length) return true;
    const text = normalizeCatalogText([
      item.name, item.detail, item.address, item.destination,
      item.category, ...(item.keywords ?? []),
    ].filter(Boolean).join(" "));
    return terms.every(term => text.includes(term));
  });
}

describe("indexed local atlas filters", () => {
  it("preserves every identity and order across categories, accents and multiword queries", () => {
    for (const layer of ["todos", ...categories] as const) {
      for (const query of ["", "avenida", "brasília", "BRASILIA", "mansões odisseia", "posto especial", "saúde", "zzzz"]) {
        expect(filterCityAtlas(entries, query, layer).map(item => item.id))
          .toEqual(previousFilter(entries, query, layer).map(item => item.id));
      }
    }
  });
  it("does not expose category-index arrays for accidental mutation", () => {
    const first = filterCityAtlas(entries, "", "saude");
    const expected = first.map(item => item.id);
    first.pop();
    expect(filterCityAtlas(entries, "", "saude").map(item => item.id)).toEqual(expected);
  });
  it("indexes each immutable snapshot separately", () => {
    const first = filterCityAtlas(entries, "", "saude");
    const updated = [{ ...entries[0], id: "new-catalog" }, ...entries];
    expect(filterCityAtlas(updated, "", "saude")).toHaveLength(first.length + 1);
    expect(filterCityAtlas(entries, "", "saude")).toHaveLength(first.length);
  });
});

describe("indexed street-only filters", () => {
  const mixed: CityAtlasItem[] = entries.map((item, i) =>
    i % 4 === 0 ? { ...item, coordinateKind: "street-midpoint" as const } : item
  );

  it("returns exactly the streets from the previous full-atlas filter for every query", () => {
    for (const query of ["", " ", "Avenida Brasília", "brasilia", "saude", "MANSÕES ODISSEIA", "posto especial", "zzzz"]) {
      const previous = filterCityAtlas(mixed, query, "todos").filter(item => item.coordinateKind === "street-midpoint");
      const current = filterCityAtlasStreets(mixed, query);
      expect(current.map(item => item.id)).toEqual(previous.map(item => item.id));
    }
  });

  it("keeps result arrays independent, even after a query with no text", () => {
    const first = filterCityAtlasStreets(mixed, "");
    const originalIds = first.map(item => item.id);
    first.pop();
    expect(filterCityAtlasStreets(mixed, "").map(item => item.id)).toEqual(originalIds);
  });

  it("indexes new atlas snapshots separately and excludes nonstreet entries", () => {
    const source = filterCityAtlasStreets(mixed, "Avenida");
    const newStreet: CityAtlasItem = {
      id: "new-street", name: "Avenida Nova", category: "referencia",
      coordinateKind: "street-midpoint", sourceLabel: "Atlas local",
    };
    const expanded = [...mixed, newStreet];
    expect(filterCityAtlasStreets(expanded, "Avenida").map(item => item.id))
      .toEqual([...source.map(item => item.id), "new-street"]);
    expect(filterCityAtlasStreets(mixed, "Avenida").map(item => item.id))
      .toEqual(source.map(item => item.id));
  });
});
