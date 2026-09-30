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
  { id: "policia-civil", label: "1ª Delegacia", detail: "Polícia Civil · Sol Nascente", destination: "1ª Delegacia de Polícia de Águas Lindas, Rua Adélia, Quadra 3, Setor Sol Nascente, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "saneago", label: "Saneago", detail: "Água e saneamento", destination: "Saneago, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "vapt-vupt", label: "Vapt Vupt", detail: "Serviços públicos", destination: "Vapt Vupt, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "detran", label: "Detran-GO", detail: "Serviços de trânsito", destination: "Detran-GO, Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "cora-coralina", label: "Cora Coralina", detail: "Colégio estadual", destination: "Colégio Estadual Cora Coralina, Rua 38, Mansões Village, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "cepi-jk", label: "CEPI JK", detail: "Educação estadual · Mansões Odisseia", destination: "CEPI Juscelino Kubitschek de Oliveira, Rua Mansões Odisseia, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "ubs-barragem-ii", label: "UBS Barragem II", detail: "Saúde básica · Barragem II", destination: "UBS Barragem II, Quadra 58, Barragem II, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-aguas-bonitas", label: "ESF Águas Bonitas", detail: "Saúde básica · Águas Bonitas", destination: "ESF Águas Bonitas, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-aguas-lindas-ii", label: "ESF Águas Lindas II", detail: "Saúde básica · Águas Lindas II", destination: "ESF Águas Lindas II, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-america", label: "ESF América", detail: "Saúde básica · América", destination: "ESF América, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "ubs-barragem-iv", label: "UBS Barragem IV", detail: "Saúde básica · Barragem IV", destination: "UBS Barragem IV, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-camping-club", label: "ESF Camping Club", detail: "Saúde básica · Camping Club", destination: "ESF Camping Club, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-cidade-entorno", label: "ESF Cidade do Entorno", detail: "Saúde básica · Cidade do Entorno", destination: "ESF Cidade do Entorno, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-coimbra", label: "ESF Coimbra", detail: "Saúde básica · Coimbra", destination: "ESF Coimbra, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-guaira", label: "ESF Guaíra", detail: "Saúde básica · Guaíra", destination: "ESF Guaíra, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "ubs-jardim-paraiso", label: "UBS Jardim Paraíso", detail: "Saúde básica · Jardim Paraíso", destination: "UBS Jardim Paraíso, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-laranjeiras", label: "ESF Laranjeiras", detail: "Saúde básica · Laranjeiras", destination: "ESF Laranjeiras, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-padre-lucio", label: "ESF Padre Lúcio", detail: "Saúde básica · Padre Lúcio", destination: "ESF Padre Lúcio, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-perola-ii", label: "ESF Pérola II", detail: "Saúde básica · Pérola II", destination: "ESF Pérola II, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-pinheiro-i", label: "ESF Pinheiro I", detail: "Saúde básica · Pinheiro I", destination: "ESF Pinheiro I, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-setor-ii", label: "ESF Setor II", detail: "Saúde básica · Setor II", destination: "ESF Setor II, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "esf-setor-09", label: "ESF Setor 09", detail: "Saúde básica · Setor 09", destination: "ESF Setor 09, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "drp-17", label: "17ª DRP", detail: "Polícia Civil · delegacia regional", destination: "17ª Delegacia Regional de Polícia, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "superintendencia-transito", label: "Superintendência de Trânsito", detail: "Atendimento de mobilidade urbana", destination: "Superintendência Municipal de Trânsito, Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "cepm-aguas-lindas", label: "CEPM Águas Lindas", detail: "Educação estadual · Colégio Militar", destination: "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas, GO", category: "servicos" },
  { id: "paulo-freire", label: "Colégio Paulo Freire", detail: "Educação estadual", destination: "Colégio Estadual Paulo Freire, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "secretaria-educacao", label: "Secretaria de Educação", detail: "Atendimento da educação municipal", destination: "Secretaria Municipal de Educação, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "camara-municipal", label: "Câmara Municipal", detail: "Atendimento legislativo", destination: "Câmara Municipal de Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "forum", label: "Fórum", detail: "Serviços da Justiça", destination: "Fórum de Águas Lindas de Goiás, GO", category: "servicos" },
];

export function getLocalRoutePresets(query = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return LOCAL_ROUTE_PRESETS;
  return LOCAL_ROUTE_PRESETS.filter(item =>
    [item.label, item.detail, item.destination, item.category].join(" ").toLocaleLowerCase("pt-BR").includes(normalized),
  );
}
