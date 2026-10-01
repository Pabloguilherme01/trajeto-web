import { matchesCatalogText, normalizeCatalogText } from "./catalogSearch";

export type PublicServiceCategory =
  "saude" | "seguranca" | "assistencia" | "transito" | "educacao" | "cidadania";

export type PublicService = {
  id: string;
  name: string;
  category: PublicServiceCategory;
  description: string;
  address?: string;
  phone?: string;
  extraPhone?: string;
  hours?: string;
  email?: string;
  actionUrl?: string;
  actionLabel?: string;
  guidance?: string;
  keywords?: string[];
  whatsappOnly?: string[];
  verifiedAt?: string;
  sourceLabel:
    | "Prefeitura de Águas Lindas"
    | "Polícia Civil de Goiás"
    | "SEDUC Goiás"
    | "SES-GO"
    | "SEAD Goiás"
    | "Ministério das Mulheres"
    | "Direitos Humanos e Cidadania"
    | "Saneago"
    | "Equatorial Goiás"
    | "Ministério do Trabalho e Emprego"
    | "INSS"
    | "Receita Federal";
  sourceUrl: string;
  mapQuery?: string;
};

export const PUBLIC_SERVICE_CATEGORIES: Array<{
  id: PublicServiceCategory | "todos";
  label: string;
  shortLabel: string;
}> = [
  { id: "todos", label: "Tudo", shortLabel: "Tudo" },
  { id: "saude", label: "Saúde", shortLabel: "Saúde" },
  { id: "seguranca", label: "Segurança", shortLabel: "Segurança" },
  { id: "assistencia", label: "Assistência", shortLabel: "Assistência" },
  { id: "transito", label: "Trânsito", shortLabel: "Trânsito" },
  { id: "educacao", label: "Educação", shortLabel: "Educação" },
  { id: "cidadania", label: "Cidadania", shortLabel: "Cidadania" },
];

const PREFEITURA_CONTATOS = "https://aguaslindasdegoias.go.gov.br/contatos/";
const TELEFONES_UTEIS = "https://aguaslindasdegoias.go.gov.br/telefones-uteis/";
const UPA =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/upa/";
const HMBJ =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/hospital-municipal-bom-jesus/";
const CAPS =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/caps-centro-de-atencao-psicossocial/";
const UNIDADES_SAUDE =
  "https://aguaslindasdegoias.go.gov.br/unidades-de-saude/";
const TRANSITO =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-transito-e-mobilidade-urbana/";
const CT =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/conselho-tutelar/";
const PCGO =
  "https://goias.gov.br/policiacivil/telefones-enderecos-e-horarios-de-atendimento/";
const SEDUC =
  "https://goias.gov.br/educacao/lista-de-escolas-rede-estadual-de-educacao/";
const ASSISTENCIA =
  "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/";
const HEAL = "https://goias.gov.br/saude/heal/";

