import { matchesCatalogText } from "./catalogSearch";

export type PublicDataCategory =
  | "transporte"
  | "saude"
  | "educacao"
  | "seguranca"
  | "territorio"
  | "lugares"
  | "combustivel";

export type PublicDataResource = {
  id: string;
  title: string;
  category: PublicDataCategory;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  updatedAt?: string;
  updateFrequency?: string;
  official: boolean;
  offlinePolicy: "metadata" | "snapshot";
  localPath?: string;
  keywords: string[];
};

export type SemiurbanFare = {
  id: string;
  origin: string;
  destination: string;
  operator: string;
  fare: number;
  effectiveFrom: string;
  sourceLabel: string;
  sourceUrl: string;
  plannerDestination: string;
  keywords: string[];
};

export const PUBLIC_DATA_HUB_UPDATED_AT = "01/10/2026";

export const SEMIURBAN_FARES: SemiurbanFare[] = [
  {
    id: "aguas-lindas-taguatinga",
    origin: "Águas Lindas de Goiás",
    destination: "Taguatinga",
    operator: "Taguatur",
    fare: 7.65,
    effectiveFrom: "28/06/2026",
    sourceLabel: "ANTT · tarifa oficial",
    sourceUrl:
      "https://www.gov.br/antt/pt-br/assuntos/ultimas-noticias/entorno-do-df-novas-tarifas-da-taguatur-entram-em-vigor-a-partir-de-28-de-junho",
    plannerDestination: "Taguatinga, Brasília - DF",
    keywords: [
      "onibus",
      "ônibus",
      "taguatinga",
      "taguatur",
      "tarifa",
      "passagem",
      "entorno",
      "semiurbano",
      "transporte",
    ],
  },
  {
    id: "aguas-lindas-ceilandia",
    origin: "Águas Lindas de Goiás",
    destination: "Ceilândia",
    operator: "Taguatur",
    fare: 5.85,
    effectiveFrom: "28/06/2026",
    sourceLabel: "ANTT · tarifa oficial",
    sourceUrl:
      "https://www.gov.br/antt/pt-br/assuntos/ultimas-noticias/entorno-do-df-novas-tarifas-da-taguatur-entram-em-vigor-a-partir-de-28-de-junho",
    plannerDestination: "Ceilândia, Brasília - DF",
    keywords: [
      "onibus",
      "ônibus",
      "ceilandia",
      "ceilândia",
      "taguatur",
      "tarifa",
      "passagem",
      "entorno",
      "semiurbano",
      "transporte",
    ],
  },
];

