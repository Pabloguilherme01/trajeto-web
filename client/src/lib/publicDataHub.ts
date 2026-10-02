import { matchesCatalogText } from "./catalogSearch";

export type PublicDataCategory =
  | "transporte"
  | "saude"
  | "educacao"
  | "seguranca"
  | "territorio"
  | "lugares"
  | "combustivel"
  | "clima"
  | "rodovia"
  | "conectividade"
  | "financeiro"
  | "assistencia"
  | "ambiente";

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
  freshness: "catalog" | "snapshot" | "static" | "realtime";
  observedAt?: string;
  localPath?: string;
  keywords: string[];
};

export function publicDataFreshnessLabel(resource: PublicDataResource) {
  if (resource.freshness === "realtime") return "Tempo real";
  if (resource.freshness === "static") return "Dados estáticos";
  if (resource.freshness === "snapshot") return resource.observedAt
    ? `Snapshot · ${resource.observedAt}`
    : "Snapshot";
  return "Catálogo de fonte";
}

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
    freshness: "snapshot",
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
    freshness: "catalog",
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
    freshness: "catalog",
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
    freshness: "catalog",
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
    freshness: "catalog",
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
    freshness: "catalog",
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
    freshness: "catalog",
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
  {
    id: "inmet-alertas",
    title: "Avisos meteorológicos oficiais",
    category: "clima",
    description:
      "O INMET publica avisos meteorológicos organizados por dia, com horizonte de até cinco dias. O Trajeto trata esses avisos como contexto antes da saída, nunca como previsão própria.",
    sourceLabel: "INMET · Avisos",
    sourceUrl: "https://avisos.inmet.gov.br/",
    updatedAt: "01/10/2026",
    updateFrequency: "Diária",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=inmet-alertas",
    keywords: [
      "inmet",
      "alerta",
      "aviso",
      "chuva",
      "tempestade",
      "umidade",
      "vendaval",
      "calor",
      "tempo",
      "clima",
      "antes de sair",
    ],
  },
  {
    id: "defesa-civil-alertas",
    title: "Alertas da Defesa Civil",
    category: "clima",
    description:
      "Serviço oficial de alertas de risco por SMS, WhatsApp, Telegram e outros canais. O Cell Broadcast alcança aparelhos compatíveis conectados às redes móveis nas áreas afetadas.",
    sourceLabel: "Defesa Civil Nacional",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/solicitar-cadastro-para-recebimento-de-avisos-e-alertas-de-desastres",
    updatedAt: "21/07/2026",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=defesa-civil-alertas",
    keywords: [
      "defesa civil",
      "sms",
      "whatsapp",
      "telegram",
      "cell broadcast",
      "alagamento",
      "enchente",
      "deslizamento",
      "incendio",
      "incêndio",
      "emergencia",
      "emergência",
    ],
  },
  {
    id: "dnit-rodovias",
    title: "Contexto oficial das rodovias",
    category: "rodovia",
    description:
      "O DNIT publica conjuntos sobre condições do pavimento, contagem de tráfego, controle de velocidade, jurisdição, pesagem e obras. No Trajeto esses dados servem como contexto rodoviário, não como trânsito ao vivo.",
    sourceLabel: "DNIT · Dados Abertos",
    sourceUrl:
      "https://www.gov.br/dnit/pt-br/acesso-a-informacao/dados-abertos/conjuntos-de-dados",
    updatedAt: "11/03/2026",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=dnit-rodovias",
    keywords: [
      "dnit",
      "br-070",
      "br 070",
      "rodovia",
      "pavimento",
      "trafego",
      "tráfego",
      "velocidade",
      "radar",
      "obra",
      "pesagem",
    ],
  },
  {
    id: "anatel-cobertura",
    title: "Cobertura móvel 4G e 5G",
    category: "conectividade",
    description:
      "A Anatel publica mapas de cobertura e arquivos geográficos por tecnologia e operadora. A cobertura é teórica e pode variar na prática; o Trajeto usa esse dado para sugerir preparação offline, não para prometer sinal.",
    sourceLabel: "Anatel · Cobertura móvel",
    sourceUrl:
      "https://www.gov.br/anatel/pt-br/dados/qualidade/qualidade-dos-servicos/mapa-cobertura",
    updatedAt: "07/09/2026",
    updateFrequency: "Periódica",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=anatel-cobertura",
    keywords: [
      "anatel",
      "4g",
      "5g",
      "sinal",
      "internet",
      "cobertura",
      "operadora",
      "offline",
      "sem sinal",
      "conectividade",
    ],
  },
  {
    id: "stpc-df-gtfs",
    title: "Dados GTFS do transporte do DF",
    category: "transporte",
    description:
      "A Lei Distrital 7.836/2025 determina a publicação de dados abertos do transporte coletivo e do STPC-DF em formato GTFS. O Trajeto está preparado para consumir feeds estáticos ou realtime quando houver fonte estável e verificável.",
    sourceLabel: "Distrito Federal · Lei 7.836/2025",
    sourceUrl:
      "https://www.sinj.df.gov.br/sinj/Norma/e3f912c8e006498eaeccf0bcd513d86f/Lei_7836_24_12_2025.html",
    updatedAt: "24/12/2025",
    official: true,
    offlinePolicy: "metadata",
    freshness: "static",
    localPath: "/dados#transporte",
    keywords: [
      "gtfs",
      "stpc",
      "df",
      "brasilia",
      "brasília",
      "onibus",
      "ônibus",
      "paradas",
      "linha",
      "atraso",
      "acessibilidade",
      "transporte publico",
      "transporte público",
    ],
  },
  {
    id: "bcb-correspondentes",
    title: "Correspondentes bancários por município",
    category: "financeiro",
    description:
      "O Banco Central mantém uma base mensal de correspondentes bancários e tipos de serviço por município, com API, JSON e OData. O Trajeto pode usá-la para orientar onde resolver pagamentos e serviços financeiros presenciais.",
    sourceLabel: "Banco Central · Dados Abertos",
    sourceUrl: "https://dadosabertos.bcb.gov.br/dataset/correspondentes",
    updatedAt: "11/09/2026",
    updateFrequency: "Mensal",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=bcb-correspondentes",
    keywords: [
      "banco",
      "bancario",
      "bancário",
      "correspondente",
      "pagamento",
      "boleto",
      "financeiro",
      "lotérica",
      "loterica",
      "dinheiro",
    ],
  },
  {
    id: "mds-assistencia",
    title: "Rede nacional de assistência social",
    category: "assistencia",
    description:
      "O MDS cataloga unidades da Assistência Social, incluindo CRAS, CREAS e Centro POP. Em Águas Lindas o Trajeto mantém os contatos municipais e usa a base nacional como referência de procedência.",
    sourceLabel: "MDS · Dados Abertos",
    sourceUrl:
      "https://dados.gov.br/dados/conjuntos-dados/unidades-de-atendimento-da-assistencia-social",
    updatedAt: "01/08/2025",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/servicos?categoria=assistencia",
    keywords: [
      "mds",
      "cras",
      "creas",
      "centro pop",
      "assistencia social",
      "assistência social",
      "familia",
      "família",
      "beneficio",
      "benefício",
      "cadunico",
      "cadúnico",
    ],
  },
  {
    id: "samu-dados",
    title: "SAMU 192 · cobertura e estrutura",
    category: "saude",
    description:
      "O OpenDataSUS publica dados de cobertura, centrais de regulação e unidades móveis do SAMU. O Trajeto usa esses dados como contexto institucional e mantém o 192 como canal de emergência.",
    sourceLabel: "OpenDataSUS · SAMU 192",
    sourceUrl:
      "https://dadosabertos.saude.gov.br/dataset/mgdi-servico-de-atendimento-movel-de-urgencia-samu-192",
    updatedAt: "21/06/2026",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/servicos?categoria=saude",
    keywords: [
      "samu",
      "192",
      "ambulancia",
      "ambulância",
      "urgencia",
      "urgência",
      "emergencia",
      "emergência",
      "cobertura",
    ],
  },
  {
    id: "monitorar-ar",
    title: "Qualidade do ar · MonitorAr",
    category: "ambiente",
    description:
      "O MonitorAr reúne estações oficiais e o Índice de Qualidade do Ar. O dado só deve ser apresentado como condição local quando houver estação representativa para a região consultada.",
    sourceLabel: "MMA · MonitorAr",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/obter-dados-das-estacoes-de-monitoramento-da-qualidade-do-ar-por-meio-do-indice-de-qualidade-do-ar-iqar-por-meio-do-aplicativo-monitorar",
    updatedAt: "15/12/2025",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/dados?recurso=monitorar-ar",
    keywords: [
      "qualidade do ar",
      "monitorar",
      "iqar",
      "poluicao",
      "poluição",
      "fumaca",
      "fumaça",
      "ar",
      "ambiente",
    ],
  },
  {
    id: "pni-vacinacao",
    title: "Vacinação · PNI 2026",
    category: "saude",
    description:
      "O Programa Nacional de Imunizações publica dados abertos de doses aplicadas em 2026 com atualização semanal. O Trajeto cataloga a fonte sem carregar a base bruta no celular.",
    sourceLabel: "OpenDataSUS · PNI",
    sourceUrl:
      "https://dadosabertos.saude.gov.br/dataset/doses-aplicadas-pelo-programa-de-nacional-de-imunizacoes-pni-2026",
    updatedAt: "27/09/2026",
    updateFrequency: "Semanal",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/servicos?categoria=saude",
    keywords: [
      "vacina",
      "vacinacao",
      "vacinação",
      "pni",
      "imunizacao",
      "imunização",
      "dose",
      "posto de vacina",
    ],
  },
  {
    id: "farmacia-popular",
    title: "Programa Farmácia Popular",
    category: "saude",
    description:
      "O Programa Farmácia Popular oferece medicamentos e insumos por estabelecimentos credenciados. O Trajeto trata a fonte oficial separadamente de farmácias apenas encontradas no mapa.",
    sourceLabel: "Ministério da Saúde · Farmácia Popular",
    sourceUrl:
      "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular",
    updatedAt: "29/09/2026",
    official: true,
    offlinePolicy: "metadata",
    freshness: "catalog",
    localPath: "/buscar?q=farmacia%20popular",
    keywords: [
      "farmacia popular",
      "farmácia popular",
      "medicamento",
      "remedio",
      "remédio",
      "fralda",
      "absorvente",
      "hipertensao",
      "hipertensão",
      "diabetes",
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
