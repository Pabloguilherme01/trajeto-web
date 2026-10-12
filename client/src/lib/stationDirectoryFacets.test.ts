import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildStationDirectoryFacets, matchesStationDirectoryFacet,
  type StationDirectoryFacetFilters,
} from "./stationDirectoryFacets";

type Card = {
  local?: {
    neighborhood?: string | null;
    brand?: string | null;
    mapData?: { observedBrand?: string | null } | null;
    address?: string | null;
    dataQuality?: string | null;
    dataOrigin?: string | null;
    anp?: { latitude?: number | null; longitude?: number | null } | null;
  } | null;
  anp?: {
    bairro?: string | null;
    distribuidora?: string | null;
    endereco?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

const all: StationDirectoryFacetFilters = {
  neighborhood: "all", brand: "all", addressOnly: false,
  anpOnly: false, coordinatesOnly: false,
};
const matches = (cards: Card[], filters: Partial<StationDirectoryFacetFilters>) => {
  const index = buildStationDirectoryFacets(cards);
  return cards.filter(card => matchesStationDirectoryFacet(index.byCard.get(card)!, { ...all, ...filters }));
};

describe("station directory facet filters", () => {
  const cards: Card[] = [
    {
      local: {
        neighborhood: "Jardim Brasília", brand: "Shell", address: "BR-070",
        dataOrigin: "ANP", anp: { latitude: -15.78, longitude: -48.28 },
      },
      anp: { bairro: "JARDIM BRASILIA", distribuidora: "Shell", endereco: "BR-070", latitude: -15.78, longitude: -48.28 },
    },
    {
      local: { neighborhood: "JARDIM BRASILIA", brand: "Shell", address: null },
      anp: null,
    },
    {
      local: { neighborhood: "Setor São José", brand: null, address: "Rua 3" },
      anp: null,
    },
    {
      local: null,
      anp: { bairro: "Setor São José", distribuidora: "Ipiranga", endereco: null, latitude: 0, longitude: 0 },
    },
  ];

  it("deduplicates accent and case variants in bairro/brand options without discarding records", () => {
    const facets = buildStationDirectoryFacets(cards);
    expect(facets.neighborhoods).toHaveLength(2);
    expect(facets.brands).toHaveLength(3);
    expect(facets.neighborhoods.map(x => x.value)).toContain("jardim brasilia");
    expect(facets.neighborhoods.map(x => x.value)).toContain("setor sao jose");
    expect(matches(cards, {})).toEqual(cards);
    expect(matches(cards, { neighborhood: "jardim brasilia" })).toEqual([cards[0], cards[1]]);
    expect(matches(cards, { brand: "shell" })).toEqual([cards[0], cards[1]]);
  });

  it("combines ANP, address and coordinate filters without inventing coordinates", () => {
    expect(matches(cards, { anpOnly: true })).toEqual([cards[0], cards[3]]);
    expect(matches(cards, { addressOnly: true })).toEqual([cards[0], cards[2]]);
    expect(matches(cards, { coordinatesOnly: true })).toEqual([cards[0]]);
    expect(matches(cards, { anpOnly: true, addressOnly: true, coordinatesOnly: true })).toEqual([cards[0]]);
    expect(matches(cards, { brand: "ipiranga", coordinatesOnly: true })).toEqual([]);
    expect(matches(cards, { neighborhood: "missing" })).toEqual([]);
  });

  it("does not change loaded records and refreshes options when catalog snapshots change", () => {
    const original = JSON.stringify(cards);
    const before = buildStationDirectoryFacets(cards);
    // When an ANP record exists, its displayed distributor has priority.
    // Refresh the winning field along with the local fallback.
    const updated: Card[] = cards.map((item, index) => index === 0 ?
      {
        ...item,
        local: { ...item.local, brand: "ALE" },
        anp: item.anp ? { ...item.anp, distribuidora: "ALE" } : null,
      } : item);
    const after = buildStationDirectoryFacets(updated);
    expect(before.byCard.get(cards[0])?.brand).toBe("shell");
    expect(after.byCard.get(updated[0])?.brand).toBe("ale");
    expect(before.brands.some(item => item.value === "ale")).toBe(false);
    expect(JSON.stringify(cards)).toBe(original);
  });

  it("uses ANP values shown on the card when official and local facets disagree", () => {
    const disagreement: Card[] = [
      {
        local: { neighborhood: "Bairro Local", brand: "Marca Local", address: "Rua A" },
        anp: { bairro: "Jardim Brasília", distribuidora: "Ipiranga", endereco: "Rua A" },
      },
      {
        local: { neighborhood: "Setor São José", brand: "Shell" },
        anp: null,
      },
      {
        local: { neighborhood: "Setor Central", brand: "ALE" },
        anp: { bairro: "", distribuidora: "", endereco: null },
      },
    ];
    const index = buildStationDirectoryFacets(disagreement);
    expect(index.byCard.get(disagreement[0])).toMatchObject({
      neighborhood: "jardim brasilia", brand: "ipiranga",
    });
    expect(index.neighborhoods.map(item => item.label)).toEqual(["Jardim Brasília", "Setor Central", "Setor São José"]);
    expect(index.brands.map(item => item.label)).toEqual(["ALE", "Ipiranga", "Shell"]);
    expect(matches(disagreement, { brand: "ipiranga", neighborhood: "jardim brasilia" })).toEqual([disagreement[0]]);
    expect(matches(disagreement, { brand: "marca local" })).toEqual([]);
    expect(matches(disagreement, { neighborhood: "bairro local" })).toEqual([]);
    expect(matches(disagreement, { brand: "shell" })).toEqual([disagreement[1]]);
    expect(matches(disagreement, { brand: "ale", neighborhood: "setor central" })).toEqual([disagreement[2]]);
  });

  it("matches the distributor fallback actually displayed on each station card", () => {
    const fallback: Card[] = [
      { local: { neighborhood: "Bairro A", brand: null, mapData: { observedBrand: "Marca do Mapa" } }, anp: null },
      { local: { neighborhood: "Bairro B", brand: null, mapData: { observedBrand: null } }, anp: null },
      { local: null, anp: { bairro: "Bairro C", distribuidora: "Ipiranga" } },
    ];
    const index = buildStationDirectoryFacets(fallback);
    expect(index.brands.map(item => item.label)).toEqual(["Bandeira não consolidada", "Ipiranga", "Marca do Mapa"]);
    expect(matches(fallback, { brand: "marca do mapa" })).toEqual([fallback[0]]);
    expect(matches(fallback, { brand: "bandeira nao consolidada" })).toEqual([fallback[1]]);
    expect(matches(fallback, { brand: "ipiranga" })).toEqual([fallback[2]]);
  });

  it("keeps locally mapped stations eligible if official coordinates are invalid", () => {
    const rows: Card[] = [
      {
        anp: { latitude: 0, longitude: 0, distribuidora: "Ipiranga" },
        local: { anp: { latitude: -15.79, longitude: -48.28 }, brand: "Shell" },
      },
      {
        anp: { latitude: -15.80, longitude: -48.29 },
        local: { anp: { latitude: -15.79, longitude: -48.28 } },
      },
      { anp: { latitude: 0, longitude: 0 }, local: { anp: { latitude: null, longitude: null } } },
    ];
    expect(matches(rows, { coordinatesOnly: true })).toEqual([rows[0], rows[1]]);
    expect(matches(rows, { coordinatesOnly: true, brand: "ipiranga" })).toEqual([rows[0]]);
    expect(matches(rows, { coordinatesOnly: true, anpOnly: true })).toEqual([rows[0], rows[1]]);
  });

  it("normalizes each repeated barrio and brand only once per fresh catalog", () => {
    const repeated: Card[] = Array.from({ length: 480 }, (_, index) => ({
      local: {
        neighborhood: index % 2 ? "Jardim São José" : "Centro",
        brand: "Ipiranga",
        address: "BR-070",
      },
      anp: null,
    }));
    const original = JSON.stringify(repeated);
    const normalize = vi.spyOn(String.prototype, "normalize");
    try {
      const first = buildStationDirectoryFacets(repeated);
      expect(normalize).toHaveBeenCalledTimes(3);
      expect(first.byCard.size).toBe(480);
      expect(first.neighborhoods.map(item => item.value)).toEqual(["centro", "jardim sao jose"]);
      expect(first.brands.map(item => item.value)).toEqual(["ipiranga"]);
      expect(repeated.filter(item => matchesStationDirectoryFacet(first.byCard.get(item)!, {
        ...all, neighborhood: "jardim sao jose", brand: "ipiranga",
      }))).toHaveLength(240);
      expect(JSON.stringify(repeated)).toBe(original);

      // A changed ANP/local snapshot gets its own cache, including new labels.
      const updated = repeated.map((item, index) => index === 0
        ? { ...item, local: { ...item.local!, brand: "Shell" } } : item);
      normalize.mockClear();
      const second = buildStationDirectoryFacets(updated);
      expect(normalize).toHaveBeenCalledTimes(4);
      expect(second.brands.map(item => item.value)).toEqual(["ipiranga", "shell"]);
      expect(first.brands.map(item => item.value)).toEqual(["ipiranga"]);
      expect(second.byCard.get(updated[0])?.brand).toBe("shell");
    } finally {
      normalize.mockRestore();
    }
  });

  it("wires all advanced filters to the same directory and reset action", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    for (const term of ['aria-label="Filtrar diretório por bairro"',
      'aria-label="Filtrar diretório por bandeira"', 'aria-pressed={verifiedOnly}',
      'aria-pressed={addressOnly}', 'aria-pressed={mappedOnly}', "matchesStationDirectoryFacet",
      "directoryFuelMatches", "buildStationDirectoryFacets(directoryCards)"]) {
      expect(source).toContain(term);
    }
    expect(source.match(/onClick=\{resetDirectoryFilters\}/g)).toHaveLength(2);
  });
});
