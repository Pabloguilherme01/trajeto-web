export type CorridorPreset = {
  id: string;
  label: string;
  query: string;
  detail: string;
};

export const corridorPresets: CorridorPreset[] = [
  { id: "aguas-lindas", label: "Águas Lindas", query: "Águas Lindas de Goiás, GO", detail: "saída e bairros" },
  { id: "ceilandia", label: "Ceilândia", query: "Ceilândia, DF", detail: "BR-070 e entorno" },
  { id: "taguatinga", label: "Taguatinga", query: "Taguatinga, DF", detail: "eixo de trabalho" },
  { id: "brasilia", label: "Brasília", query: "Brasília, DF", detail: "Plano Piloto" },
];
