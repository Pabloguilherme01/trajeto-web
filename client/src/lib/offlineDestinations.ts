export type OfflineDestinationCategory =
  | "cidade"
  | "saude"
  | "transporte"
  | "servicos"
  | "assistencia"
  | "justica";

export type OfflineDestination = {
  id: string;
  name: string;
  shortName: string;
  category: OfflineDestinationCategory;
  address: string;
  description: string;
  keywords: string[];
  sourceLabel: string;
  sourceUrl: string;
  phone?: string;
  emergency?: boolean;
};

export const OFFLINE_DESTINATION_CATEGORIES: Array<{ id: "todos" | OfflineDestinationCategory; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "saude", label: "Saúde" },
  { id: "servicos", label: "Serviços" },
  { id: "transporte", label: "Transporte" },
  { id: "assistencia", label: "Assistência" },
  { id: "justica", label: "Justiça" },
  { id: "cidade", label: "Cidade" },
];

export const OFFLINE_DESTINATIONS: OfflineDestination[] = [
  {
    id: "prefeitura",
    name: "Prefeitura Municipal de Águas Lindas de Goiás",
    shortName: "Prefeitura",
    category: "cidade",
    address: "Área Especial 4, Avenida 2, Jardim Querência, Águas Lindas de Goiás - GO, CEP 72910-733",
    description: "Sede municipal e ponto de referência para serviços da Prefeitura.",
    keywords: ["prefeitura", "governo", "municipio", "sede", "paço municipal"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/contatos/",
  },
  {
    id: "vapt-vupt",
    name: "Vapt Vupt Águas Lindas de Goiás",
    shortName: "Vapt Vupt",
    category: "servicos",
    address: "Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás - GO, CEP 72910-000",
    description: "Unidade com atendimento de órgãos como DETRAN, INSS, TRE, SANEAGO e outros.",
    keywords: ["vapt vupt", "detran", "inss", "tre", "saneago", "serviços"],
    sourceLabel: "Portal Vapt Vupt Goiás",
    sourceUrl: "https://vaptvupt.go.gov.br/unidade/aguas-lindas-de-goias",
  },
  {
    id: "hospital-bom-jesus",
    name: "Hospital Municipal Bom Jesus",
    shortName: "Hospital Bom Jesus",
    category: "saude",
    address: "Quadra 109, Conjunto B, Setor 10, Águas Lindas de Goiás - GO, CEP 72925-141",
    description: "Hospital municipal de referência. Cadastro público do CNES e Prefeitura.",
    keywords: ["hospital", "bom jesus", "urgência", "emergencia", "saude"],
    sourceLabel: "Prefeitura / CNES",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/hospital-municipal-bom-jesus/",
    emergency: true,
  },
  {
    id: "upa-mansoes-odisseia",
    name: "UPA 24h Mansões Odisseia",
    shortName: "UPA Mansões Odisseia",
    category: "saude",
    address: "Quadra 3B, Lote 1/3, Bairro Mansões Odisseia, Águas Lindas de Goiás - GO",
    description: "Unidade de Pronto Atendimento informada pela Secretaria Municipal de Saúde como 24 horas.",
    keywords: ["upa", "pronto atendimento", "mansões odisseia", "emergencia", "saude"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/upa/",
    emergency: true,
  },
  {
    id: "samu",
    name: "SAMU 192 Águas Lindas",
    shortName: "SAMU",
    category: "saude",
    address: "Conjunto B, Área Especial 1, Setor 2, Águas Lindas de Goiás - GO",
    description: "Base do Serviço de Atendimento Móvel de Urgência. Emergência: 192.",
    keywords: ["samu", "192", "ambulancia", "emergencia", "saude"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/samu-servico-de-atendimento-movel-de-urgencia/",
    phone: "192",
    emergency: true,
  },
  {
    id: "rodoviaria-nelson-alves",
    name: "Rodoviária Nelson Alves de Sousa",
    shortName: "Rodoviária",
    category: "transporte",
    address: "Final da Avenida JK, Águas Lindas de Goiás - GO, ao lado da Feira do Jardim Brasília II",
    description: "Terminal municipal inaugurado pela Prefeitura, com atendimento de linhas municipais, interestaduais e para o Distrito Federal.",
    keywords: ["rodoviaria", "terminal", "onibus", "avenida jk", "transporte"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/rodoviaria-municipal/",
  },
  {
    id: "forum-justica-estadual",
    name: "Fórum da Justiça Estadual de Águas Lindas de Goiás",
    shortName: "Fórum",
    category: "justica",
    address: "Avenida N, Quadra 25, Lote 1, Jardim Querência, Águas Lindas de Goiás - GO, CEP 72910-000",
    description: "Fórum da Justiça Estadual, conforme referência institucional da OAB Goiás.",
    keywords: ["forum", "justiça", "judiciario", "tribunal", "oab"],
    sourceLabel: "OAB Goiás",
    sourceUrl: "https://www.oabgo.org.br/estrutura-salas-de-apoio/",
  },
  {
    id: "assistencia-social",
    name: "Secretaria Municipal de Assistência Social",
    shortName: "Assistência Social",
    category: "assistencia",
    address: "Quadra 53, Lote 1B, Jardim Brasília, Águas Lindas de Goiás - GO",
    description: "Secretaria municipal com atendimento da área de assistência social.",
    keywords: ["assistencia social", "social", "beneficios", "cras", "cidadania"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/",
  },
  {
    id: "cras-iii",
    name: "CRAS III — Praça da Cultura",
    shortName: "CRAS III",
    category: "assistencia",
    address: "Avenida 05, Quadra 0, Lote 01, Setor 11, Águas Lindas de Goiás - GO",
    description: "Centro de Referência de Assistência Social informado pela Prefeitura.",
    keywords: ["cras", "praça da cultura", "assistencia", "familia", "social"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/",
  },
  {
    id: "cras-santa-lucia",
    name: "CRAS II — Santa Lúcia",
    shortName: "CRAS Santa Lúcia",
    category: "assistencia",
    address: "Quadra 54, Área Especial, Santa Lúcia, Águas Lindas de Goiás - GO",
    description: "Centro de Referência de Assistência Social informado pela Prefeitura.",
    keywords: ["cras", "santa lucia", "assistencia", "familia", "social"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/",
  },
  {
    id: "secretaria-saude",
    name: "Secretaria Municipal de Saúde",
    shortName: "Secretaria de Saúde",
    category: "saude",
    address: "Área Especial 4, Avenida 02, Jardim Querência, Águas Lindas de Goiás - GO, CEP 72910-733",
    description: "Referência institucional para serviços da saúde municipal.",
    keywords: ["saude", "secretaria", "sus", "prefeitura"],
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/",
  },
];

export function searchOfflineDestinations(query: string, category: OfflineDestinationCategory | "todos" = "todos") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  return OFFLINE_DESTINATIONS.filter(destination => {
    if (category !== "todos" && destination.category !== category) return false;
    if (!normalized) return true;
    return [
      destination.name,
      destination.shortName,
      destination.address,
      destination.description,
      ...destination.keywords,
    ].some(value => value.toLocaleLowerCase("pt-BR").includes(normalized));
  });
}
