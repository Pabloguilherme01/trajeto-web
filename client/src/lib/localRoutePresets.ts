export type LocalRoutePreset = {
  id: string;
  label: string;
  detail: string;
  destination: string;
  category: "saude" | "servicos" | "transporte" | "compras" | "combustivel" | "centro";
};

export const LOCAL_ROUTE_PRESETS: LocalRoutePreset[] = [
  { id: "upa", label: "UPA", detail: "Urgência e emergência", destination: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "hospital-estadual", label: "Hospital Estadual", detail: "Atendimento hospitalar", destination: "Hospital Estadual de Águas Lindas de Goiás, GO", category: "saude" },
  { id: "prefeitura", label: "Prefeitura", detail: "Serviços municipais", destination: "Prefeitura Municipal de Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "rodoviaria", label: "Rodoviária", detail: "Transporte intermunicipal", destination: "Rodoviária de Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "centro", label: "Centro", detail: "Ir para a região central", destination: "Centro, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "tatico", label: "Supermercado Tatico", detail: "Compras e abastecimento", destination: "Supermercado Tatico, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "farmacia", label: "Farmácia Águas Lindas", detail: "Farmácia e atendimento", destination: "Farmácia Águas Lindas, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "posto-ponteio", label: "Posto Ponteio", detail: "Combustível e parada", destination: "Posto Ponteio, Águas Lindas de Goiás, GO", category: "combustivel" },
  { id: "posto-shell", label: "Posto Shell", detail: "BR-070 · Mansões Centroeste", destination: "Posto Shell Águas Lindas, BR-070, Águas Lindas de Goiás, GO", category: "combustivel" },
  { id: "zm", label: "ZM Combustíveis", detail: "Recreio das Águas Lindas", destination: "ZM Combustíveis, Águas Lindas de Goiás, GO", category: "combustivel" },
];

export function getLocalRoutePresets(query = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return LOCAL_ROUTE_PRESETS;
  return LOCAL_ROUTE_PRESETS.filter(item =>
    [item.label, item.detail, item.destination, item.category].join(" ").toLocaleLowerCase("pt-BR").includes(normalized),
  );
}
