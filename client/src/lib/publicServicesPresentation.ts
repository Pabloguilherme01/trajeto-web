import {
  ArrowRight,
  Search,
  Scale,
  Accessibility,
  ReceiptText,
  Leaf,
  Smartphone,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  BadgeCheck,
  BookOpen,
  Building2,
  BriefcaseBusiness,
  Wrench,
  Clock3,
  Globe2,
  ExternalLink,
  Heart,
  HeartPulse,
  Landmark,
  MapPinned,
  MessageCircle,
  Route,
  Sparkles,
  Phone,
  Share2,
  ShieldAlert,
  Siren,
  TrafficCone,
  Store,
  Trophy,
  Zap,
  WifiOff,
  Navigation,
  PawPrint,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { publicServiceContacts } from "@/lib/contactActions";
import {
  PUBLIC_SERVICES,
  type PublicServiceCategory,
} from "@/lib/publicServices";
import { ALL_LOCAL_ROUTE_DESTINATIONS } from "@/lib/localRoutePresets";
export const categoryIcons = {
  saude: HeartPulse,
  seguranca: ShieldAlert,
  assistencia: Siren,
  obitos: Heart,
  transito: TrafficCone,
  educacao: BookOpen,
  "ensino-superior": BookOpen,
  capacitacao: BookOpen,
  financas: Landmark,
  cidadania: Landmark,
  trabalho: BriefcaseBusiness,
  moradia: Building2,
  "servicos-urbanos": Wrench,
  justica: Scale,
  digital: Smartphone,
  ambiente: Leaf,
  agricultura: Leaf,
  consumidor: ShoppingBag,
  tributos: ReceiptText,
  inclusao: Accessibility,
  mulher: Heart,
  animais: PawPrint,
  idoso: UsersRound,
  empreendedor: Store,
  licenciamento: ReceiptText,
  cultura: Sparkles,
  esporte: Trophy,
  juventude: BadgeCheck,
  transparencia: Globe2,
  "agua-energia": Zap,
  telecom: Phone,
  previdencia: ReceiptText,
  documentos: BadgeCheck,
} satisfies Record<PublicServiceCategory, LucideIcon>;

export const SERVICE_SUMMARY = {
  contacts: PUBLIC_SERVICES.filter(
    service => publicServiceContacts(service).length > 0
  ).length,
  routes: PUBLIC_SERVICES.filter(service => Boolean(service.mapQuery)).length,
  online: PUBLIC_SERVICES.filter(service => Boolean(service.actionUrl)).length,
  verified: PUBLIC_SERVICES.filter(service => Boolean(service.verifiedAt))
    .length,
} as const;

export const SERVICE_BATCH_SIZE = 18;

export const SERVICE_CATEGORY_COUNTS = PUBLIC_SERVICES.reduce<
  Record<string, number>
>((counts, service) => {
  counts[service.category] = (counts[service.category] ?? 0) + 1;
  return counts;
}, {});

export const NEED_GROUPS = [
  {
    label: "Documentos pessoais",
    query: "documentos",
    hint: "CIN, CNH Digital, título, CTPS e antecedentes",
  },
  {
    label: "Família e benefícios",
    query: "cadunico",
    hint: "CadÚnico, CRAS, benefícios e Passe Livre PCD",
  },
  {
    label: "Proteger criança ou adolescente",
    query: "conselho tutelar",
    hint: "Denúncias, maus-tratos, abandono e orientação às famílias",
  },
  {
    label: "Perdi um familiar",
    query: "auxilio funeral",
    hint: "Auxílio funeral, orientação sobre óbito e sepultamento",
  },
  {
    label: "Saúde perto de você",
    query: "ubs",
    hint: "UBS, ESF, urgência, vigilância e saúde digital",
  },
  {
    label: "Vigilância e saúde pública",
    query: "vigilancia sanitaria",
    hint: "Dengue, surtos, fiscalização sanitária, ambiente e saúde do trabalhador",
  },
  {
    label: "Educação e creche",
    query: "creche",
    hint: "Creches, vagas, matrículas e escolas",
  },
  {
    label: "Faculdade e bolsas de estudo",
    query: "ensino superior",
    hint: "Sisu, bolsas do Prouni e financiamento do Fies no MEC",
  },
  {
    label: "Transporte escolar",
    query: "transporte escolar",
    hint: "Rotas, pontos, horários e orientação da rede municipal",
  },
  {
    label: "Aprender e se qualificar",
    query: "cursos gratuitos",
    hint: "Cursos online do MEC e da Escola Virtual de Governo",
  },
  {
    label: "Trabalho e renda",
    query: "emprego",
    hint: "Emprego, seguro-desemprego e empreendedorismo",
  },
  {
    label: "Moradia e regularização",
    query: "regularizacao fundiaria",
    hint: "Habitação, regularização e atendimento municipal",
  },
  {
    label: "Cidade e manutenção",
    query: "buraco",
    hint: "Iluminação, vias, limpeza, bueiros e manutenção urbana",
  },
  {
    label: "Agricultura e produtor rural",
    query: "agricultura",
    hint: "Agricultura familiar, abastecimento e orientação ao produtor",
  },
  {
    label: "Segurança e proteção",
    query: "delegacia",
    hint: "Delegacia, ocorrência e atendimento policial",
  },
  {
    label: "Tributos e notas",
    query: "nota fiscal iss",
    hint: "Nota Fiscal, ISS, ITBI e atendimento fazendário",
  },
  {
    label: "Inclusão e acessibilidade",
    query: "pcd",
    hint: "PCD, Ciptea, Passe Livre e igualdade racial",
  },
  {
    label: "Mulher e proteção",
    query: "mulher",
    hint: "Secretaria da Mulher, Ligue 180 e atendimento especializado",
  },
  {
    label: "Violência doméstica ou ameaça",
    query: "violencia domestica",
    hint: "Ligue 180, atendimento especializado e emergência policial",
  },
  {
    label: "Denunciar violação de direitos",
    query: "direitos humanos",
    hint: "Disque 100, abuso infantil, idosos, PCD, racismo e LGBT+",
  },
  {
    label: "Animais e zoonoses",
    query: "zoonoses",
    hint: "Castração, animais soltos e Vigilância em Saúde",
  },
  {
    label: "Pessoa idosa",
    query: "idoso",
    hint: "CMDI, CCI, carteira da pessoa idosa e direitos",
  },
  {
    label: "Empreender e abrir empresa",
    query: "mei",
    hint: "Sala do Empreendedor, MEI, CNPJ e desenvolvimento econômico",
  },
  {
    label: "Licenças e alvarás",
    query: "alvara funcionamento",
    hint: "Funcionamento, construção, loteamento e licença sanitária",
  },
  {
    label: "Construir ou reformar",
    query: "alvara construcao",
    hint: "Alvará de obra, ampliação, demolição e loteamento",
  },
  {
    label: "Cultura e eventos",
    query: "cultura",
    hint: "Agentes, editais, mapa, calendário e atendimento cultural",
  },
  {
    label: "Esporte e lazer",
    query: "esporte",
    hint: "Projetos, modalidades e atendimento da Secretaria",
  },
  {
    label: "Juventude e primeiro emprego",
    query: "jovem",
    hint: "ID Jovem, aprendizagem profissional e orientação municipal",
  },
  {
    label: "Transparência e participação",
    query: "transparencia",
    hint: "SIC, Ouvidoria, gastos públicos, processos e leis",
  },
  {
    label: "Acompanhar processo da Prefeitura",
    query: "acompanhar processo",
    hint: "Portal SEI, autenticação de documentos e usuário externo",
  },
  {
    label: "Água e energia",
    query: "agua energia",
    hint: "Saneago, Equatorial, Tarifa Social e ANEEL",
  },
  {
    label: "Internet e telefonia",
    query: "internet telefonia",
    hint: "Anatel, linhas pré-pagas no CPF e bloqueio de telemarketing",
  },
  {
    label: "INSS e benefícios",
    query: "beneficio",
    hint: "Meu INSS, BPC, incapacidade e salário-maternidade",
  },
  {
    label: "Documentos e certidões",
    query: "documento certidao",
    hint: "CIN, título eleitoral, CTPS e antecedentes",
  },
  {
    label: "Processo e Justiça",
    query: "processo justica",
    hint: "Balcão Virtual, consulta processual e Defensoria",
  },
  {
    label: "Celular roubado ou perdido",
    query: "celular seguro",
    hint: "Bloqueio oficial, BO e proteção do aparelho",
  },
] as const;

const READY_ROUTE_ALIAS_BY_SERVICE_ID: Record<string, string> = {
  "upa-mansoes-odisseia": "upa",
  "defensoria-aguas-lindas": "defensoria",
  "transito-mobilidade": "transito",
  "policia-civil-1": "policia-civil",
  coralina: "cora-coralina",
  "pcgo-17-drp": "drp-17",
  "cepi-juscelino": "cepi-jk",
  "pm-go-aguas-lindas": "cepm-aguas-lindas",
};

const READY_ROUTE_EXCLUDED_SERVICE_IDS = new Set([
  "samu",
  "bombeiros",
  "policia-militar",
  "unidades-saude",
  "educacao-estado",
]);

const READY_ROUTE_STANDALONE_IDS = ["rodoviaria", "praca-da-biblia"] as const;

const readyRouteDestinationIds = new Set(
  ALL_LOCAL_ROUTE_DESTINATIONS.map(route => route.id)
);

export const READY_ROUTE_SERVICE_BY_ROUTE_ID = new Map(
  PUBLIC_SERVICES.filter(
    service =>
      Boolean(service.mapQuery) &&
      !READY_ROUTE_EXCLUDED_SERVICE_IDS.has(service.id)
  ).map(
    service =>
      [
        READY_ROUTE_ALIAS_BY_SERVICE_ID[service.id] ?? service.id,
        service,
      ] as const
  )
);

const READY_ROUTE_IDS = Array.from(
  new Set([
    ...READY_ROUTE_STANDALONE_IDS,
    ...READY_ROUTE_SERVICE_BY_ROUTE_ID.keys(),
  ])
).filter(id => readyRouteDestinationIds.has(id));

export const READY_SERVICE_ROUTES = READY_ROUTE_IDS.map(id =>
  ALL_LOCAL_ROUTE_DESTINATIONS.find(route => route.id === id)
).filter((route): route is (typeof ALL_LOCAL_ROUTE_DESTINATIONS)[number] =>
  Boolean(route)
);

export const servicePreparationHint = (
  service: (typeof PUBLIC_SERVICES)[number]
) => {
  if (service.guidance) return service.guidance;
  if (service.hours && service.mapQuery)
    return "Confira o horário informado e, se o atendimento puder mudar, confirme no canal oficial antes de sair.";
  if (service.mapQuery)
    return "Use a rota para chegar ao local. Quando não houver horário confirmado nesta ficha, consulte a fonte oficial antes do deslocamento.";
  if (service.actionUrl)
    return "Este serviço possui canal externo. O catálogo continua disponível offline, mas a ação oficial precisa de internet.";
  if (publicServiceContacts(service).length > 0)
    return "Entre em contato antes de sair para confirmar atendimento, horário e requisitos atuais.";
  return "Consulte a fonte oficial desta ficha para confirmar requisitos e atendimento atual.";
};

const READY_ROUTE_GROUPS_BASE = [
  {
    label: "Saúde",
    ids: [
      "upa",
      "heal",
      "hospital-bom-jesus",
      "caps",
      "ubs-barragem-ii",
      "ubs-barragem-iv",
      "ubs-jardim-paraiso",
      "esf-aguas-bonitas",
      "esf-aguas-lindas-ii",
      "esf-america",
      "esf-camping-club",
      "esf-cidade-entorno",
      "esf-coimbra",
      "esf-perola-ii",
      "esf-guaira",
      "esf-laranjeiras",
      "esf-padre-lucio",
      "esf-pinheiro-i",
      "esf-setor-ii",
      "esf-setor-09",
      "secretaria-saude",
      "esf-barragem-v",
    ],
  },
  {
    label: "Serviços",
    ids: [
      "prefeitura",
      "sic",
      "vapt-vupt",
      "defensoria",
      "procon",
      "sala-empreendedor",
      "desenvolvimento-economico",
      "cmdi",
      "cci-idoso",
      "vigilancia-saude-zoonoses",
      "conselho-tutelar",
      "cras-1",
      "cras-2",
      "cras-3",
      "forum",
      "camara-municipal",
      "cadunico",
      "secretaria-administracao",
      "funpreval",
      "sebrae",
      "ouvidoria-municipal",
    ],
  },
  {
    label: "Segurança",
    ids: ["policia-civil", "drp-17", "policia-civil-2", "deam-depai-dpca"],
  },
  {
    label: "Transporte, educação e cultura",
    ids: [
      "transito",
      "superintendencia-transito",
      "detran",
      "rodoviaria",
      "secretaria-educacao",
      "biblioteca-municipal",
      "secretaria-cultura-turismo",
      "cora-coralina",
      "cepi-jk",
      "cepm-aguas-lindas",
      "paulo-freire",
      "praca-da-biblia",
    ],
  },
  {
    label: "Direitos e apoio",
    ids: [
      "secretaria-fazenda",
      "secretaria-infraestrutura",
      "secretaria-meio-ambiente",
      "secretaria-habitacao",
      "regularizacao-fundiaria",
      "creas",
      "secretaria-assistencia-social",
      "secretaria-mulher",
      "secretaria-pcd-igualdade",
      "secretaria-agricultura-abastecimento",
      "servicos-urbanos-solicitacao",
    ],
  },
] as const;

const READY_ROUTE_GROUPED_IDS = new Set<string>(
  READY_ROUTE_GROUPS_BASE.flatMap(group => [...group.ids])
);

const defaultReadyRouteGroup = (routeId: string) => {
  const category = READY_ROUTE_SERVICE_BY_ROUTE_ID.get(routeId)?.category;
  if (category === "saude") return "Saúde";
  if (category === "seguranca") return "Segurança";
  if (
    category === "transito" ||
    category === "educacao" ||
    category === "cultura"
  )
    return "Transporte, educação e cultura";
  if (
    category === "assistencia" ||
    category === "moradia" ||
    category === "servicos-urbanos" ||
    category === "tributos" ||
    category === "inclusao" ||
    category === "mulher" ||
    category === "animais" ||
    category === "idoso" ||
    category === "agricultura"
  )
    return "Direitos e apoio";
  return "Serviços";
};

export const READY_ROUTE_GROUPS = READY_ROUTE_GROUPS_BASE.map(group => ({
  ...group,
  ids: [
    ...group.ids,
    ...READY_SERVICE_ROUTES.filter(
      route =>
        !READY_ROUTE_GROUPED_IDS.has(route.id) &&
        defaultReadyRouteGroup(route.id) === group.label
    ).map(route => route.id),
  ],
}));

export const READY_ROUTE_GROUP_COUNTS = new Map(
  READY_ROUTE_GROUPS.map(group => [
    group.label,
    READY_SERVICE_ROUTES.reduce(
      (count, route) => count + Number(group.ids.includes(route.id as never)),
      0
    ),
  ])
);
