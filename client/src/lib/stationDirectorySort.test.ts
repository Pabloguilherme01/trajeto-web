import { describe, expect, it } from "vitest";
import { distanceKm } from "./offlineRouteMath";
import { fuelFilterPriceKey, stationCoordinatePoint, type StationFuelFilter } from "./stationListControls";
import { sortStationDirectoryRows, type StationDirectorySort } from "./stationDirectorySort";

type Station = {
  key: string;
  local: {
    displayName: string;
    brand: string | null;
    mapData?: { observedBrand?: string | null };
    anp?: { latitude: number | null; longitude: number | null };
  } | null;
  anp: {
    razaoSocial: string | null;
    distribuidora: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};
type Price = { productKey: string; salePrice: number };

function previousSort(
  items: Station[], sort: StationDirectorySort,
  coords: { lat: number; lng: number } | null,
  fuel: StationFuelFilter,
  priceMap: Map<string, Price[]>,
) {
  return items.slice().sort((a, b) => {
    const label = (item: Station) => item.local?.displayName || item.anp?.razaoSocial || "";
    if (sort === "distance" && coords) {
      const point = (item: Station) => stationCoordinatePoint(item.anp?.latitude, item.anp?.longitude)
        ?? stationCoordinatePoint(item.local?.anp?.latitude, item.local?.anp?.longitude);
      const aa = point(a), bb = point(b);
      const da = aa ? distanceKm(coords, aa) : Number.POSITIVE_INFINITY;
      const db = bb ? distanceKm(coords, bb) : Number.POSITIVE_INFINITY;
      return da - db || label(a).localeCompare(label(b), "pt-BR");
    }
    if (sort === "price") {
      const key = fuelFilterPriceKey(fuel);
      const pa = priceMap.get(a.key)?.find(p => p.productKey === key)?.salePrice ?? Number.POSITIVE_INFINITY;
      const pb = priceMap.get(b.key)?.find(p => p.productKey === key)?.salePrice ?? Number.POSITIVE_INFINITY;
      return pa - pb || label(a).localeCompare(label(b), "pt-BR");
    }
    if (sort === "brand") {
      return (a.anp?.distribuidora || a.local?.brand || "Sem bandeira").localeCompare(
        b.anp?.distribuidora || b.local?.brand || "Sem bandeira", "pt-BR",
      ) || label(a).localeCompare(label(b), "pt-BR");
    }
    return label(a).localeCompare(label(b), "pt-BR");
  });
}

describe("station directory precomputed sorting", () => {
  const items: Station[] = Array.from({ length: 400 }, (_, i) => ({
    key: String(10_000_000_000_000 + i),
    local: i % 7 === 0 ? null : {
      displayName: ["Posto São José", "Auto Posto Águas Lindas", "Ipiranga", "Shell", "Posto"][i % 5] + (i % 8 === 0 ? "" : " " + i),
      brand: ["Shell", null, "Ipiranga", "ALE", "Petrobras"][i % 5],
      anp: { latitude: -15.76 + i / 200_000, longitude: -48.28 },
    },
    anp: i % 11 === 0 ? null : {
      razaoSocial: ["Posto", "Auto Posto", "Combustíveis"][i % 3] + " " + i,
      distribuidora: ["ALE", "Shell", null, "Ipiranga"][i % 4],
      latitude: i % 13 === 0 ? 0 : i % 9 === 0 ? null : -15.77 + i / 200_000,
      longitude: i % 13 === 0 ? 0 : i % 9 === 0 ? null : -48.29,
    },
  }));
  const productKeys = ["gasolina-comum", "etanol", "diesel-s10", "glp-p13", "gnv"];
  const prices = new Map(items.map((item, i) => [
    item.key, i % 6 === 0 ? [] : productKeys.map((productKey, j) => ({ productKey, salePrice: 3 + ((i * 11 + j) % 19) / 10 })),
  ] as const));
  const fuels: StationFuelFilter[] = ["all", "gasolina-comum", "etanol", "diesel-s10", "diesel-s500", "glp-p13", "gnv"];

  it("matches the previous ordering for every sort, fuel and location case", () => {
    const initial = items.slice();
    for (const sort of ["name", "brand", "price", "distance"] as const) {
      for (const fuel of fuels) {
        for (const coords of [null, { lat: -15.7545, lng: -48.2816 }, { lat: -15.76, lng: -48.28 }]) {
          const old = previousSort(items, sort, coords, fuel, prices);
          const next = sortStationDirectoryRows(items, sort, coords, fuel, prices);
          expect(next).toEqual(old);
          expect(next.every(item => initial.includes(item))).toBe(true);
        }
      }
    }
    expect(items).toEqual(initial);
  });

  it("preserves pt-BR accents, punctuation, letter case and stable ties", () => {
    const labels = [
      "Águas Lindas", "Aguas Lindas", "São José", "Sao Jose",
      "Zé Auto", "Ze Auto", "Éden", "Eden", "Auto-Posto",
      "Auto Posto", "posto", "Posto", "Posto 2", "Posto 10",
      "Ônix", "Onix", "ALE", "alé", "Óleo", "Oleo",
    ];
    const brands = ["ÁLÉ", "Ale", "São", "Sao", "Shell", null] as const;
    const samples: Station[] = labels.map((name, index) => ({
      key: "accent-" + index,
      local: {
        displayName: name,
        brand: brands[index % brands.length],
        anp: { latitude: -15.78, longitude: -48.28 },
      },
      anp: null,
    }));
    // Tie cases include equal coordinates and absent prices.
    const emptyPrices = new Map<string, Price[]>();
    for (const mode of ["name", "brand", "price", "distance"] as const) {
      const coords = { lat: -15.78, lng: -48.28 };
      expect(sortStationDirectoryRows(samples, mode, coords, "gasolina-comum", emptyPrices)
        .map(item => item.key)).toEqual(
        previousSort(samples, mode, coords, "gasolina-comum", emptyPrices)
          .map(item => item.key),
      );
    }
    expect(samples.map(item => item.local?.displayName)).toEqual(labels);
  });

  it("sorts mapped-only brands by the distributor displayed on their cards", () => {
    const observed: Station = {
      key: "observed", local: {
        displayName: "Posto observado", brand: null, mapData: { observedBrand: "Ipiranga" },
      }, anp: null,
    };
    const declared: Station = {
      key: "declared", local: { displayName: "Posto declarado", brand: "Petrobras" }, anp: null,
    };
    expect(sortStationDirectoryRows(
      [declared, observed], "brand", null, "all", new Map(),
    ).map(item => item.key)).toEqual(["observed", "declared"]);
  });

  it("orders a nearby local map point before a distant ANP point when official 0,0 is invalid", () => {
    const nearby: Station = {
      key: "nearby",
      local: { displayName: "Perto", brand: null, anp: { latitude: -15.79, longitude: -48.28 } },
      anp: { razaoSocial: "Perto", distribuidora: null, latitude: 0, longitude: 0 },
    };
    const distant: Station = {
      key: "distant",
      local: null,
      anp: { razaoSocial: "Longe", distribuidora: null, latitude: -15.85, longitude: -48.35 },
    };
    expect(sortStationDirectoryRows(
      [distant, nearby], "distance", { lat: -15.79, lng: -48.28 }, "all", new Map(),
    ).map(row => row.key)).toEqual(["nearby", "distant"]);
  });

  it("does not invent missing prices or coordinates and preserves input object identity", () => {
    const selected = [items[0], items[1], items[7], items[13]];
    const emptyPrices = new Map<string, Price[]>();
    const ordered = sortStationDirectoryRows(selected, "price", null, "all", emptyPrices);
    expect(ordered).toEqual(previousSort(selected, "price", null, "all", emptyPrices));
    const distant = sortStationDirectoryRows(selected, "distance", { lat: -15.76, lng: -48.28 }, "all", emptyPrices);
    expect(distant).toEqual(previousSort(selected, "distance", { lat: -15.76, lng: -48.28 }, "all", emptyPrices));
    expect(selected[0]).toBe(items[0]);
  });
});
