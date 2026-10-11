import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createStationDirectoryFuelMatcher } from "./stationDirectoryFuelMatcher";
import { stationSupportsFuel, type StationFuelFilter } from "./stationListControls";

type Card = {
  key: string;
  local: { displayName: string } | null;
  anp: { products?: Array<{ produto: string | null }> } | null;
};
type Price = { productKey: string; salePrice: number };

const fuels: StationFuelFilter[] = [
  "all", "gasolina-comum", "etanol", "diesel-s10", "diesel-s500", "glp-p13", "gnv",
];
const productNames = [
  "Gasolina Comum", "Gasolina Aditivada", "Etanol", "Óleo Diesel S10",
  "Diesel S500", "GLP P13 13 kg", "Gás Natural Veicular", "SEM PRODUTO",
];
const cards: Card[] = Array.from({ length: 450 }, (_, i) => ({
  key: String(10000000000000 + i),
  local: i % 9 ? { displayName: "Posto " + i } : null,
  anp: i % 7 ? {
    products: i % 11 ? [
      { produto: productNames[i % productNames.length] },
      { produto: productNames[(i + 3) % productNames.length] },
    ] : [{ produto: null }],
  } : null,
}));
const prices = new Map<string, Price[]>(
  cards.filter((_, i) => i % 5 !== 0).map((card, i) => [
    card.key,
    [{ productKey: fuels[(i % (fuels.length - 1)) + 1], salePrice: 3.5 }],
  ]),
);

function previous(fuel: StationFuelFilter, source = cards, pricing: ReadonlyMap<string, readonly Price[]> = prices) {
  if (fuel === "all") return null;
  return new Set(source.filter(item => stationSupportsFuel(
    pricing.get(item.key)?.map(record => record.productKey) ?? [],
    item.anp?.products?.map(product => product.produto || "") ?? [],
    fuel,
  )));
}

describe("station fuel matcher per directory snapshot", () => {
  it("preserves the exact original result for all seven filters and combined sources", () => {
    const match = createStationDirectoryFuelMatcher(cards, prices);
    const initial = JSON.stringify(cards);
    expect(match("all")).toBeNull();
    for (const fuel of fuels.slice(1)) {
      const result = match(fuel);
      expect([...result!]).toEqual([...previous(fuel)!]);
      expect(match(fuel)).toBe(result); // repeated taps avoid recomputing
      expect([...result!].every(item => cards.includes(item))).toBe(true);
    }
    expect(JSON.stringify(cards)).toBe(initial);
  });

  it("handles empty snapshots and refreshes when ANP products or prices change", () => {
    const empty = createStationDirectoryFuelMatcher([], new Map());
    for (const fuel of fuels.slice(1)) expect([...empty(fuel)!]).toEqual([]);
    const original = createStationDirectoryFuelMatcher(cards, prices);
    const originalGas = original("gasolina-comum");
    const changed: Card[] = cards.map((item, index) => index === 0 ? {
      ...item, anp: { products: [{ produto: "Gasolina Comum" }] },
    } : item);
    const refreshed = createStationDirectoryFuelMatcher(changed, new Map());
    expect([...refreshed("gasolina-comum")!]).toEqual([...previous("gasolina-comum", changed, new Map())!]);
    expect(original("gasolina-comum")).toBe(originalGas);
  });

  it("wires the finite cache to the current page and keeps the reset behavior", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    expect(source).toContain("createStationDirectoryFuelMatcher(directoryCards, pricesByCnpj)");
    expect(source).toContain("matchDirectoryFuel(fuelFilter)");
    expect(source).toContain('setFuelFilter("all")');
    expect(source).toContain("directoryFuelMatches.has(item)");
  });
});
