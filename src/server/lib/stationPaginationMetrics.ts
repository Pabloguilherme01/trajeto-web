const publicRegions = [
  { match: /[áa]guas\s+lindas/i, label: "Águas Lindas de Goiás, GO" },
  { match: /ceil[âa]ndia/i, label: "Ceilândia, DF" },
  { match: /taguatinga/i, label: "Taguatinga, DF" },
  { match: /bras[íi]lia/i, label: "Brasília, DF" },
  { match: /valpara[íi]so/i, label: "Valparaíso de Goiás, GO" },
  { match: /cidade\s+ocidental/i, label: "Cidade Ocidental, GO" },
  { match: /luzi[âa]nia/i, label: "Luziânia, GO" },
  { match: /formosa/i, label: "Formosa, GO" },
  { match: /planaltina/i, label: "Planaltina, DF/GO" },
  { match: /santo\s+ant[ôo]nio/i, label: "Santo Antônio do Descoberto, GO" },
];

/** Retorna somente um agrupamento geográfico público, nunca o texto pesquisado. */
export function stationPaginationMetricRegion(query: string) {
  return publicRegions.find(region => region.match.test(query))?.label ?? "Outras consultas";
}