export const PUBLIC_SERVICES: PublicService[] = [
  {
    id: "upa-mansoes-odisseia",
    name: "UPA Mansões Odisseia",
    category: "saude",
    description: "Atendimento de urgência e emergência municipal.",
    address:
      "Quadra 3B, Lote 1/3, Mansões Odisseia, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-1602",
    hours: "24 horas",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UPA,
    mapQuery: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO",
  },
  {
    id: "heal",
    name: "HEAL · Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho",
    category: "saude",
    description:
      "Hospital estadual de média e alta complexidade com pronto atendimento e linhas especializadas.",
    address:
      "Rua 19, nº 792-902, Parque da Barragem 9, Águas Lindas de Goiás - GO",
    phone: "(61) 3774-2660",
    hours: "Sempre aberto",
    sourceLabel: "SES-GO",
    sourceUrl: HEAL,
    mapQuery:
      "HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho, GO",
  },
  {
    id: "hospital-bom-jesus",
    name: "Hospital Municipal Bom Jesus",
    category: "saude",
    description: "Hospital municipal com atendimento contínuo.",
    address:
      "Q 109, Conjunto B, Lote 30/32, Setor 10, Águas Lindas de Goiás - GO",
    phone: "(61) 3548-7604",
    hours: "24 horas",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: HMBJ,
    mapQuery: "Hospital Municipal Bom Jesus, Águas Lindas de Goiás, GO",
  },
  {
    id: "caps",
    name: "CAPS · Centro de Atenção Psicossocial",
    category: "saude",
    description:
      "Atendimento municipal de saúde mental e acompanhamento psicossocial.",
    address:
      "Quadra 15, Loja 02, Lote 21, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-1559",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    email: "saude@aguaslindasdegoias.go.gov.br",
    guidance:
      "Entre em contato antes de sair para confirmar o atendimento indicado para sua necessidade.",
    keywords: [
      "caps",
      "saude mental",
      "psicologia",
      "psiquiatria",
      "atendimento psicossocial",
      "apoio psicologico",
    ],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: CAPS,
    mapQuery: "CAPS, Quadra 15, Loja 02, Lote 21, Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-saude",
    name: "Secretaria Municipal de Saúde",
    category: "saude",
    description: "Contato institucional e encaminhamentos da saúde municipal.",
    phone: "(61) 3618-4096 / (61) 99227-7937",
    email: "saude@aguaslindasdegoias.go.gov.br",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Saúde, Águas Lindas de Goiás, GO",
  },
  {
    id: "vigilancia-saude",
    keywords: [
      "vigilancia sanitaria",
      "vigilancia epidemiologica",
      "denuncia sanitaria",
      "surto",
      "dengue",
      "zoonoses",
    ],
    name: "Vigilância em Saúde",
    category: "saude",
    description:
      "Orientação e atendimento municipal de vigilância em saúde, incluindo demandas sanitárias e epidemiológicas.",
    address:
      "Avenida Brasília, Quadra 109, Lote 30/32, Conjunto B, Setor 10, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-1409",
    email: "saude@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, das 08h às 12h e das 13h às 17h",
    guidance:
      "Entre em contato antes de sair para confirmar o setor responsável pela sua demanda.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-saude-2/vigilancia-em-saude/",
    mapQuery:
      "Vigilância em Saúde, Avenida Brasília, Quadra 109, Lote 30/32, Setor 10, Águas Lindas de Goiás, GO",
  },
  {
    id: "unidades-saude",
    name: "Unidades de Saúde do município",
    category: "saude",
    description: "Lista oficial com Hospital, ESF e UBS de Águas Lindas.",
    address: "Diversas unidades na cidade",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-aguas-bonitas",
    name: "ESF Águas Bonitas",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua 08, Quadra 33, Lote 27, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Águas Bonitas, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-aguas-lindas-ii",
    name: "ESF Águas Lindas II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua J, Setor 06, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Águas Lindas II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-america",
    name: "ESF América",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 17, Lote 31/32, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF América, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-barragem-ii",
    name: "UBS Barragem II",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Quadra 58, Lote 03/05, Barragem II, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Barragem II, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-barragem-iv",
    name: "UBS Barragem IV",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Barragem IV, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Barragem IV, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-barragem-v",
    name: "ESF Barragem V",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Avenida Goiás, Quadra 06, Lote 20, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Barragem V, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-camping-club",
    name: "ESF Camping Club",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Rua 17, Quadra 19, Lote 20, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Camping Club, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-cidade-entorno",
    name: "ESF Cidade do Entorno",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 50, Lote 48, Casa 02, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Cidade do Entorno, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-coimbra",
    name: "ESF Coimbra",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address:
      "Quadra P, Lote 01, Chácara 10, Casa 03, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Coimbra, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-guaira",
    name: "ESF Guaíra",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 5, Área Especial, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Guaíra, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-jardim-paraiso",
    name: "UBS Jardim Paraíso",
    category: "saude",
    description: "Unidade básica de saúde municipal.",
    address: "Quadra 13, Área Especial, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Jardim Paraíso, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-laranjeiras",
    name: "ESF Laranjeiras",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra B3, Lote 21, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Laranjeiras, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-padre-lucio",
    name: "ESF Padre Lúcio",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Área Especial P. Militar, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Padre Lúcio, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-perola-ii",
    name: "ESF Pérola II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Área Especial Setor Village, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Pérola II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-pinheiro-i",
    name: "ESF Pinheiro I",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 07, Lote 13, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Pinheiro I, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-setor-ii",
    name: "ESF Setor II",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 33, Conjunto B, Lote 33B, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Setor II, Águas Lindas de Goiás, GO",
  },
  {
    id: "esf-setor-09",
    name: "ESF Setor 09",
    category: "saude",
    description: "Unidade da rede municipal de saúde.",
    address: "Quadra 72, Lote 37, Setor 09, Águas Lindas de Goiás - GO",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "ESF Setor 09, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-santa-lucia",
    keywords: ["ubs santa lucia", "posto saude santa lucia", "saude santa lucia"],
    name: "UBS Santa Lúcia",
    category: "saude",
    description: "Unidade básica de saúde municipal no bairro Santa Lúcia.",
    address: "Quadra 56, Lote 07, Rua Monte Cassino, Santa Lúcia, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-6530",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    guidance: "Entre em contato antes de sair para confirmar o atendimento indicado para sua necessidade.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Santa Lúcia, Quadra 56, Lote 07, Rua Monte Cassino, Águas Lindas de Goiás, GO",
  },
  {
    id: "ubs-setor-10",
    keywords: ["ubs setor 10", "posto saude setor 10", "saude setor 10"],
    name: "UBS Setor 10",
    category: "saude",
    description: "Unidade básica de saúde municipal no Setor 10.",
    address: "Quadra 109, Conjunto B, Lote 31, Setor 10, Águas Lindas de Goiás - GO",
    phone: "(61) 3613-9605",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    guidance: "Entre em contato antes de sair para confirmar o atendimento indicado para sua necessidade.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: UNIDADES_SAUDE,
    mapQuery: "UBS Setor 10, Quadra 109, Conjunto B, Lote 31, Setor 10, Águas Lindas de Goiás, GO",
  },
  {
    id: "policia-civil-1",
    name: "1ª Delegacia de Polícia de Águas Lindas",
    category: "seguranca",
    description:
      "Unidade da Polícia Civil para registros e atendimento policial.",
    address:
      "Rua Adélia, Quadra 3, Área Especial, Setor Sol Nascente, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-2716",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: PCGO,
    mapQuery: "1ª Delegacia de Polícia de Águas Lindas de Goiás",
  },
  {
    id: "pcgo-17-drp",
    name: "17ª Delegacia Regional de Polícia",
    category: "seguranca",
    description:
      "Delegacia regional da Polícia Civil com atendimento em Águas Lindas.",
    address: "Jardim Pérola II, Quadra 55, Lote 08, Águas Lindas de Goiás - GO",
    phone: "(61) 3618-7202",
    extraPhone: "(62) 99506-5190",
    sourceLabel: "Polícia Civil de Goiás",
    sourceUrl: PCGO,
    mapQuery: "17ª Delegacia Regional de Polícia, Águas Lindas de Goiás, GO",
  },
  {
    id: "policia-militar",
    name: "Polícia Militar / COPOM",
    category: "seguranca",
    description: "Canal de atendimento policial e emergência.",
    phone: "190",
    extraPhone: "(61) 3613-2517 / (61) 3613-1190",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Polícia Militar, Águas Lindas de Goiás, GO",
  },
  {
    id: "bombeiros",
    name: "Corpo de Bombeiros",
    category: "seguranca",
    description: "Emergências de incêndio, resgate e salvamento.",
    phone: "193",
    extraPhone: "(61) 3618-2069",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Corpo de Bombeiros, Águas Lindas de Goiás, GO",
  },
  {
    id: "conselho-tutelar",
    name: "Conselho Tutelar",
    category: "assistencia",
    description:
      "Proteção de crianças e adolescentes e recebimento de denúncias.",
    address: "Quadra 11, Lote 13, Jardim Querência, Águas Lindas de Goiás - GO",
    phone: "(61) 99303-8040",
    extraPhone: "(61) 99303-9204",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: CT,
    mapQuery: "Conselho Tutelar, Jardim Querência, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-1",
    name: "CRAS I · Jardim Brasília",
    category: "assistencia",
    description:
      "Atendimento da assistência social para famílias e benefícios.",
    address: "Quadra 53, Lote 1B, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99294-2109",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/centro-de-referencia-da-assistencia-social-cras-i-jardim-brasilia/",
    mapQuery: "CRAS I Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "cadunico",
    name: "Cadastro Único / Bolsa Família",
    category: "assistencia",
    description: "Atendimento municipal do Cadastro Único e do Bolsa Família.",
    address:
      "Avenida Perimetral, Quadra 113, loja 09, Pérola 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99302-9284",
    email: "cadunico@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Entre em contato antes de sair para confirmar os documentos e a forma de atendimento.",
    keywords: [
      "cadunico",
      "cad unico",
      "cadastrar atualizar cadastro unico",
      "bolsa familia",
    ],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "Cadastro Único, Avenida Perimetral, Quadra 113, loja 09, Pérola 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-2",
    name: "CRAS II · Santa Lúcia",
    category: "assistencia",
    description:
      "Unidade municipal de assistência social e orientação às famílias.",
    address:
      "Quadra 54, Área Especial, Santa Lúcia, Águas Lindas de Goiás - GO",
    phone: "(61) 99294-8823",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Confirme por telefone qual unidade atende seu bairro antes de sair.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "CRAS II, Quadra 54, Área Especial, Santa Lúcia, Águas Lindas de Goiás, GO",
  },
  {
    id: "cras-3",
    name: "CRAS III · Praça da Cultura",
    category: "assistencia",
    description: "Unidade municipal de assistência social no Setor 11.",
    address:
      "Avenida 05, Quadra 0, Lote 01, Setor 11, Águas Lindas de Goiás - GO",
    phone: "(61) 99295-2076",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Confirme por telefone qual unidade atende seu bairro antes de sair.",
    keywords: ["cras ceu"],
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery:
      "CRAS III Praça da Cultura, Avenida 05, Quadra 0, Lote 01, Setor 11, Águas Lindas de Goiás, GO",
  },
  {
    id: "creas",
    name: "CREAS · proteção social",
    category: "assistencia",
    description:
      "Atendimento especializado da assistência social para pessoas em situação de violência ou violação de direitos.",
    address: "Quadra 42, Casa 51, Setor 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99296-0392",
    email: "creas@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    guidance:
      "Entre em contato para orientação sobre o atendimento. Em emergência policial, ligue 190.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: ASSISTENCIA,
    mapQuery: "CREAS, Quadra 42, Casa 51, Setor 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "transito-mobilidade",
    name: "Secretaria de Trânsito e Mobilidade Urbana",
    category: "transito",
    description: "Atendimento municipal de trânsito, mobilidade e agentes.",
    address:
      "Quadra 45, Lote 01, Área Pública, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 92003-6668",
    extraPhone: "(61) 92003-6674",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TRANSITO,
    mapQuery:
      "Secretaria de Trânsito e Mobilidade Urbana, Águas Lindas de Goiás, GO",
  },
  {
    id: "superintendencia-transito",
    name: "Superintendência Municipal de Trânsito",
    category: "transito",
    description: "Atendimento e operação municipal de trânsito.",
    address:
      "Quadra 45, Lote 01, Área Pública, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99310-4493",
    extraPhone: "(61) 99310-4219",
    hours: "Segunda a sexta, 08h às 12h e 13h às 17h",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-transito-e-mobilidade-urbana/superintendencia-municipal-de-transito/",
    mapQuery:
      "Superintendência Municipal de Trânsito, Águas Lindas de Goiás, GO",
  },
  {
    id: "educacao-estado",
    name: "Rede Estadual de Educação",
    category: "educacao",
    description:
      "Lista oficial de escolas estaduais, com logradouro e município.",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "escolas estaduais, Águas Lindas de Goiás, GO",
  },
  {
    id: "cepi-juscelino",
    name: "CEPI Juscelino Kubitschek de Oliveira",
    category: "educacao",
    description: "Centro estadual em período integral.",
    address:
      "Rua Mansões Odisseia, Parque Mansões Odisseia, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery:
      "CEPI Juscelino Kubitschek de Oliveira, Águas Lindas de Goiás, GO",
  },
  {
    id: "coralina",
    name: "Colégio Estadual Cora Coralina",
    category: "educacao",
    description: "Colégio estadual com Ensino Fundamental e Ensino Médio.",
    address:
      "Rua 38, esq. com 4ª Avenida, Mansões Village, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "Colégio Estadual Cora Coralina, Águas Lindas de Goiás, GO",
  },
  {
    id: "pm-go-aguas-lindas",
    name: "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas",
    category: "educacao",
    description: "Unidade estadual de educação vinculada à rede da SEDUC.",
    address:
      "Quadra 31, Área Especial, Avenida 02/03, Águas Lindas I, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery:
      "Colégio Estadual da Polícia Militar de Goiás de Águas Lindas, GO",
  },
  {
    id: "paulo-freire",
    name: "Colégio Estadual Paulo Freire",
    category: "educacao",
    description: "Colégio estadual com Ensino Fundamental e Ensino Médio.",
    address:
      "Área Especial I, Quadra 53, Lote 01-H, Jardim Brasília, Águas Lindas de Goiás - GO",
    sourceLabel: "SEDUC Goiás",
    sourceUrl: SEDUC,
    mapQuery: "Colégio Estadual Paulo Freire, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-educacao",
    name: "Secretaria Municipal de Educação",
    category: "educacao",
    description: "Atendimento da rede municipal de educação.",
    phone: "(61) 92002-3791 / (61) 92002-3483",
    extraPhone: "(61) 92002-3774",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Educação, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-assistencia-social",
    name: "Secretaria Municipal de Assistência Social",
    category: "assistencia",
    description: "Atendimento e programas da assistência social municipal.",
    phone: "(61) 99291-2169 / (61) 99297-9283",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Assistência Social, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-mulher",
    name: "Secretaria Municipal da Mulher",
    category: "assistencia",
    description:
      "Atendimento municipal para políticas públicas da mulher e família.",
    phone: "(61) 99304-8456",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal da Mulher, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-fazenda",
    whatsappOnly: ["(61) 92005-3453", "(61) 99305-7551"],
    name: "Secretaria Municipal de Fazenda e Planejamento",
    category: "cidadania",
    description: "Atendimento tributário e de planejamento municipal.",
    phone: "(61) 99303-3717",
    extraPhone: "ITBI: (61) 92005-3453 · Nota Fiscal/ISS: (61) 99305-7551",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Fazenda e Planejamento, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-administracao",
    name: "Secretaria Municipal de Administração",
    category: "cidadania",
    description: "Atendimento da administração municipal.",
    phone: "(61) 99306-5878",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Administração, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-infraestrutura",
    name: "Secretaria Municipal de Infraestrutura e Obras",
    category: "cidadania",
    description: "Atendimento municipal para infraestrutura e obras.",
    phone: "(61) 99303-4608",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Infraestrutura e Obras, Águas Lindas de Goiás, GO",
  },
  {
    id: "iluminacao-publica",
    keywords: [
      "lampada apagada",
      "poste sem luz",
      "iluminacao de rua",
      "luz da rua",
      "manutencao de poste",
    ],
    name: "Iluminação Pública",
    category: "cidadania",
    description:
      "Departamento municipal responsável por demandas de iluminação pública.",
    address: "Área Especial, Quadra 31, Setor 02, Águas Lindas de Goiás - GO",
    phone: "(61) 9311-8672",
    email: "infraeobras@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, das 08h às 12h e das 13h às 17h",
    guidance:
      "Informe o endereço e um ponto de referência do poste ou trecho com problema.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-infraestrutura-e-obras/departamento-de-iluminacao-publica/",
    mapQuery:
      "Departamento de Iluminação Pública, Área Especial, Quadra 31, Setor 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "limpeza-urbana",
    keywords: [
      "coleta de lixo",
      "lixo",
      "varricao",
      "rocagem",
      "podagem",
      "limpeza de rua",
      "entulho",
    ],
    name: "Limpeza e Varrição Urbana",
    category: "cidadania",
    description:
      "Canal municipal para limpeza pública, coleta, varrição, roçagem e podagem.",
    address: "Área Especial, Quadra 31, Setor 02, Águas Lindas de Goiás - GO",
    phone: "(61) 99303-4608",
    email: "infraeobras@aguaslindasdegoias.go.gov.br",
    hours: "Segunda a sexta, das 08h às 12h e das 13h às 17h",
    guidance:
      "Informe rua, bairro e ponto de referência. Para ocorrências específicas, confirme o encaminhamento com a Secretaria de Infraestrutura e Obras.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-infraestrutura-e-obras/",
    mapQuery:
      "Secretaria Municipal de Infraestrutura e Obras, Área Especial, Quadra 31, Setor 02, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-meio-ambiente",
    name: "Secretaria Municipal de Meio Ambiente",
    category: "cidadania",
    description: "Atendimento municipal relacionado ao meio ambiente.",
    phone: "(61) 99451-0844",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Meio Ambiente, Águas Lindas de Goiás, GO",
  },
  {
    id: "secretaria-habitacao",
    name: "Secretaria Municipal de Habitação",
    category: "cidadania",
    description: "Atendimento municipal sobre habitação.",
    phone: "(61) 99303-6552",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Secretaria Municipal de Habitação, Águas Lindas de Goiás, GO",
  },
  {
    id: "regularizacao-fundiaria",
    name: "Secretaria Municipal de Regularização Fundiária",
    category: "cidadania",
    description: "Atendimento municipal sobre regularização fundiária.",
    phone: "(61) 99310-0216",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Regularização Fundiária, Águas Lindas de Goiás, GO",
  },
  {
    id: "desenvolvimento-economico",
    name: "Secretaria Municipal de Desenvolvimento Econômico",
    category: "cidadania",
    description:
      "Atendimento e programas municipais para desenvolvimento econômico.",
    phone: "(61) 99649-2690 / (61) 99310-6862",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery:
      "Secretaria Municipal de Desenvolvimento Econômico, Águas Lindas de Goiás, GO",
  },
  {
    id: "ouvidoria-sus",
    name: "Ouvidoria SUS",
    category: "saude",
    description: "Canal de atendimento e manifestação do SUS no município.",
    phone: "(61) 3902-1097",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Ouvidoria SUS Águas Lindas de Goiás, GO",
  },
  {
    id: "camara-municipal",
    name: "Câmara Municipal de Vereadores",
    category: "cidadania",
    description: "Atendimento institucional do Legislativo municipal.",
    phone: "(61) 3618-2512",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Câmara Municipal de Águas Lindas de Goiás, GO",
  },
  {
    id: "forum",
    name: "Fórum de Águas Lindas",
    category: "cidadania",
    description: "Atendimento do Poder Judiciário no município.",
    phone: "(61) 3617-2600",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Fórum de Águas Lindas de Goiás, GO",
  },
  {
    id: "funpreval",
    name: "FUNPREVAL",
    category: "cidadania",
    description: "Fundo de Previdência Municipal de Águas Lindas de Goiás.",
    phone: "(61) 3618-5814",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "FUNPREVAL Águas Lindas de Goiás, GO",
  },
  {
    id: "sebrae",
    name: "SEBRAE",
    category: "cidadania",
    description:
      "Canal de apoio e atendimento empresarial listado pela Prefeitura.",
    phone: "(61) 3902-1135",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "SEBRAE Águas Lindas de Goiás, GO",
  },
  {
    id: "energia",
    keywords: [
      "falta de luz",
      "sem luz",
      "sem energia",
      "queda de energia",
      "segunda via conta luz",
    ],
    name: "Equatorial Goiás · energia",
    category: "cidadania",
    description:
      "Central estadual para falta de energia, contas e atendimento da distribuidora.",
    phone: "0800 062 0196",
    hours: "24 horas, todos os dias",
    sourceLabel: "Equatorial Goiás",
    sourceUrl: "https://go.equatorialenergia.com.br/canais-de-atendimento/",
    actionUrl: "https://go.equatorialenergia.com.br/canais-de-atendimento/",
    actionLabel: "Falta de luz e segunda via",
    guidance:
      "Tenha o número da unidade consumidora e o endereço em mãos. Guarde o protocolo do atendimento.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "defesa-civil",
    keywords: ["defesa civil", "alagamento", "enchente", "desabamento", "risco estrutural"],
    name: "Proteção e atendimento de emergência",
    category: "seguranca",
    description:
      "Use 193 para incêndio, resgate e salvamento e 190 para emergência policial.",
    phone: "193",
    extraPhone: "190",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
  },
  {
    id: "carteira-trabalho-digital",
    name: "Carteira de Trabalho Digital",
    category: "cidadania",
    description: "Acesso à carteira de trabalho e aos contratos registrados pelo portal oficial.",
    phone: "158",
    sourceLabel: "Ministério do Trabalho e Emprego",
    sourceUrl: "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho",
    actionUrl: "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho",
    actionLabel: "Acessar Carteira de Trabalho",
    guidance: "Use sua conta gov.br no portal oficial. O acesso digital exige internet. Para dúvidas, consulte a Central 158.",
    keywords: ["ctps", "carteira de trabalho", "contrato de trabalho", "documento trabalhador"],
    verifiedAt: "01/10/2026",
  },
  {
    id: "meu-inss",
    name: "Meu INSS · benefícios e extratos",
    category: "assistencia",
    description: "Canal oficial para pedidos, acompanhamento de benefícios e extratos previdenciários, como o CNIS.",
    phone: "135",
    hours: "Central 135: segunda a sábado, 7h–22h (Brasília)",
    sourceLabel: "INSS",
    sourceUrl: "https://www.gov.br/inss/pt-br/canais_atendimento/meu-inss/meu-inss",
    actionUrl: "https://meu.inss.gov.br/",
    actionLabel: "Acessar Meu INSS",
    guidance: "Entre com sua conta gov.br somente no portal oficial. Consultas e solicitações online exigem internet; a Central 135 precisa de rede telefônica. A análise do pedido cabe ao INSS.",
    keywords: ["aposentadoria", "pensão", "previdencia", "cnis", "extrato contribuição", "beneficio inss"],
    verifiedAt: "01/10/2026",
  },
  {
    id: "prefeitura",
    name: "Prefeitura de Águas Lindas de Goiás",
    category: "cidadania",
    description:
      "Portal institucional, contatos, serviços e atendimento ao cidadão.",
    address:
      "Área Especial 4, Avenida 2, Jardim Querência, Águas Lindas de Goiás - GO, CEP 72910-733",
    phone: "(61) 3618-4007",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: PREFEITURA_CONTATOS,
    mapQuery: "Prefeitura de Águas Lindas de Goiás",
  },
  {
    id: "sic",
    name: "Serviço de Informação ao Cidadão · SIC",
    category: "cidadania",
    description:
      "Solicite informações públicas e acompanhe a resposta pelo canal oficial.",
    address:
      "Área Especial 4, Avenida 2, Jardim Querência, Águas Lindas de Goiás - GO",
    phone: "(61) 99306-3637",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    email: "sic@aguaslindasdegoias.go.gov.br",
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/servico-de-informacao-ao-cidadao/",
    actionLabel: "Pedir informação",
    guidance:
      "Abra SIC online na página oficial e guarde o protocolo para acompanhar a resposta.",
    verifiedAt: "01/10/2026",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/servico-de-informacao-ao-cidadao/",
    mapQuery: "Serviço de Informação ao Cidadão, Águas Lindas de Goiás, GO",
  },
  {
    id: "ouvidoria-municipal",
    keywords: ["reclamacao", "reclamar", "problema servico publico"],
    name: "Ouvidoria Municipal",
    category: "cidadania",
    description:
      "Canal para reclamações, sugestões, elogios e denúncias sobre serviços públicos.",
    address: "Quadra 47, Lote 12, Jardim Brasília, Águas Lindas de Goiás - GO",
    phone: "(61) 99306-3637",
    hours: "Segunda a sexta, 8h–12h e 13h–17h",
    email: "ouvidoria@aguaslindasdegoias.go.gov.br",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/gabinete-do-prefeito/ouvidoria-municipal/",
    actionUrl:
      "https://aguaslindasdegoias.go.gov.br/estrutura/gabinete-do-prefeito/ouvidoria-municipal/",
    actionLabel: "Abrir canal oficial",
    guidance:
      "Descreva o serviço, o local e a data do problema. Guarde o protocolo do canal oficial.",
    verifiedAt: "01/10/2026",
    mapQuery:
      "Ouvidoria Municipal, Quadra 47, Lote 12, Jardim Brasília, Águas Lindas de Goiás, GO",
  },
  {
    id: "procon",
    name: "Procon Águas Lindas",
    category: "cidadania",
    description: "Atendimento ao consumidor e orientação sobre direitos.",
    phone: "(61) 3616-1133",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Procon Águas Lindas de Goiás, GO",
  },
  {
    id: "saneago",
    keywords: [
      "falta de agua",
      "sem agua",
      "segunda via conta agua",
      "vazamento",
    ],
    name: "Saneago · água e esgoto",
    category: "cidadania",
    description:
      "Central de atendimento para abastecimento de água, esgoto e serviços da conta.",
    phone: "0800 645 0115",
    hours: "24 horas, todos os dias",
    sourceLabel: "Saneago",
    sourceUrl: "https://www.saneago.com.br/site",
    actionUrl: "https://agencia-virtual.saneago.com.br/",
    actionLabel: "Abrir agência virtual",
    guidance:
      "Tenha a matrícula da conta e o endereço do imóvel para solicitar atendimento e guarde o protocolo.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "receita-federal-pav",
    keywords: [
      "receita federal",
      "cpf",
      "cnpj",
      "imposto de renda",
      "regularizacao fiscal",
      "certidao federal",
      "pav",
    ],
    name: "Receita Federal · ponto conveniado",
    category: "cidadania",
    description:
      "Ponto de atendimento conveniado da Receita Federal em Águas Lindas de Goiás.",
    sourceLabel: "Receita Federal",
    sourceUrl:
      "https://www.gov.br/receitafederal/pt-br/canais_atendimento/fale-conosco/presencial/go/aguas-lindas-de-goias",
    actionUrl:
      "https://www.gov.br/receitafederal/pt-br/canais_atendimento/fale-conosco/presencial/go/aguas-lindas-de-goias",
    actionLabel: "Consultar atendimento oficial",
    guidance:
      "Consulte a página oficial antes de sair para confirmar os serviços disponíveis e eventual necessidade de agendamento. O Trajeto não publica endereço ou horário sem confirmação oficial.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "vapt-vupt",
    keywords: [
      "tre",
      "titulo eleitor",
      "sine",
      "emprego",
      "inss",
      "saneago",
      "junta militar",
      "servico militar",
      "ipasgo",
      "agehab",
      "agrodefesa",
      "detran",
      "expresso",
      "seguranca publica",
    ],
    name: "Vapt Vupt",
    category: "cidadania",
    description:
      "Unidade com atendimento de órgãos como Detran, INSS, Saneago e SINE.",
    address:
      "Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás - GO, 72910-000",
    hours: "Segunda a sexta, 8h–17h; sem atendimento aos sábados",
    sourceLabel: "SEAD Goiás",
    sourceUrl:
      "https://www.vaptvupt.goias.gov.br/unidade/aguas-lindas-de-goias",
    actionUrl:
      "https://www.vaptvupt.goias.gov.br/unidade/aguas-lindas-de-goias",
    actionLabel: "Agendar atendimento",
    guidance:
      "Use Agendamento no portal oficial e consulte os documentos exigidos pelo serviço antes de sair.",
    verifiedAt: "01/10/2026",
    mapQuery:
      "Vapt Vupt, Rua Um, 2210, Jardim da Barragem IV, Águas Lindas de Goiás, GO",
  },
  {
    id: "detran",
    name: "Detran-GO",
    category: "transito",
    description:
      "Canal local listado pela Prefeitura para atendimento do Detran.",
    phone: "(61) 3613-4058",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "Detran-GO, Águas Lindas de Goiás, GO",
  },
  {
    id: "samu",
    name: "SAMU",
    category: "saude",
    description:
      "Atendimento móvel de urgência. Em emergência, acione o serviço.",
    phone: "192",
    extraPhone: "(61) 3618-2013",
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: TELEFONES_UTEIS,
    mapQuery: "SAMU, Águas Lindas de Goiás, GO",
  },
  {
    id: "ligue-180",
    name: "Ligue 180 · atendimento à mulher",
    category: "assistencia",
    description:
      "Canal nacional gratuito de orientação e registro de denúncias de violência contra mulheres.",
    phone: "180",
    hours: "24 horas, todos os dias",
    email: "central180@mulheres.gov.br",
    sourceLabel: "Ministério das Mulheres",
    sourceUrl: "https://www.gov.br/mulheres/pt-br/ligue180",
    actionUrl: "https://www.gov.br/mulheres/pt-br/ligue180",
    actionLabel: "Consultar canais de atendimento",
    guidance:
      "O serviço orienta sobre a rede de proteção. Em emergência policial, ligue 190.",
    verifiedAt: "01/10/2026",
  },
  {
    id: "disque-100",
    name: "Disque 100 · direitos humanos",
    category: "assistencia",
    description:
      "Canal nacional gratuito para denúncias de violações de direitos de crianças, idosos, pessoas com deficiência e outros grupos.",
    phone: "100",
    hours: "24 horas, todos os dias",
    email: "ouvidoria@mdh.gov.br",
    sourceLabel: "Direitos Humanos e Cidadania",
    sourceUrl:
      "https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos",
    actionUrl:
      "https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos",
    actionLabel: "Consultar canais acessíveis",
    guidance:
      "O portal oficial inclui chat e videochamada em Libras. Descreva a ocorrência, o local e quem precisa de proteção.",
    verifiedAt: "01/10/2026",
  },
];

