export const corridorPresets = [
  { id: "aguas-lindas", label: "Águas Lindas", query: "Águas Lindas de Goiás, GO", detail: "saída e bairros" },
  { id: "ceilandia", label: "Ceilândia", query: "Ceilândia, DF", detail: "BR-070 e entorno" },
  { id: "taguatinga", label: "Taguatinga", query: "Taguatinga, DF", detail: "eixo de trabalho" },
  { id: "brasilia", label: "Brasília", query: "Brasília, DF", detail: "Plano Piloto" },
  { id: "valparaiso", label: "Valparaíso", query: "Valparaíso de Goiás, GO", detail: "BR-040 e eixo sul" },
  { id: "cidade-ocidental", label: "Cidade Ocidental", query: "Cidade Ocidental, GO", detail: "BR-040 e moradia" },
  { id: "luziania", label: "Luziânia", query: "Luziânia, GO", detail: "BR-040 e trabalho" },
  { id: "formosa", label: "Formosa", query: "Formosa, GO", detail: "BR-020 e ligação norte" },
  { id: "planaltina-go", label: "Planaltina", query: "Planaltina de Goiás, GO", detail: "BR-020 e entorno norte" },
  { id: "santo-antonio", label: "Santo Antônio", query: "Santo Antônio do Descoberto, GO", detail: "BR-060 e acesso oeste" },
] as const;

export type CorridorPreset = (typeof corridorPresets)[number];
