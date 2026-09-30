export type LocalRoutePreset = {
  id: string;
  label: string;
  detail: string;
  destination: string;
  category: "saude" | "servicos" | "transporte" | "compras" | "combustivel" | "centro";
};

export const LOCAL_ROUTE_PRESETS: LocalRoutePreset[] = [
  { id: "upa", label: "UPA", detail: "Urgência e emergência · 24h", destination: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "heal", label: "HEAL", detail: "Hospital estadual · atendimento", destination: "HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho, Rua 19, 792, Parque da Barragem 9, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "hospital-bom-jesus", label: "Hospital Bom Jesus", detail: "Hospital municipal · 24h", destination: "Hospital Municipal Bom Jesus, Q 109, Setor 10, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "prefeitura", label: "Prefeitura", detail: "Serviços municipais", destination: "Prefeitura de Águas Lindas de Goiás, Área Especial 4, Avenida 2, Jardim Querência, GO", category: "servicos" },
  { id: "sic", label: "SIC", detail: "Informação ao cidadão", destination: "Serviço de Informação ao Cidadão, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "procon", label: "Procon", detail: "Defesa do consumidor", destination: "Procon Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "transito", label: "Trânsito", detail: "Mobilidade urbana", destination: "Secretaria de Trânsito e Mobilidade Urbana, Quadra 45, Jardim Brasília, Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "conselho-tutelar", label: "Conselho Tutelar", detail: "Proteção de crianças e adolescentes", destination: "Conselho Tutelar, Quadra 11, Jardim Querência, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "cras-1", label: "CRAS I", detail: "Assistência social · Jardim Brasília", destination: "CRAS I Jardim Brasília, Quadra 53, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "centro", label: "Centro", detail: "Região central da cidade", destination: "Centro, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "tatico", label: "Supermercado Tatico", detail: "Compras · Parque da Barragem", destination: "Supermercado Tatico, Quadra 45, Conjunto B, Lote 52, Parque da Barragem Setor 08, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "posto-ponteio", label: "Posto Ponteio", detail: "Combustível · Parque da Barragem", destination: "Posto Ponteio, Avenida Brasília, 3379, Parque da Barragem, Águas Lindas de Goiás, GO", category: "combustivel" },
  { id: "posto-shell", label: "Posto Shell", detail: "Combustível · BR-070", destination: "Posto Shell, BR-070, 285, Mansões Centroeste, Águas Lindas de Goiás, GO", category: "combustivel" },
  { id: "zm", label: "ZM Combustíveis", detail: "Combustível · Recreio", destination: "ZM Combustíveis, Recreio das Águas Lindas, Águas Lindas de Goiás, GO", category: "combustivel" },
];

export function getLocalRoutePresets(query = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return LOCAL_ROUTE_PRESETS;
  return LOCAL_ROUTE_PRESETS.filter(item =>
    [item.label, item.detail, item.destination, item.category].join(" ").toLocaleLowerCase("pt-BR").includes(normalized),
  );
}
