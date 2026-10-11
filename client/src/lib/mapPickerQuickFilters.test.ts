import { expect, it } from "vitest";
import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import { availableMapPickerQuickFilters } from "./mapPickerQuickFilters";
import type { QuickFilterPreset } from "./quickFilterPresets";

const options: QuickFilterPreset[] = [
  { label: "UPA", value: "upa" },
  { label: "UBS", value: "ubs" },
  { label: "São José", value: "sao jose" },
  { label: "Prefeitura", value: "prefeitura" },
  { label: "Posto 13", value: "posto 13" },
  { label: "Avenida", value: "avenida" },
];

function previous(rows: ReturnType<typeof createCatalogSearchIndex>[], presets: QuickFilterPreset[]) {
  return presets.filter(option => {
    const terms = normalizeCatalogText(option.value).replace(/[ºª]/g, "").split(" ").filter(Boolean);
    return rows.some(row => matchesCatalogTerms(terms, row));
  });
}

it("preserves preset order and all exact-token and accent rules", () => {
  const rows = [
    createCatalogSearchIndex(["UPA Mansões", "Jardim Brasília"]),
    createCatalogSearchIndex(["UBS São José", "Av. Central"]),
    createCatalogSearchIndex(["Posto 13 de Maio", "Avenida Principal"]),
    createCatalogSearchIndex(["Prefeitura", "Centro"]),
  ];
  expect(availableMapPickerQuickFilters(rows.map(search => ({ search })), options))
    .toEqual(previous(rows, options));
});

it("handles empty lists, queries with no matches and duplicate preset values", () => {
  const presets: QuickFilterPreset[] = [...options, { label: "Outra UPA", value: "UPA" }];
  const rows = [createCatalogSearchIndex(["UPA", "Rua das Palmeiras"])];
  expect(availableMapPickerQuickFilters([], presets)).toEqual([]);
  expect(availableMapPickerQuickFilters([{ search: rows[0] }], [])).toEqual([]);
  expect(availableMapPickerQuickFilters([{ search: rows[0] }], presets))
    .toEqual(previous(rows, presets));
});

it("returns the same options after broad scans, even when some terms never match", () => {
  const rows = Array.from({ length: 3500 }, (_, index) =>
    createCatalogSearchIndex([index % 3 ? "Avenida Brasília" : "Rua Central", "Setor " + index])
  );
  for (const presets of [options, [...options, { label: "Inexistente", value: "zzzz-nao-cadastrado" }]]) {
    expect(availableMapPickerQuickFilters(rows.map(search => ({ search })), presets))
      .toEqual(previous(rows, presets));
  }
});