export const PUBLIC_DATA_RESOURCES: PublicDataResource[] = [
  {
    id: "anp-combustiveis",
    title: "Preços e revendedores de combustíveis",
    category: "combustivel",
    description:
      "Base já integrada ao Trajeto para referência de preços, revendedores e procedência dos dados de combustível.",
    sourceLabel: "ANP",
    sourceUrl:
      "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos",
    official: true,
    offlinePolicy: "snapshot",
    localPath: "/postos",
    keywords: [
      "anp",
      "combustivel",
      "combustível",
      "gasolina",
      "etanol",
      "diesel",
      "posto",
      "preco",
      "preço",
    ],
  },
  {
    id: "antt-monitriip",
    title: "Transporte semiurbano do Entorno",
    category: "transporte",
    description:
      "MONITRIIP reúne viagens programadas, início da viagem, linha, paradas, distância, velocidade média e tempo de viagem. O Trajeto usa apenas dados úteis ao passageiro e não expõe identificadores pessoais.",
    sourceLabel: "ANTT · MONITRIIP",
    sourceUrl:
      "https://dados.antt.gov.br/dataset/monitriip-semiurbano",
    updatedAt: "10/09/2026",
    updateFrequency: "Mensal",
    official: true,
    offlinePolicy: "metadata",
    localPath: "/dados#transporte",
    keywords: [
      "antt",
      "monitriip",
      "onibus",
      "ônibus",
      "semiurbano",
      "transporte",
      "linha",
      "horario",
      "horário",
      "entorno",
      "taguatinga",
      "ceilandia",
      "ceilândia",
    ],
  },
  {
    id: "cnes-saude",
    title: "Estabelecimentos de saúde",
    category: "saude",
    description:
      "CNES mantém a relação nacional de estabelecimentos de saúde e serve como fonte complementar para validar e ampliar a cobertura local.",
    sourceLabel: "Ministério da Saúde · CNES",
    sourceUrl:
      "https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude",
    updatedAt: "30/09/2026",
    updateFrequency: "Diária",
    official: true,
    offlinePolicy: "metadata",
    localPath: "/servicos?categoria=saude",
    keywords: [
      "cnes",
      "saude",
      "saúde",
      "ubs",
      "upa",
      "hospital",
      "clinica",
      "clínica",
      "estabelecimento",
    ],
  },
  {
    id: "inep-escolas",
    title: "Catálogo de escolas",
    category: "educacao",
    description:
      "O Catálogo de Escolas do Inep reúne endereço, telefone, oferta educacional, categoria administrativa e situação de funcionamento.",
    sourceLabel: "Inep",
    sourceUrl:
      "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas/",
    updatedAt: "15/07/2026",
    updateFrequency: "Anual · Censo Escolar",
    official: true,
    offlinePolicy: "metadata",
    localPath: "/servicos?categoria=educacao",
    keywords: [
      "inep",
      "escola",
      "educacao",
      "educação",
      "colegio",
      "colégio",
      "ensino",
      "censo escolar",
    ],
  },
  {
    id: "prf-acidentes",
    title: "Dados rodoviários e acidentes",
    category: "seguranca",
    description:
      "A PRF publica dados abertos de acidentes em CSV. O uso no Trajeto deve ser histórico e contextual, sem apresentar o dado como alerta em tempo real.",
    sourceLabel: "Polícia Rodoviária Federal",
    sourceUrl:
      "https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf",
    updatedAt: "28/07/2026",
    updateFrequency: "Mensal",
    official: true,
    offlinePolicy: "metadata",
    localPath: "/planejar",
    keywords: [
      "prf",
      "br-070",
      "br 070",
      "acidente",
      "rodovia",
      "seguranca",
      "segurança",
      "trecho",
    ],
  },
  {
    id: "ibge-localidades",
    title: "Município e divisões territoriais",
    category: "territorio",
    description:
      "A API de Localidades do IBGE fornece identificadores oficiais e divisões político-administrativas para reconhecer corretamente município, distrito e região.",
    sourceLabel: "IBGE · API de Localidades",
    sourceUrl:
      "https://servicodados.ibge.gov.br/api/docs/localidades",
    official: true,
    offlinePolicy: "metadata",
    localPath: "/mapa",
    keywords: [
      "ibge",
      "municipio",
      "município",
      "aguas lindas",
      "águas lindas",
      "limite",
      "territorio",
      "território",
      "localidade",
    ],
  },
  {
    id: "osm-overpass",
    title: "Pontos úteis do OpenStreetMap",
    category: "lugares",
    description:
      "Overpass permite descobrir categorias como farmácias, mercados, oficinas, bancos, pontos de ônibus e alimentação. É uma camada comunitária e deve aparecer separada de fontes oficiais.",
    sourceLabel: "OpenStreetMap · Overpass",
    sourceUrl: "https://wiki.openstreetmap.org/wiki/Overpass_API",
    official: false,
    offlinePolicy: "metadata",
    localPath: "/buscar",
    keywords: [
      "openstreetmap",
      "osm",
      "overpass",
      "farmacia",
      "farmácia",
      "mercado",
      "oficina",
      "banco",
      "ponto de onibus",
      "ponto de ônibus",
      "lugares",
    ],
  },
];

export function searchPublicDataResources(query: string) {
  const value = query.trim();
  if (!value) return [];
  return PUBLIC_DATA_RESOURCES.filter(item =>
    matchesCatalogText(value, [
      item.title,
      item.description,
      item.sourceLabel,
      item.category,
      item.keywords.join(" "),
    ]),
  );
}

export function searchSemiurbanFares(query: string) {
  const value = query.trim();
  if (!value) return [];
  return SEMIURBAN_FARES.filter(item =>
    matchesCatalogText(value, [
      item.origin,
      item.destination,
      item.operator,
      item.sourceLabel,
      item.keywords.join(" "),
    ]),
  );
}

export function findPublicDataResource(id: string) {
  return PUBLIC_DATA_RESOURCES.find(item => item.id === id) ?? null;
}
