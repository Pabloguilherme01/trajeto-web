import cityAtlasData from "../../public/data/aguas-lindas-city-atlas.json";
import { matchesCatalogText, normalizeCatalogText } from "./catalogSearch";
import { PUBLIC_SERVICES } from "@/lib/publicServices";
import { LOCAL_PLACES } from "@/lib/localPlaces";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";
import anpSnapshot from "../../public/data/aguas-lindas-anp.json";

export type RouteDestinationCategory = "saude" | "educacao" | "servicos" | "transporte" | "compras" | "combustivel" | "centro" | "alimentacao";
export type RouteDestinationCategoryFilter = "todos" | RouteDestinationCategory;

export type LocalRoutePreset = {
  id: string;
  label: string;
  detail: string;
  destination: string;
  category: RouteDestinationCategory;
};

export const ROUTE_DESTINATION_CATEGORIES: ReadonlyArray<{ value: RouteDestinationCategoryFilter; label: string }> = [
  { value: "todos", label: "Tudo" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "servicos", label: "Serviços" },
  { value: "compras", label: "Compras" },
  { value: "transporte", label: "Transporte" },
  { value: "combustivel", label: "Postos" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "centro", label: "Cidade" },
];

const CITY_ROUTE_PRESETS: LocalRoutePreset[] = [
  { id: "upa", label: "UPA", detail: "Urgência e emergência · 24h", destination: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "heal", label: "HEAL", detail: "Hospital estadual · atendimento", destination: "HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho, Rua 19, 792, Parque da Barragem 9, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "hospital-bom-jesus", label: "Hospital Bom Jesus", detail: "Confirme o atendimento antes de sair", destination: "Hospital Municipal Bom Jesus, Q 109, Setor 10, Águas Lindas de Goiás, GO", category: "saude" },
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
  { id: "vapt-vupt", label: "Vapt Vupt", detail: "Serviços públicos", destination: "Vapt Vupt, Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "detran", label: "Detran-GO", detail: "Serviços de trânsito", destination: "Detran-GO, Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "cora-coralina", label: "Cora Coralina", detail: "Colégio estadual", destination: "Colégio Estadual Cora Coralina, Rua 38, Mansões Village, Águas Lindas de Goiás, GO", category: "educacao" },
  { id: "cepi-jk", label: "CEPI JK", detail: "Educação estadual · Mansões Odisseia", destination: "CEPI Juscelino Kubitschek de Oliveira, Rua Mansões Odisseia, Águas Lindas de Goiás, GO", category: "educacao" },
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
  { id: "cepm-aguas-lindas", label: "CEPM Águas Lindas", detail: "Educação estadual · Colégio Militar", destination: "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas, GO", category: "educacao" },
  { id: "paulo-freire", label: "Colégio Paulo Freire", detail: "Educação estadual", destination: "Colégio Estadual Paulo Freire, Águas Lindas de Goiás, GO", category: "educacao" },
  { id: "secretaria-educacao", label: "Secretaria de Educação", detail: "Atendimento da educação municipal", destination: "Secretaria Municipal de Educação, Águas Lindas de Goiás, GO", category: "educacao" },
  { id: "camara-municipal", label: "Câmara Municipal", detail: "Atendimento legislativo", destination: "Câmara Municipal de Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "forum", label: "Fórum", detail: "Serviços da Justiça", destination: "Fórum de Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "rodoviaria", label: "Rodoviária", detail: "Terminal rodoviário · Jardim da Barragem IV", destination: "Rodoviária de Águas Lindas de Goiás, Rua 36, 5335, Jardim da Barragem IV, Águas Lindas de Goiás, GO", category: "transporte" },
  { id: "aguas-lindas-shopping", label: "Águas Lindas Shopping", detail: "Compras e serviços · Mansões Centro-Oeste", destination: "Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "atacadao-dia-a-dia", label: "Atacadão Dia a Dia", detail: "Atacado e varejo · Mansões Centro-Oeste · mix de produtos", destination: "Atacadão Dia a Dia, Alameda Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "shopping-alimentacao", label: "Águas Lindas Shopping · Alimentação", detail: "Praça de alimentação · Piso 1 · confirme horários", destination: "Praça de alimentação, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "burger-king-shopping", label: "Burger King · Águas Lindas Shopping", detail: "Alimentação · unidade no shopping · confirme funcionamento", destination: "Burger King, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "cacau-show-shopping", label: "Cacau Show · Águas Lindas Shopping", detail: "Alimentação e presentes · unidade no shopping · confirme horário", destination: "Cacau Show, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "chocolates-brasil-cacau-shopping", label: "Chocolates Brasil Cacau · Shopping", detail: "Alimentação e presentes · referência de pesquisa", destination: "Chocolates Brasil Cacau, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "qg-shopping", label: "QG · Águas Lindas Shopping", detail: "Alimentação · unidade no shopping · confirme horário", destination: "QG, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "mango-shake-shopping", label: "Mango Shake · Águas Lindas Shopping", detail: "Bebidas e alimentação · unidade no shopping · confirme horário", destination: "Mango Shake, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "o-boticario-shopping", label: "O Boticário · Águas Lindas Shopping", detail: "Varejo e beleza · unidade no shopping · confirme horário", destination: "O Boticário, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "americanas-aguas-lindas", label: "Americanas · Águas Lindas", detail: "Varejo · confirme unidade e funcionamento antes de sair", destination: "Americanas, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "giraffas-shopping", label: "Giraffas · Águas Lindas Shopping", detail: "Alimentação · unidade no shopping · confirme horário", destination: "Giraffas, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "spoleto-shopping", label: "Spoleto · Águas Lindas Shopping", detail: "Alimentação · unidade no shopping · confirme horário", destination: "Spoleto, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "bobs-shopping", label: "Bob's · Águas Lindas Shopping", detail: "Alimentação · unidade no shopping · confirme horário", destination: "Bob's, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "riachuelo-shopping", label: "Riachuelo · Águas Lindas Shopping", detail: "Varejo e moda · unidade no shopping · confirme funcionamento", destination: "Riachuelo, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "bretas-shopping", label: "Bretas Supermercados · Shopping", detail: "Mercado · unidade no shopping · confirme funcionamento", destination: "Bretas Supermercados, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "loterica-shopping", label: "Lotérica · Águas Lindas Shopping", detail: "Serviço financeiro · unidade no shopping · confirme horário", destination: "Lotérica, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "caixa-shopping", label: "Caixa Econômica Federal · Shopping", detail: "Banco e atendimento · unidade no shopping · confirme funcionamento", destination: "Caixa Econômica Federal, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "oftalmed-shopping", label: "Oftalmed Hospital da Visão", detail: "Saúde · unidade no shopping · confirme atendimento", destination: "Oftalmed Hospital da Visão, Águas Lindas Shopping, Avenida Santa Luzia, Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "saude" },
  { id: "drogaria-exclusiva", label: "Drogaria Exclusiva · Jardim Águas Lindas II", detail: "Farmácia · confirme horário", destination: "Drogaria Exclusiva, Quadra 14, Jardim Águas Lindas II, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "cabana-chopperia", label: "Cabana Chopperia", detail: "Alimentação · referência BR-070 · confirme funcionamento", destination: "Cabana Chopperia, BR-070, Águas Lindas de Goiás, GO", category: "alimentacao" },
  { id: "supermercado-guaira", label: "Supermercado Guaíra", detail: "Mercado · Jardim Guaíra · confirme horário", destination: "Supermercado Guaíra, Rua Mato Grosso, Jardim Guaíra, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "supermercado-jardim-guaira", label: "Supermercado · Jardim Guaíra", detail: "Mercado · Jardim Guaíra", destination: "Supermercado, Rua Tocantins, 38, Jardim Guaíra, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "droga-shop-camping-club", label: "DrogaShop Camping Club", detail: "Farmácia · Camping Club", destination: "DrogaShop Camping Club, Quadra 07 Lote 60, Camping Clube Nacional, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "farmacia-aguas-lindas", label: "Farmácia Águas Lindas", detail: "Farmácia · Parque da Barragem", destination: "Farmácia Águas Lindas, Rua 19, Parque da Barragem, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "banco-brasil-4590", label: "Banco do Brasil · Agência 4590", detail: "Atendimento bancário · Jardim Brasília", destination: "Banco do Brasil Agência 4590, Avenida JK, S/N, Jardim Brasília, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "supermercado-alves", label: "Supermercado Alves", detail: "Mercado · Jardim Águas Lindas II", destination: "Supermercado Alves, Q 18 S/N LT 10, Avenida Águas Lindas 2, Jardim Águas Lindas II, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "supermercado-rodrigues", label: "Supermercado Rodrigues", detail: "Mercado · Parque Águas Bonitas", destination: "Supermercado Rodrigues, Parque Águas Bonitas, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "caixa-jardim-brasilia", label: "Caixa Econômica · Jardim Brasília", detail: "Banco e ATM · Avenida JK", destination: "Caixa Econômica Federal, Quadra 11, Lote 18, Avenida JK, Jardim Brasília, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "praca-da-biblia", label: "Praça da Bíblia", detail: "Praça pública · Jardim Brasília", destination: "Praça da Bíblia, Rua 36, Jardim Brasília, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "praca-santa-lucia", label: "Praça do Santa Lúcia", detail: "Praça pública · Jardim Águas Lindas", destination: "Praça do Santa Lúcia, Quadra 26, Jardim Águas Lindas, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "praca-setor-02", label: "Praça Setor 02", detail: "Área pública · Setor 02", destination: "Praça Setor 02, Rua 7, Setor 3, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "viveiro-municipal", label: "Viveiro Municipal", detail: "Serviço municipal · Jardim Querência", destination: "Viveiro Municipal de Águas Lindas de Goiás, Rua 21, Jardim Querência, Águas Lindas de Goiás, GO", category: "servicos" },
  { id: "posto-perimetral", label: "Posto Perimetral", detail: "Combustível · Parque da Barragem", destination: "Posto Perimetral, Avenida Águas Lindas, Parque da Barragem, Águas Lindas de Goiás, GO", category: "combustivel" },
  { id: "mercado-paraiso", label: "Mini Mercado Paraíso", detail: "Mercado · Residencial Jardim Paraíso", destination: "Mini Mercado Paraíso, Rua das Azaléias, 195, Residencial Jardim Paraíso, Águas Lindas de Goiás, GO", category: "compras" },
  { id: "parque-da-barragem", label: "Parque da Barragem", detail: "Referência urbana · ponto aproximado", destination: "Parque da Barragem, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "jardim-brasilia", label: "Jardim Brasília", detail: "Bairro e eixo comercial · ponto aproximado", destination: "Jardim Brasília, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "jardim-querencia", label: "Jardim Querência", detail: "Bairro e serviços públicos · ponto aproximado", destination: "Jardim Querência, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "mansoes-centro-oeste", label: "Mansões Centro-Oeste", detail: "Bairro · shopping e comércio · ponto aproximado", destination: "Mansões Centro-Oeste, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "jardim-guaira", label: "Jardim Guaíra", detail: "Bairro e comércio · ponto aproximado", destination: "Jardim Guaíra, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "camping-club", label: "Camping Club", detail: "Bairro e serviços · ponto aproximado", destination: "Camping Club, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "jardim-barragem-iv", label: "Jardim da Barragem IV", detail: "Bairro · rodoviária e serviços · ponto aproximado", destination: "Jardim da Barragem IV, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "parque-aguas-bonitas", label: "Parque Águas Bonitas", detail: "Bairro e serviços · ponto aproximado", destination: "Parque Águas Bonitas, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "jardim-aguas-lindas-ii", label: "Jardim Águas Lindas II", detail: "Bairro e comércio · ponto aproximado", destination: "Jardim Águas Lindas II, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "chacaras-coimbra", label: "Chácaras Coimbra", detail: "Área urbana · ponto aproximado", destination: "Chácaras Coimbra, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "setor-10", label: "Setor 10", detail: "Setor urbano · ponto aproximado", destination: "Setor 10, Águas Lindas de Goiás, GO", category: "centro" },
  { id: "setor-09", label: "Setor 09", detail: "Setor urbano · ponto aproximado", destination: "Setor 09, Águas Lindas de Goiás, GO", category: "centro" },
];

// A legacy shortcut must not recreate a route deliberately absent in the official catalog.
export const LOCAL_ROUTE_PRESETS = CITY_ROUTE_PRESETS.filter(preset => {
  const service = PUBLIC_SERVICES.find(item => item.id === preset.id);
  return !service || Boolean(service.mapQuery);
});

const LOCAL_PLACE_DESTINATIONS: LocalRoutePreset[] = LOCAL_PLACES.map(place => ({
  id: "place-" + place.id,
  label: place.name,
  detail: place.detail,
  destination: place.mapQuery,
  category: place.category === "alimentacao" ? "alimentacao" : place.category === "compras" ? "compras" : place.category === "servicos" ? "servicos" : "centro",
}));

// Public contacts with a route feed the destination picker automatically.
// Preserve established shortcut IDs and skip services they already represent.
const representedServices = new Set([
  ...LOCAL_ROUTE_PRESETS.map(item => item.id),
  "upa-mansoes-odisseia", "policia-civil-1", "pcgo-17-drp", "transito-mobilidade",
  "coralina", "cepi-juscelino", "pm-go-aguas-lindas",
]);
const SUPPORT_DESTINATIONS: LocalRoutePreset[] = PUBLIC_SERVICES.filter(service => service.mapQuery && !representedServices.has(service.id)).map(service => ({
  id: service.id, label: service.name, detail: service.description, destination: service.mapQuery ?? service.address ?? service.name, category: service.category === "educacao" ? "educacao" : "servicos",
}));
function normalizeDestinationKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b(goias|go)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeRouteDestinations(...groups: LocalRoutePreset[][]) {
  const byId = new Set<string>();
  const byDestination = new Set<string>();
  const merged: LocalRoutePreset[] = [];

  for (const item of groups.flat()) {
    const destinationKey = normalizeDestinationKey(item.destination);
    if (byId.has(item.id) || (destinationKey && byDestination.has(destinationKey))) continue;
    byId.add(item.id);
    if (destinationKey) byDestination.add(destinationKey);
    merged.push(item);
  }
  return merged;
}

// One catalog feeds Planner, city shortcuts and destination search.
// Curated presets win over derived place/service entries so the user sees one clear
// destination instead of repeated cards pointing to the same route.
export const ALL_LOCAL_ROUTE_DESTINATIONS = mergeRouteDestinations(
  LOCAL_ROUTE_PRESETS,
  LOCAL_PLACE_DESTINATIONS,
  SUPPORT_DESTINATIONS,
);

export function getLocalRoutePresets(
  query = "",
  category: RouteDestinationCategoryFilter = "todos",
) {
  return ALL_LOCAL_ROUTE_DESTINATIONS.filter(item =>
    (category === "todos" || item.category === category) &&
    matchesCatalogText(query, [item.label, item.detail, item.destination, item.category])
  );
}

export type ReadyCityRoute = { id: string; origin: string; destination: string; label: string; detail: string; category: RouteDestinationCategory; originId: string; originLabel: string; destinationLabel: string };

// Existing verified destinations; the city reference is approximate, not a street address.
// Street routes use the existing OSM midpoint, never a made-up entrance.
const streetEndpointIds = [
  "via-osm-c1d703024625", "via-osm-0da29ee8ad6a", "via-osm-c5c7393b6fbe",
  "via-osm-52f68aff98dd", "via-osm-12afdab9f311", "via-osm-0a8bca1e8c85",
  "via-osm-e04f4a6b272b", "via-osm-a5571ffd2353", "via-osm-de5332cbc47c",
  "via-osm-26660805dfbb", "via-osm-f2f3d0bf830f", "via-osm-1b3c23706c3f",
];
const streetNameCounts = new Map<string, number>();
for (const item of cityAtlasData.items) {
  if (item.coordinateKind === "street-midpoint") {
    const name = normalizeCatalogText(item.name);
    streetNameCounts.set(name, (streetNameCounts.get(name) ?? 0) + 1);
  }
}
const extraStreetIds = cityAtlasData.items.filter(item =>
  item.coordinateKind === "street-midpoint" && Number.isFinite(item.lat) && Number.isFinite(item.lng) &&
  /^(Avenida|Alameda|Rodovia|Estrada)\b/.test(item.name) &&
  streetNameCounts.get(normalizeCatalogText(item.name)) === 1 && !streetEndpointIds.includes(item.id)
).slice(0, 30 - streetEndpointIds.length).map(item => item.id);
export const READY_ROUTE_STREET_POINTS = [...streetEndpointIds, ...extraStreetIds].map(id => {
  const street = cityAtlasData.items.find(item => item.id === id);
  if (!street || street.coordinateKind !== "street-midpoint" || !Number.isFinite(street.lat) || !Number.isFinite(street.lng)) {
    throw new Error(`Ready route requires a mapped street midpoint: ${id}`);
  }
  return { id, label: street.name, destination: `${street.name} · referência no mapa, Águas Lindas de Goiás - GO`, lat: street.lat!, lng: street.lng!, category: "centro" as const };
});
/** An explicitly selected, sourced reference; bare homonymous street names stay ambiguous. */
export function resolveReadyRouteStreetPoint(value: string) {
  const query = normalizeCatalogText(value);
  const matches = [...READY_ROUTE_STREET_POINTS, ...READY_ROUTE_STATIONS].filter(point => normalizeCatalogText(point.destination) === query);
  return matches.length === 1 ? { lat: matches[0].lat, lng: matches[0].lng } : null;
}
export const READY_ROUTE_STATIONS = Array.from(new Map(anpSnapshot.data.filter(station =>
  station.latitude != null && String(station.latitude).trim() !== "" && Number.isFinite(Number(station.latitude)) && Math.abs(Number(station.latitude)) <= 90 &&
  station.longitude != null && String(station.longitude).trim() !== "" && Number.isFinite(Number(station.longitude)) && Math.abs(Number(station.longitude)) <= 180
).map(station => [station.cnpj, station])).values()).map(station => ({
  id: "ready-station-" + station.cnpj,
  label: AGUAS_LINDAS_STATIONS.find(item => item.cnpj.replace(/\D/g, "") === station.cnpj)?.displayName ?? station.razaoSocial,
  destination: `${station.razaoSocial} · CNPJ ${station.cnpj}, Águas Lindas de Goiás - GO`,
  lat: Number(station.latitude),
  lng: Number(station.longitude),
  category: "combustivel" as const,
}));
const readyEndpoints: Record<string, { label: string; destination: string; category: RouteDestinationCategory }> = {
  ...Object.fromEntries(CITY_ROUTE_PRESETS.map(place => [place.id, place])),
  ...Object.fromEntries(READY_ROUTE_STREET_POINTS.map(place => [place.id, place])),
  ...Object.fromEntries(READY_ROUTE_STATIONS.map(place => [place.id, place])),
  centro: { label: "Centro (referência)", destination: "Águas Lindas de Goiás, GO", category: "centro" },
};
const streetToStreetPairs = READY_ROUTE_STREET_POINTS.flatMap((origin, index) =>
  READY_ROUTE_STREET_POINTS.slice(index + 1).map(destination =>
    [origin.id, destination.id] as const
  )
);
const routeHubIds = ["centro", "prefeitura", "rodoviaria", "aguas-lindas-shopping", "upa", "heal", "hospital-bom-jesus"] as const;
const hubToHubPairs = routeHubIds.flatMap((origin, index) =>
  routeHubIds.slice(index + 1).map(destination => [origin, destination] as const)
);
const stationToStreetPairs = READY_ROUTE_STATIONS.flatMap(station =>
  READY_ROUTE_STREET_POINTS.map(street => [station.id, street.id] as const)
);
const stationToStationPairs = READY_ROUTE_STATIONS.flatMap((origin, index) =>
  READY_ROUTE_STATIONS.slice(index + 1).map(destination => [origin.id, destination.id] as const)
);
const readyPairs = [
  ["centro", "upa"], ["centro", "heal"], ["centro", "prefeitura"],
  ["centro", "rodoviaria"], ["centro", "aguas-lindas-shopping"], ["centro", "hospital-bom-jesus"],
  ["prefeitura", "upa"], ["prefeitura", "heal"], ["prefeitura", "rodoviaria"],
  ["prefeitura", "aguas-lindas-shopping"], ["prefeitura", "hospital-bom-jesus"],
  ["upa", "heal"], ["upa", "rodoviaria"], ["upa", "aguas-lindas-shopping"], ["upa", "hospital-bom-jesus"],
  ["heal", "rodoviaria"], ["heal", "aguas-lindas-shopping"], ["heal", "hospital-bom-jesus"],
  ["rodoviaria", "aguas-lindas-shopping"], ["aguas-lindas-shopping", "hospital-bom-jesus"],
  ["rodoviaria", "prefeitura"], ["aguas-lindas-shopping", "upa"],
  ...hubToHubPairs,
  ...stationToStreetPairs,
  ...stationToStationPairs,
  ...READY_ROUTE_STATIONS.flatMap(station =>
    ["centro", "prefeitura", "rodoviaria"].map(origin => [origin, station.id] as const)),
  ...READY_ROUTE_STREET_POINTS.map(street => ["centro", street.id] as const),
  ...READY_ROUTE_STREET_POINTS.flatMap(street =>
    ["upa", "heal", "prefeitura", "rodoviaria", "aguas-lindas-shopping", "hospital-bom-jesus"]
      .map(destination => [street.id, destination] as const)),
  ...streetToStreetPairs,
] as const;
export const LOCAL_READY_ROUTES: ReadyCityRoute[] = Array.from(new Map(readyPairs.map(pair => [pair.join("-to-"), pair])).values()).map(([from, to]) => ({
  id: `${from}-to-${to}`,
  originId: from,
  originLabel: readyEndpoints[from].label,
  destinationLabel: readyEndpoints[to].label,
  origin: readyEndpoints[from].destination,
  destination: readyEndpoints[to].destination,
  label: `${readyEndpoints[from].label} → ${readyEndpoints[to].label}`,
  detail: to.startsWith("ready-station-") ? "Coordenadas do cadastro ANP · confira o acesso no mapa" : [from, to].some(id => id === "centro" || readyEndpoints[id].category === "centro") ? "Referência aproximada · ajuste a partida ou chegada" : "Origem e destino preenchidos",
  category: readyEndpoints[to].category,
}));