export const PUBLIC_SERVICE_SHORTCUTS = [
  { label: "Saúde mental / CAPS", query: "saude mental", hint: "Atendimento psicossocial municipal" },
  { label: "Dengue e Vigilância", query: "dengue", hint: "Vigilância em Saúde" },
  { label: "Conselho Tutelar", query: "conselho tutelar", hint: "Proteção de crianças e adolescentes" },
  { label: "Água e segunda via", query: "conta agua", hint: "Saneago" },
  { label: "Falta de luz", query: "falta luz", hint: "Equatorial Goiás" },
  {
    label: "Iluminação pública",
    query: "lampada apagada",
    hint: "Poste ou trecho sem luz",
  },
  {
    label: "Limpeza e coleta",
    query: "coleta lixo",
    hint: "Limpeza, varrição e coleta",
  },
  {
    label: "CadÚnico e benefícios",
    query: "cadunico",
    hint: "Cadastro Único / Bolsa Família",
  },
  {
    label: "Assistência à família",
    query: "cras",
    hint: "Veja as três unidades",
  },
  {
    label: "Agendar Vapt Vupt",
    query: "vapt vupt",
    hint: "Canal oficial de agendamento",
  },
  {
    label: "CPF e Receita Federal",
    query: "receita federal",
    hint: "Ponto conveniado oficial",
  },
  {
    label: "Reclamação municipal",
    query: "ouvidoria municipal",
    hint: "Ouvidoria e orientação",
  },
] as const;

export function searchPublicServices(
  query = "",
  category: PublicServiceCategory | "todos" = "todos"
) {
  // Citizens search for a need rather than an agency name. Ignore only linking
  // words; keep every substantive word so specific needs remain specific.
  const search = normalizeCatalogText(query)
    .split(" ")
    .filter(
      term => !["de", "da", "do", "das", "dos", "e", "para"].includes(term)
    )
    .join(" ");
  return PUBLIC_SERVICES.filter(service => {
    if (category !== "todos" && service.category !== category) return false;
    return matchesCatalogText(search, [
      service.name,
      service.description,
      service.address,
      service.phone,
      service.extraPhone,
      service.category,
      service.guidance,
      service.actionLabel,
      service.hours,
      ...(service.keywords ?? []),
    ]);
  });
}
