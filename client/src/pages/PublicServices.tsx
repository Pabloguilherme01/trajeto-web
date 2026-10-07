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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { publicServiceContacts, phoneHref } from "@/lib/contactActions";
import {
  buildOrganicMapsNavigationUrl,
  buildOrganicMapsSearchUrl,
  ORGANIC_MAPS_INSTALL_URL,
  shareText,
} from "@/lib/mobileTools";
import {
  listPublicServiceFavorites,
  publicServiceFavoritesEvent,
  togglePublicServiceFavorite,
} from "@/lib/publicServiceFavorites";
import { toast } from "sonner";
import { localDataEvent } from "@/lib/localData";
import { appUrl } from "@/lib/appUrl";
import {
  PUBLIC_SERVICE_CATEGORIES,
  PUBLIC_SERVICE_SHORTCUTS,
  PUBLIC_SERVICES,
  searchPublicServices,
  type PublicServiceCategory,
} from "@/lib/publicServices";
import { ALL_LOCAL_ROUTE_DESTINATIONS } from "@/lib/localRoutePresets";
import { resolveOfflineRoutePoint } from "@/lib/publicRouting";
import { matchesCatalogText } from "@/lib/catalogSearch";

const categoryIcons = {
  saude: HeartPulse,
  seguranca: ShieldAlert,
  assistencia: Siren,
  transito: TrafficCone,
  educacao: BookOpen,
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
} as const;

const SERVICE_SUMMARY = {
  contacts: PUBLIC_SERVICES.filter(
    service => publicServiceContacts(service).length > 0
  ).length,
  routes: PUBLIC_SERVICES.filter(service => Boolean(service.mapQuery)).length,
  online: PUBLIC_SERVICES.filter(service => Boolean(service.actionUrl)).length,
  verified: PUBLIC_SERVICES.filter(service => Boolean(service.verifiedAt))
    .length,
} as const;

const NEED_GROUPS = [
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
  "coralina": "cora-coralina",
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

const READY_ROUTE_STANDALONE_IDS = [
  "rodoviaria",
  "praca-da-biblia",
] as const;

const readyRouteDestinationIds = new Set(
  ALL_LOCAL_ROUTE_DESTINATIONS.map(route => route.id)
);

const READY_ROUTE_SERVICE_BY_ROUTE_ID = new Map(
  PUBLIC_SERVICES.filter(
    service =>
      Boolean(service.mapQuery) &&
      !READY_ROUTE_EXCLUDED_SERVICE_IDS.has(service.id)
  ).map(service => [
    READY_ROUTE_ALIAS_BY_SERVICE_ID[service.id] ?? service.id,
    service,
  ] as const)
);

const READY_ROUTE_IDS = Array.from(
  new Set([
    ...READY_ROUTE_STANDALONE_IDS,
    ...READY_ROUTE_SERVICE_BY_ROUTE_ID.keys(),
  ])
).filter(id => readyRouteDestinationIds.has(id));

const READY_SERVICE_ROUTES = READY_ROUTE_IDS.map(id =>
  ALL_LOCAL_ROUTE_DESTINATIONS.find(route => route.id === id)
).filter((route): route is (typeof ALL_LOCAL_ROUTE_DESTINATIONS)[number] =>
  Boolean(route)
);

const servicePreparationHint = (service: (typeof PUBLIC_SERVICES)[number]) => {
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
  if (category === "transito" || category === "educacao" || category === "cultura")
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

const READY_ROUTE_GROUPS = READY_ROUTE_GROUPS_BASE.map(group => ({
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

export default function PublicServices() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState<PublicServiceCategory | "todos">(
    () => {
      const value = params.get("categoria");
      return PUBLIC_SERVICE_CATEGORIES.some(item => item.id === value)
        ? (value as PublicServiceCategory | "todos")
        : "todos";
    }
  );
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );
  const [resource, setResource] = useState<
    "todos" | "contato" | "rota" | "online"
  >(() => { const value = params.get("recurso"); return value === "contato" || value === "rota" || value === "online" ? value : "todos"; });
  const [readyRouteGroup, setReadyRouteGroup] = useState<string>("todos");
  const [readyRouteQuery, setReadyRouteQuery] = useState("");
  const [readyRouteOfflineOnly, setReadyRouteOfflineOnly] = useState(false);
  const [navigationMode, setNavigationMode] = useState<
    "drive" | "walk" | "bike"
  >("drive");
  const [favorites, setFavorites] = useState(listPublicServiceFavorites);
  const savedOnly = params.get("salvos") === "1";
  const selectedService = PUBLIC_SERVICES.find(
    service => service.id === params.get("servico")
  );
  const browsing =
    !selectedService &&
    !savedOnly &&
    !query.trim() &&
    category === "todos" &&
    resource === "todos";
  const favoriteCount = PUBLIC_SERVICES.filter(service =>
    favorites.includes(service.id)
  ).length;
  const activeCategoryLabel =
    PUBLIC_SERVICE_CATEGORIES.find(item => item.id === category)?.shortLabel ??
    "Tudo";
  const activeResourceLabel =
    resource === "contato"
      ? "Contato"
      : resource === "rota"
        ? "Rota"
        : resource === "online"
          ? "Online"
          : "Tudo";

  const navigationModeLabel =
    navigationMode === "walk"
      ? "a pé"
      : navigationMode === "bike"
        ? "bicicleta"
        : "carro";

  useEffect(() => {
    const refresh = () => setFavorites(listPublicServiceFavorites());
    window.addEventListener("storage", refresh);
    window.addEventListener(publicServiceFavoritesEvent, refresh);
    window.addEventListener(localDataEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(publicServiceFavoritesEvent, refresh);
      window.removeEventListener(localDataEvent, refresh);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const nextQuery = params.get("q") ?? "";
    const nextCategory = params.get("categoria");
    setQuery(nextQuery);
    setCategory(
      PUBLIC_SERVICE_CATEGORIES.some(item => item.id === nextCategory)
        ? (nextCategory as PublicServiceCategory | "todos")
        : "todos"
    );
    const nextResource = params.get("recurso");
    setResource(nextResource === "contato" || nextResource === "rota" || nextResource === "online" ? nextResource : "todos");
  }, [params]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (
        event.key === "Escape" &&
        document.activeElement === inputRef.current
      ) {
        setQuery("");
        applyFilters("", category, true);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [category, savedOnly, setLocation]);

  const offlineReadyRouteIds = useMemo(() => {
    return new Set(
      READY_SERVICE_ROUTES.filter(route => {
        try {
          return Boolean(resolveOfflineRoutePoint(route.destination));
        } catch {
          return false;
        }
      }).map(route => route.id)
    );
  }, []);

  const visibleReadyRoutes = useMemo(() => {
    const groupedRoutes =
      readyRouteGroup === "todos"
        ? READY_SERVICE_ROUTES
        : READY_SERVICE_ROUTES.filter(route =>
            READY_ROUTE_GROUPS.find(
              group => group.label === readyRouteGroup
            )?.ids.includes(route.id as never)
          );
    const availabilityRoutes = readyRouteOfflineOnly
      ? groupedRoutes.filter(route => offlineReadyRouteIds.has(route.id))
      : groupedRoutes;
    if (!readyRouteQuery.trim()) return availabilityRoutes;
    return availabilityRoutes.filter(route =>
      matchesCatalogText(readyRouteQuery, [
        route.label,
        route.detail,
        route.destination,
      ])
    );
  }, [readyRouteGroup, readyRouteQuery, readyRouteOfflineOnly, offlineReadyRouteIds]);

  const results = useMemo(() => {
    if (selectedService) return [selectedService];
    const matches = searchPublicServices(query, category).filter(
      service =>
        (!savedOnly || favorites.includes(service.id)) &&
        (resource === "todos" ||
          (resource === "contato" &&
            publicServiceContacts(service).length > 0) ||
          (resource === "rota" && Boolean(service.mapQuery)) ||
          (resource === "online" && Boolean(service.actionUrl)))
    );
    return [...matches].sort(
      (a, b) =>
        Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))
    );
  }, [query, category, selectedService, savedOnly, favorites, resource]);

  useEffect(() => {
    const targetId = selectedService
      ? "service-" + selectedService.id
      : params.get("emergencia") === "1"
        ? "emergency-strip"
        : "";
    if (!targetId) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [params, selectedService]);

  const applyFilters = (
    value: string,
    next: PublicServiceCategory | "todos",
    replace = false,
    onlySaved = savedOnly,
    nextResource = resource
  ) => {
    if (filterRef.current?.open) {
      if (filterRef.current.contains(document.activeElement)) {
        filterRef.current.querySelector("summary")?.focus();
      }
      filterRef.current.open = false;
    }
    const search = new URLSearchParams();
    if (value.trim()) search.set("q", value.trim());
    if (next !== "todos") search.set("categoria", next);
    if (onlySaved) search.set("salvos", "1");
    if (nextResource !== "todos") search.set("recurso", nextResource);
    setLocation(
      appUrl("/servicos") + (search.size ? "?" + search.toString() : ""),
      { replace }
    );
  };
  const applyCategory = (next: PublicServiceCategory | "todos") => {
    setCategory(next);
    applyFilters(query, next);
  };

  const scrollToSection = (id: string) => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const showAllServicesFromSummary = () => {
    setQuery("");
    setCategory("todos");
    setResource("todos");
    applyFilters("", "todos", false, false, "todos");
    scrollToSection("service-results");
  };

  const openCategoriesFromSummary = () => {
    if (filterRef.current) filterRef.current.open = true;
    scrollToSection("service-filters");
  };

  const openReadyRoutesFromSummary = (offlineOnly = false) => {
    setReadyRouteOfflineOnly(offlineOnly);
    scrollToSection("ready-routes");
  };

  const openMaps = (service: (typeof PUBLIC_SERVICES)[number]) => {
    if (!service.mapQuery) return;
    setLocation(
      appUrl("/planejar") + "?destino=" + encodeURIComponent(service.mapQuery)
    );
  };
  const openOrganicDestination = (destination: string, label: string) => {
    let point: ReturnType<typeof resolveOfflineRoutePoint> = null;
    try {
      point = resolveOfflineRoutePoint(destination);
    } catch {
      point = null;
    }
    const url = point
      ? buildOrganicMapsNavigationUrl(point, label, navigationMode)
      : buildOrganicMapsSearchUrl(destination);
    if (url) window.location.href = url;
  };
  const openOrganicMaps = (service: (typeof PUBLIC_SERVICES)[number]) => {
    if (!service.mapQuery) return;
    openOrganicDestination(service.mapQuery, service.name);
  };
  const toggleSaved = (service: (typeof PUBLIC_SERVICES)[number]) => {
    const result = togglePublicServiceFavorite(service.id);
    setFavorites(result.ids);
    toast.message(
      result.ok
        ? result.saved
          ? "Serviço salvo neste aparelho."
          : "Serviço removido dos salvos."
        : "Não foi possível guardar o serviço. Confira o espaço e as permissões do navegador."
    );
  };
  const shareService = async (service: (typeof PUBLIC_SERVICES)[number]) => {
    const text = [
      service.name,
      service.description,
      service.address,
      service.phone && "Telefone: " + service.phone,
      service.extraPhone && "Outros contatos: " + service.extraPhone,
      service.hours,
      service.guidance,
      service.whatsappOnly?.length &&
        "Somente WhatsApp: " + service.whatsappOnly.join(" / "),
      "Fonte: " + service.sourceUrl,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await shareText(
        text,
        window.location.origin +
          appUrl("/servicos") +
          "?servico=" +
          encodeURIComponent(service.id),
        "Trajeto · " + service.name
      );
      toast.message("Contato pronto para compartilhar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.message(
        "Não foi possível compartilhar. Você pode selecionar e copiar o contato da ficha."
      );
    }
  };

  return (
    <main className="premium-surface visual-shell min-h-[100dvh] bg-background pb-28 text-foreground md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="premium-card relative overflow-hidden rounded-[1.8rem] border border-primary/10 bg-gradient-to-br from-card via-card to-primary/[.045] p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="status-pill border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="size-3.5" /> Central de serviços
              </span>
              <h1 className="section-heading mt-3 max-w-3xl font-display text-[1.85rem] font-semibold leading-tight tracking-tight sm:text-4xl">
                Como podemos ajudar?
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                <span className="font-bold text-foreground">
                  Encontre o serviço certo sem perder tempo.
                </span>{" "}
                Pesquise por vacina, CNH, emprego, água, documentos ou
                atendimento e veja contato, rota e canal oficial no mesmo lugar.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="status-pill text-foreground/80">
                  <WifiOff className="size-3.5 text-primary" /> catálogo offline
                  · {PUBLIC_SERVICE_CATEGORIES.length - 1} categorias
                </span>
                <span className="status-pill hidden text-foreground/80 sm:inline-flex">
                  <BadgeCheck className="size-3.5 text-accent" />{" "}
                  {SERVICE_SUMMARY.verified} fichas conferidas
                </span>
                <span className="status-pill hidden text-foreground/80 sm:inline-flex">
                  {online ? (
                    <Globe2 className="size-3.5 text-accent" />
                  ) : (
                    <WifiOff className="size-3.5 text-warning" />
                  )}
                  {online ? "internet disponível" : "modo offline ativo"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation(appUrl("/"))}
              className="task-action task-action-secondary hidden shrink-0 sm:inline-flex"
            >
              Início
            </button>
          </div>

          <div
            role="group"
            aria-label="Resumo da Central"
            tabIndex={0}
            className="mobile-scroll-x mt-5 flex gap-2 overflow-x-auto pb-1 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0"
          >
            <button
              type="button"
              onClick={showAllServicesFromSummary}
              className="min-w-[7.75rem] shrink-0 rounded-2xl border border-border/10 bg-background/55 p-3 text-left transition hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-0"
              aria-label={`Ver todos os ${PUBLIC_SERVICES.length} serviços oficiais`}
            >
              <span className="block text-xl font-black tracking-tight text-foreground">
                {PUBLIC_SERVICES.length}
              </span>
              <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                serviços oficiais
              </span>
            </button>
            <button
              type="button"
              onClick={openCategoriesFromSummary}
              className="min-w-[7.75rem] shrink-0 rounded-2xl border border-border/10 bg-background/55 p-3 text-left transition hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-0"
              aria-label={`Abrir ${PUBLIC_SERVICE_CATEGORIES.length - 1} categorias de serviços`}
            >
              <span className="block text-xl font-black tracking-tight text-foreground">
                {PUBLIC_SERVICE_CATEGORIES.length - 1}
              </span>
              <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                categorias
              </span>
            </button>
            <button
              type="button"
              onClick={() => openReadyRoutesFromSummary(false)}
              className="min-w-[7.75rem] shrink-0 rounded-2xl border border-border/10 bg-background/55 p-3 text-left transition hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-0"
              aria-label={`Ir para ${READY_SERVICE_ROUTES.length} rotas prontas`}
            >
              <span className="block text-xl font-black tracking-tight text-foreground">
                {READY_SERVICE_ROUTES.length}
              </span>
              <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                rotas prontas
              </span>
            </button>
            <button
              type="button"
              onClick={() => openReadyRoutesFromSummary(true)}
              className="min-w-[7.75rem] shrink-0 rounded-2xl border border-border/10 bg-background/55 p-3 text-left transition hover:border-accent/30 focus-visible:outline-2 focus-visible:outline-ring sm:min-w-0"
              aria-label={`Mostrar ${offlineReadyRouteIds.size} destinos offline`}
            >
              <span className="block text-xl font-black tracking-tight text-foreground">
                {offlineReadyRouteIds.size}
              </span>
              <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                destinos offline
              </span>
            </button>
          </div>
        </header>

        <nav
          aria-label="Ações principais da Central"
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="premium-card inline-flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-card px-3 text-left text-sm font-black transition hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Search className="size-4 shrink-0 text-primary" />
            <span className="min-w-0">Buscar serviço</span>
          </button>
          <button
            type="button"
            onClick={() => setLocation(appUrl("/mapa"))}
            className="premium-card inline-flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-card px-3 text-left text-sm font-black transition hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MapPinned className="size-4 shrink-0 text-primary" />
            <span className="min-w-0">Mapa da cidade</span>
          </button>
          <button
            type="button"
            onClick={() => openReadyRoutesFromSummary(false)}
            className="premium-card inline-flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-card px-3 text-left text-sm font-black transition hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Route className="size-4 shrink-0 text-primary" />
            <span className="min-w-0">Rotas prontas</span>
          </button>
          <button
            type="button"
            onClick={() => openReadyRoutesFromSummary(true)}
            className="premium-card inline-flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-card px-3 text-left text-sm font-black transition hover:border-accent/35 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <WifiOff className="size-4 shrink-0 text-accent" />
            <span className="min-w-0">Usar offline</span>
          </button>
        </nav>

        <form
          onSubmit={event => {
            event.preventDefault();
            applyFilters(query, category);
            inputRef.current?.blur();
          }}
          className="premium-search mt-5 flex items-center gap-2 rounded-2xl border border-primary/18 bg-background px-3"
        >
          <Search className="size-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Do que você precisa?"
            className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-foreground/65"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Buscar serviços públicos"
            aria-keyshortcuts="Control+K Meta+K"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                applyFilters("", category, true);
              }}
              className="grid size-11 place-items-center rounded-xl text-foreground/70"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Pesquisar serviços"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-primary"
          >
            <ArrowRight className="size-5" />
          </button>
          <kbd className="hidden rounded-lg border border-border/8 bg-muted/[.03] px-2 py-1 text-xs font-black text-foreground/70 sm:inline">
            Ctrl K
          </kbd>
        </form>

        {!selectedService && !query.trim() && (
          <div
            className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1"
            aria-label="Buscas rápidas"
          >
            {PUBLIC_SERVICE_SHORTCUTS.slice(0, 7).map(shortcut => (
              <button
                key={shortcut.query}
                type="button"
                aria-label={"Busca rápida: " + shortcut.hint}
                onClick={() => {
                  setQuery(shortcut.query);
                  applyFilters(shortcut.query, "todos");
                }}
                className="min-h-11 shrink-0 rounded-full border border-border/15 bg-card px-3 py-2 text-xs font-bold text-foreground/80 transition hover:border-accent hover:text-foreground"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        )}

        <section
          id="service-filters"
          aria-label="Filtrar catálogo"
          className="premium-card mt-3 scroll-mt-4 rounded-[1.6rem] border border-border bg-card p-3 sm:p-4"
        >
          <details ref={filterRef} className="service-filter-disclosure">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm font-bold">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 shrink-0 text-primary" />
                  <span className="truncate">Categorias e opções de atendimento</span>
                </span>
                <span className="mt-0.5 block truncate pl-6 text-xs font-semibold text-muted-foreground">
                  {activeCategoryLabel} · {activeResourceLabel}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0" />
            </summary>
          <label className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold">
            <Navigation className="size-4 shrink-0 text-primary" />
            Navegar no Organic Maps
            <select
              aria-label="Modo de navegação no Organic Maps"
              value={navigationMode}
              onChange={event =>
                setNavigationMode(
                  event.target.value as "drive" | "walk" | "bike"
                )
              }
              className="min-h-11 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
            >
              <option value="drive">Carro</option>
              <option value="walk">A pé</option>
              <option value="bike">Bicicleta</option>
            </select>
          </label>
          <div
            role="group"
            className="mobile-scroll-x -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            aria-label="Categorias de serviços"
          >
            {PUBLIC_SERVICE_CATEGORIES.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                onClick={() => applyCategory(item.id)}
                className={
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-black transition " +
                  (category === item.id
                    ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
                    : "border-border/8 bg-muted/[.025] text-foreground/75 hover:border-border/15 hover:text-foreground")
                }
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-background/70 px-1.5 py-0.5 text-[0.68rem] tabular-nums"
                >
                  {item.id === "todos"
                    ? PUBLIC_SERVICES.length
                    : PUBLIC_SERVICES.filter(service => service.category === item.id).length}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-[.12em] text-muted-foreground">
              Como você quer resolver?
            </p>
            <div
              role="group"
              aria-label="Recursos disponíveis"
              className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4"
            >
              {(
                [
                  {
                    value: "todos",
                    label: "Ver tudo",
                    icon: SlidersHorizontal,
                  },
                  { value: "contato", label: "Ligar ou WhatsApp", icon: Phone },
                  { value: "rota", label: "Ir até o local", icon: Route },
                  { value: "online", label: "Resolver online", icon: Globe2 },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={resource === value}
                  onClick={() => {
                    setResource(value);
                    applyFilters(query, category, false, savedOnly, value);
                  }}
                  className={
                    "flex min-h-16 min-w-0 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-bold transition " +
                    (resource === value
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border/10 bg-background text-foreground/80 hover:border-accent/30")
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0">{label}</span>
                </button>
              ))}
            </div>
          </div>
          </details>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => applyFilters(query, category, false, !savedOnly)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/15 px-3 text-sm font-bold text-foreground/80"
            >
              <Heart
                className="size-4"
                fill={savedOnly ? "currentColor" : "none"}
              />
              Serviços salvos ({favoriteCount})
            </button>
            <p className="text-xs text-foreground/65">
              Toque no coração para criar seus atalhos offline.
            </p>
          </div>
        </section>

        {browsing && (
          <>
            <section className="mt-4 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[.09] via-card to-accent/[.05] p-4 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-foreground">
                    Mapa e navegação offline
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Planeje no Trajeto e continue no Organic Maps quando quiser
                    navegação externa. Destinos reconhecidos abrem a rota; os
                    demais abrem a busca no app. Baixe o mapa da região no
                    Organic Maps para continuar sem internet.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setLocation(appUrl("/mapa"))}
                      className="min-h-11 min-w-0 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
                    >
                      Explorar mapa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocation(appUrl("/planejar?destinos=1"))
                      }
                      className="min-h-11 min-w-0 rounded-xl border border-border/15 bg-background px-3 text-xs font-black text-foreground"
                    >
                      {READY_SERVICE_ROUTES.length} rotas prontas
                    </button>
                  </div>
                  <a
                    href={ORGANIC_MAPS_INSTALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl px-1 text-xs font-black text-primary"
                  >
                    Instalar ou atualizar Organic Maps
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </section>

            <section
              aria-label="Resumo da Central de Serviços"
              className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4"
            >
              {[
                ["Serviços", `${PUBLIC_SERVICES.length} no catálogo`],
                [
                  "Categorias",
                  `${PUBLIC_SERVICE_CATEGORIES.length - 1} assuntos`,
                ],
                ["Rotas prontas", `${READY_SERVICE_ROUTES.length} destinos`],
                ["Offline", "catálogo e rotas salvas"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-primary/[.035] px-3.5 py-3 shadow-sm"
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[.12em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-black text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            <section
              id="emergency-strip"
              tabIndex={-1}
              className="premium-card mt-4 scroll-mt-20 rounded-[1.45rem] border border-warning/25 bg-card p-4 outline-none"
              aria-labelledby="emergency-strip-title"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-warning">
                    <Siren className="size-4" /> Emergências
                  </p>
                  <h2
                    id="emergency-strip-title"
                    className="mt-1 text-base font-black"
                  >
                    Em caso de risco, ligue agora
                  </h2>
                </div>
                <span className="text-xs font-bold text-foreground/65">
                  rede telefônica
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 min-[340px]:grid-cols-3">
                {[
                  { label: "Polícia", number: "190" },
                  { label: "SAMU", number: "192" },
                  { label: "Bombeiros", number: "193" },
                ].map(item => (
                  <a
                    key={item.label}
                    href={phoneHref(item.number) ?? "#"}
                    className="inline-flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-border/10 bg-background px-2 py-2 text-center text-xs font-bold text-foreground transition hover:border-warning/30 hover:text-foreground"
                  >
                    <span>{item.label}</span>
                    <span className="text-xl font-black text-warning">
                      {item.number}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
        {!selectedService &&
          !savedOnly &&
          !query.trim() &&
          category === "todos" &&
          resource === "todos" && (
            <section className="mt-5" aria-labelledby="citizen-shortcuts-title">
              <h2 className="text-lg font-bold">Resolva por assunto</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                {PUBLIC_SERVICE_CATEGORIES.filter(
                  item => item.id !== "todos"
                )
                  .slice(0, 6)
                  .map(item => {
                    const Icon = categoryIcons[item.id as PublicServiceCategory];
                    const count = PUBLIC_SERVICES.filter(
                      service => service.category === item.id
                    ).length;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyCategory(item.id)}
                        className="premium-card group flex min-h-20 min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-md focus-visible:border-accent"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/15 bg-accent/[.07] text-accent">
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {count} serviços
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
              <details className="mobile-disclosure mt-2">
                <summary className="min-h-11">
                  Ver todos os assuntos ({PUBLIC_SERVICE_CATEGORIES.length - 7})
                  <ChevronRight className="size-4" />
                </summary>
                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                  {PUBLIC_SERVICE_CATEGORIES.filter(
                    item => item.id !== "todos"
                  )
                    .slice(6)
                    .map(item => {
                      const Icon = categoryIcons[item.id as PublicServiceCategory];
                      const count = PUBLIC_SERVICES.filter(
                        service => service.category === item.id
                      ).length;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => applyCategory(item.id)}
                          className="premium-card group flex min-h-20 min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:border-accent/45 hover:shadow-md"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/15 bg-accent/[.07] text-accent">
                            <Icon className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {count} serviços
                            </span>
                          </span>
                        </button>
                      );
                    })}
                </div>
              </details>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  {
                    label: "Preciso de ajuda jurídica",
                    query: "defensoria",
                    hint: "Defensoria, mediação e orientação",
                  },
                  {
                    label: "Tenho um problema na rua",
                    query: "buraco",
                    hint: "Iluminação, vias, bueiros e limpeza",
                  },
                  {
                    label: "Preciso de um benefício",
                    query: "cadunico",
                    hint: "CadÚnico, CRAS e benefícios sociais",
                  },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setQuery(item.query);
                      applyFilters(item.query, "todos");
                    }}
                    className="premium-card min-h-20 rounded-2xl border border-primary/12 bg-primary/[.035] p-3 text-left transition hover:border-primary/30"
                  >
                    <span className="block text-sm font-black text-foreground">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
              <h2 className="mt-5 text-lg font-bold">
                Encontre pela sua situação
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {NEED_GROUPS.slice(0, 6).map(group => (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => {
                      setQuery(group.query);
                      applyFilters(group.query, "todos");
                    }}
                    className="premium-card min-h-20 min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-md"
                  >
                    <span className="block text-sm font-black text-foreground">
                      {group.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {group.hint}
                    </span>
                  </button>
                ))}
              </div>
              <details className="mobile-disclosure mt-2">
                <summary className="min-h-11">
                  Ver todas as situações ({NEED_GROUPS.length - 6})
                  <ChevronRight className="size-4" />
                </summary>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {NEED_GROUPS.slice(6).map(group => (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => {
                        setQuery(group.query);
                        applyFilters(group.query, "todos");
                      }}
                      className="premium-card min-h-20 min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:border-accent/45 hover:shadow-md"
                    >
                      <span className="block text-sm font-black text-foreground">
                        {group.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {group.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
              <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[.04] p-4">
                <p className="text-xs font-black uppercase tracking-[.14em] text-primary">
                  Mapa e deslocamento
                </p>
                <h2 className="mt-1 text-base font-black">
                  Escolha o destino aqui. Navegue do seu jeito.
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  O Trajeto organiza o serviço e prepara a rota. No planejador,
                  o Organic Maps recebe a rota quando o destino já tem
                  coordenadas locais e abre a busca do app nos demais casos;
                  Google Maps, Waze e Apple Maps continuam disponíveis.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] font-black">
                  <span className="rounded-full border border-primary/15 bg-primary/[.06] px-2.5 py-1 text-primary">
                    Organic Maps
                  </span>
                  <span className="rounded-full border border-border/15 bg-background px-2.5 py-1 text-foreground/70">
                    carro · a pé · bicicleta
                  </span>
                  <span className="rounded-full border border-border/15 bg-background px-2.5 py-1 text-foreground/70">
                    offline após baixar o mapa
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocation(appUrl("/planejar") + "?destinos=1")
                  }
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-background px-3 text-sm font-black text-primary"
                >
                  <Navigation className="size-4" /> Abrir mapa e destinos
                </button>
              </div>
              {PUBLIC_SERVICE_SHORTCUTS.length > 7 && (
                <details className="mobile-disclosure mt-5">
                  <summary id="citizen-shortcuts-title" className="min-h-11">
                    Mais atalhos úteis ({PUBLIC_SERVICE_SHORTCUTS.length - 7})
                    <ChevronRight className="size-4" />
                  </summary>
                  <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
                    {PUBLIC_SERVICE_SHORTCUTS.slice(7).map(shortcut => (
                      <button
                        key={shortcut.query}
                        type="button"
                        onClick={() => {
                          setQuery(shortcut.query);
                          applyFilters(shortcut.query, "todos");
                        }}
                        className="premium-card min-h-20 rounded-xl border border-border bg-card p-3 text-left hover:border-primary"
                      >
                        <span className="block text-sm font-bold">
                          {shortcut.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {shortcut.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              )}
                          </section>
          )}
        {!selectedService &&
          !savedOnly &&
          !query.trim() &&
          category === "todos" &&
          resource === "todos" && (
            <>
              <section className="mt-6" aria-labelledby="popular-actions-title">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.14em] text-accent">
                      Mais usados
                    </p>
                    <h2
                      id="popular-actions-title"
                      className="mt-1 text-lg font-bold"
                    >
                      Resolva em poucos toques
                    </h2>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                  {[
                    {
                      label: "Saúde agora",
                      query: "upa",
                      detail: "Urgência e unidades",
                    },
                    {
                      label: "Documentos",
                      query: "cpf",
                      detail: "CPF, título e cidadania",
                    },
                    {
                      label: "Água e cidade",
                      query: "vazamento agua",
                      detail: "Saneamento e manutenção",
                    },
                    {
                      label: "Direitos",
                      query: "defensoria",
                      detail: "Defensoria e orientação",
                    },
                    {
                      label: "Celular roubado",
                      query: "celular seguro",
                      detail: "Bloqueio oficial e BO",
                    },
                    {
                      label: "Nota Fiscal / ITBI",
                      query: "tributo municipal",
                      detail: "ISS, Nota Fiscal e ITBI",
                    },
                  ].map(action => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        setQuery(action.query);
                        applyFilters(action.query, "todos");
                      }}
                      className="premium-card min-h-20 rounded-2xl border border-border/12 bg-card p-3 text-left transition hover:border-accent/35"
                    >
                      <span className="block text-sm font-black">
                        {action.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {action.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section id="ready-routes" className="mt-6 scroll-mt-4" aria-labelledby="ready-routes-title">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.14em] text-primary">
                      Chegue mais rápido
                    </p>
                    <h2
                      id="ready-routes-title"
                      className="mt-1 text-lg font-bold"
                    >
                      Rotas prontas para o dia a dia
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                      Saúde, documentos, transporte, escola e serviços urbanos
                      em poucos toques. O Trajeto prepara o destino e, quando
                      houver coordenadas confirmadas, você pode continuar no
                      Organic Maps.
                    </p>
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label="Recursos das rotas prontas"
                    >
                      <span className="rounded-full border border-primary/15 bg-primary/[.05] px-2.5 py-1 text-[0.68rem] font-black text-primary">
                        {READY_SERVICE_ROUTES.length} destinos públicos
                      </span>
                      <span className="rounded-full border border-border/15 bg-card px-2.5 py-1 text-[0.68rem] font-black text-foreground/70">
                        saúde por região
                      </span>
                      <span className="rounded-full border border-border/15 bg-card px-2.5 py-1 text-[0.68rem] font-black text-foreground/70">
                        navegação externa
                      </span>
                    </div>
                  </div>
                  <Route className="hidden size-6 text-primary sm:block" />
                </div>
                <div className="mt-3">
                  <label className="relative block">
                    <span className="sr-only">Buscar rota pronta</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={readyRouteQuery}
                      onChange={event => setReadyRouteQuery(event.target.value)}
                      placeholder="Buscar UPA, biblioteca, escola..."
                      aria-label="Buscar rota pronta"
                      className="min-h-11 w-full min-w-0 rounded-xl border border-border/20 bg-background pl-9 pr-10 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
                    />
                    {readyRouteQuery && (
                      <button
                        type="button"
                        onClick={() => setReadyRouteQuery("")}
                        aria-label="Limpar busca de rotas"
                        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </label>
                  <p className="mt-1.5 text-xs font-semibold text-muted-foreground" role="status" aria-live="polite">
                    {visibleReadyRoutes.length} destinos neste filtro
                  </p>
                </div>
                <div
                  className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1"
                  role="group"
                  aria-label="Filtrar rotas prontas"
                >
                  <button
                    type="button"
                    aria-label={`Todas as rotas prontas · ${READY_SERVICE_ROUTES.length} destinos`}
                    aria-pressed={readyRouteGroup === "todos"}
                    onClick={() => setReadyRouteGroup("todos")}
                    className={
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black " +
                      (readyRouteGroup === "todos"
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border/15 bg-card text-foreground/75")
                    }
                  >
                    <span>Todas</span>
                    <span aria-hidden="true" className="rounded-full bg-background/70 px-1.5 py-0.5 text-[0.65rem] tabular-nums">
                      {READY_SERVICE_ROUTES.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Mostrar somente destinos offline · ${offlineReadyRouteIds.size} destinos`}
                    aria-pressed={readyRouteOfflineOnly}
                    onClick={() => setReadyRouteOfflineOnly(value => !value)}
                    className={
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black " +
                      (readyRouteOfflineOnly
                        ? "border-accent/35 bg-accent/10 text-accent"
                        : "border-border/15 bg-card text-foreground/75")
                    }
                  >
                    <WifiOff className="size-3.5 shrink-0" />
                    <span>Offline</span>
                    <span aria-hidden="true" className="rounded-full bg-background/70 px-1.5 py-0.5 text-[0.65rem] tabular-nums">
                      {offlineReadyRouteIds.size}
                    </span>
                  </button>
                  {READY_ROUTE_GROUPS.map(group => {
                    const groupCount = READY_SERVICE_ROUTES.filter(route =>
                      group.ids.includes(route.id as never)
                    ).length;
                    return (
                      <button
                        key={group.label}
                        type="button"
                        aria-label={`Filtrar rotas: ${group.label} · ${groupCount} destinos`}
                        aria-pressed={readyRouteGroup === group.label}
                        onClick={() => setReadyRouteGroup(group.label)}
                        className={
                          "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black " +
                          (readyRouteGroup === group.label
                            ? "border-primary/35 bg-primary/10 text-primary"
                            : "border-border/15 bg-card text-foreground/75")
                        }
                      >
                        <span>{group.label}</span>
                        <span aria-hidden="true" className="rounded-full bg-background/70 px-1.5 py-0.5 text-[0.65rem] tabular-nums">
                          {groupCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mobile-scroll-x mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-5">
                  {visibleReadyRoutes.map(route => (
                    <article
                      key={route.id}
                      className="premium-card flex min-h-32 w-[min(86vw,19rem)] min-w-0 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3 text-left transition hover:border-primary sm:w-auto"
                    >
                      <div>
                        <span className="block text-sm font-black text-foreground">
                          {route.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {route.detail}
                        </span>
                        <span
                          data-route-readiness={offlineReadyRouteIds.has(route.id) ? "offline" : "online"}
                          className={
                            "mt-2 inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2 text-[0.68rem] font-black " +
                            (offlineReadyRouteIds.has(route.id)
                              ? "border-accent/20 bg-accent/[.06] text-accent"
                              : "border-border/20 bg-muted/[.04] text-muted-foreground")
                          }
                        >
                          {offlineReadyRouteIds.has(route.id) ? (
                            <>
                              <WifiOff className="size-3 shrink-0" />
                              Destino offline
                            </>
                          ) : (
                            <>
                              <Globe2 className="size-3 shrink-0" />
                              Localizar online
                            </>
                          )}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLocation(
                              appUrl("/planejar") +
                                "?destino=" +
                                encodeURIComponent(route.destination) +
                                "&auto=1"
                            )
                          }
                          aria-label={"Planejar rota para " + route.label}
                          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl bg-primary px-2 text-xs font-black text-primary-foreground"
                        >
                          <Route className="size-3.5 shrink-0" />
                          <span className="truncate">Planejar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openOrganicDestination(route.destination, route.label)
                          }
                          aria-label={"Abrir " + route.label + " no Organic Maps"}
                          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-primary/20 bg-primary/[.05] px-2 text-xs font-black text-primary"
                        >
                          <Navigation className="size-3.5 shrink-0" />
                          <span className="truncate">Organic · {navigationModeLabel}</span>
                        </button>
                      </div>
                    </article>
                  ))}
                  {visibleReadyRoutes.length === 0 && (
                    <div className="w-[min(86vw,19rem)] shrink-0 rounded-2xl border border-dashed border-border/30 bg-muted/[.025] p-4 text-sm text-muted-foreground sm:col-span-2 sm:w-auto lg:col-span-5">
                      Nenhuma rota pronta corresponde a esta busca neste grupo.
                    </div>
                  )}
                </div>
                <div className="mt-3 rounded-2xl border border-border/12 bg-muted/[.025] p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p className="text-sm font-black text-foreground">
                      Também vai a bancos, farmácias, praças, bairros e
                      comércio?
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Esses locais ficam separados do catálogo público para a
                      Central continuar simples. Abra o diretório completo no
                      planejador.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocation(appUrl("/planejar") + "?destinos=1")
                    }
                    className="mt-3 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-background px-3 text-xs font-black text-primary sm:mt-0"
                  >
                    Explorar todos os destinos{" "}
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </section>
            </>
          )}

        {selectedService && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("todos");
              applyFilters("", "todos", false, false);
            }}
            className="mt-4 min-h-11 rounded-xl border border-border/15 px-3 text-sm font-bold"
          >
            Ver todos os serviços
          </button>
        )}
        {params.get("servico") && !selectedService && (
          <p role="status" className="mt-4 text-sm text-foreground/75">
            Este serviço não está no catálogo atual. Consulte os serviços
            disponíveis abaixo.
          </p>
        )}
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-foreground/70"
        >
          {results.length} serviços encontrados
        </p>
        <section
          id="service-results"
          className={
            "mt-3 grid gap-3 " +
            (selectedService ? "max-w-2xl" : "sm:grid-cols-2 lg:grid-cols-3")
          }
          aria-label="Serviços públicos"
        >
          {results.map(service => {
            const Icon = categoryIcons[service.category];
            const contacts = publicServiceContacts(service);
            const primaryContact = contacts[0];
            const secondaryContacts = contacts.slice(1);
            const expandedActions = selectedService?.id === service.id;
            const emergencyDirect = contacts.some(contact =>
              ["tel:190", "tel:192", "tel:193"].includes(contact.href)
            );
            const showSecondaryContacts =
              secondaryContacts.length > 0 &&
              (expandedActions || emergencyDirect);
            const showOfficialAction =
              Boolean(service.actionUrl) &&
              (expandedActions ||
                resource === "online" ||
                (!primaryContact && !service.mapQuery));
            const officialActionIsPrimary =
              showOfficialAction &&
              Boolean(service.actionUrl) &&
              (resource === "online" || (!primaryContact && !service.mapQuery));
            const showEmail = Boolean(service.email) && expandedActions;
            const hasMoreOptions =
              !expandedActions &&
              (Boolean(service.actionUrl && !showOfficialAction) ||
                Boolean(service.email && !showEmail) ||
                (secondaryContacts.length > 0 && !showSecondaryContacts) ||
                Boolean(primaryContact));
            const saved = favorites.includes(service.id);
            return (
              <article
                key={service.id}
                id={"service-" + service.id}
                tabIndex={-1}
                aria-current={
                  selectedService?.id === service.id ? "true" : undefined
                }
                className="premium-card service-directory-card route-card group min-w-0 scroll-mt-20 overflow-hidden rounded-[1.4rem] border border-border/8 bg-card p-3.5 outline-none sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/[.06] text-accent">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[.12em] text-accent">
                      {
                        PUBLIC_SERVICE_CATEGORIES.find(
                          item => item.id === service.category
                        )?.shortLabel
                      }
                    </p>
                    <h2 className="mt-1 break-words text-base font-bold leading-snug">
                      {service.name}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
                      {service.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaved(service)}
                    aria-pressed={saved}
                    aria-label={
                      (saved ? "Remover dos salvos: " : "Salvar serviço: ") +
                      service.name
                    }
                    className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/15 text-primary"
                  >
                    <Heart
                      className="size-4"
                      fill={saved ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div role="group" aria-label="Ações principais do serviço" className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  {officialActionIsPrimary && service.actionUrl && (
                    <a
                      href={service.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-first flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[.06] px-3 text-center text-sm font-bold text-accent min-[380px]:col-span-2"
                    >
                      <ExternalLink className="size-4 shrink-0" />
                      {service.actionLabel} · online
                    </a>
                  )}
                  {service.mapQuery && (
                    <button
                      type="button"
                      onClick={() => openMaps(service)}
                      className="min-h-11 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
                    >
                      <MapPinned className="mr-1.5 inline size-3.5" />
                      Planejar rota
                    </button>
                  )}
                  {service.mapQuery && (
                    <button
                      type="button"
                      onClick={() => openOrganicMaps(service)}
                      aria-label={"Abrir " + service.name + " no Organic Maps"}
                      className="min-h-11 rounded-xl border border-primary/20 bg-primary/[.05] px-3 text-sm font-bold text-primary"
                    >
                      <Navigation className="mr-1.5 inline size-3.5" />
                      Organic · {navigationModeLabel}
                    </button>
                  )}
                  {primaryContact ? (
                    <a
                      href={primaryContact.href}
                      target={
                        primaryContact.channel === "whatsapp"
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        primaryContact.channel === "whatsapp"
                          ? "noopener noreferrer"
                          : undefined
                      }
                      aria-label={
                        (primaryContact.channel === "whatsapp"
                          ? "WhatsApp de "
                          : "Ligar para ") +
                        service.name +
                        (primaryContact.label
                          ? " · " + primaryContact.label
                          : "") +
                        ": " +
                        primaryContact.number
                      }
                      className={
                        "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/[.06] px-2 text-center text-sm font-bold text-accent " +
                        (resource === "contato" ? "order-first min-[380px]:col-span-2 " : "") +
                        (!service.mapQuery ? "min-[380px]:col-span-2" : "")
                      }
                    >
                      {primaryContact.channel === "whatsapp" ? (
                        <MessageCircle className="size-3.5 shrink-0" />
                      ) : (
                        <Phone className="size-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 break-words">
                        {primaryContact.label ||
                          (primaryContact.channel === "whatsapp"
                            ? "WhatsApp"
                            : "Ligar")}{" "}
                        · {primaryContact.number}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void shareService(service)}
                      aria-label={"Compartilhar serviço: " + service.name}
                      className={
                        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border/15 px-3 text-sm font-bold text-foreground/80 " +
                        (!service.mapQuery ? "min-[380px]:col-span-2" : "")
                      }
                    >
                      <Share2 className="size-3.5" />
                      Compartilhar
                    </button>
                  )}
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-muted-foreground"
                  aria-label="Recursos deste serviço"
                >
                  {contacts.length > 0 && (
                    <span className="rounded-lg bg-muted px-2 py-1">
                      {contacts.length}{" "}
                      {contacts.length === 1 ? "contato" : "contatos"}
                    </span>
                  )}
                  {service.mapQuery && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                      <Navigation className="size-3.5" /> rota + navegadores
                    </span>
                  )}
                  {service.actionUrl ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                      <Globe2 className="size-3.5" /> canal externo exige
                      internet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/[.06] px-2 py-1 text-primary">
                      <WifiOff className="size-3.5" /> ficha disponível offline
                    </span>
                  )}
                  {service.verifiedAt && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-accent/[.06] px-2 py-1 text-accent">
                      <BadgeCheck className="size-3.5" /> conferido{" "}
                      {service.verifiedAt}
                    </span>
                  )}
                </div>
                {service.address && (
                  <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-foreground/70">
                    <MapPinned className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span>{service.address}</span>
                  </p>
                )}
                {!service.mapQuery && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Sem destino confirmado para rota neste catálogo.
                  </p>
                )}
                {service.hours && (
                  <p className="mt-3 flex items-start gap-2 text-sm font-bold text-foreground/75">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{service.hours}</span>
                  </p>
                )}
                <details
                  className="mobile-disclosure mt-3"
                  open={expandedActions || undefined}
                >
                  <summary className="min-h-11">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-accent" /> Antes de
                      sair
                    </span>
                    <ChevronRight className="size-4" />
                  </summary>
                  <div className="space-y-3 text-sm leading-relaxed text-foreground">
                    <p>{servicePreparationHint(service)}</p>
                    {service.documents?.length ? (
                      <div>
                        <p className="font-bold">
                          Documentos informados para este serviço
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {service.documents.map(document => (
                            <li key={document}>{document}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Esta ficha não presume documentos. Confira os requisitos
                        no canal oficial antes do atendimento.
                      </p>
                    )}
                  </div>
                </details>
                {showSecondaryContacts && (
                  <div className="mt-2 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                    {secondaryContacts.map(contact => (
                      <a
                        key={contact.href}
                        href={contact.href}
                        target={
                          contact.channel === "whatsapp" ? "_blank" : undefined
                        }
                        rel={
                          contact.channel === "whatsapp"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        aria-label={
                          (contact.channel === "whatsapp"
                            ? "WhatsApp de "
                            : "Ligar para ") +
                          service.name +
                          (contact.label ? " · " + contact.label : "") +
                          ": " +
                          contact.number
                        }
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[.05] px-3 text-center text-sm font-bold text-accent"
                      >
                        {contact.channel === "whatsapp" ? (
                          <MessageCircle className="size-3.5 shrink-0" />
                        ) : (
                          <Phone className="size-3.5 shrink-0" />
                        )}
                        <span className="min-w-0 break-words">
                          {contact.label ||
                            (contact.channel === "whatsapp"
                              ? "WhatsApp"
                              : "Ligar")}{" "}
                          · {contact.number}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {showOfficialAction && service.actionUrl && !officialActionIsPrimary && (
                  <a
                    href={service.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/30 px-3 text-center text-sm font-bold text-accent"
                  >
                    <ExternalLink className="size-4 shrink-0" />
                    {service.actionLabel} · online
                  </a>
                )}
                {showEmail && service.email && (
                  <a
                    href={"mailto:" + service.email}
                    className="mt-2 flex min-h-11 items-center justify-center break-all rounded-xl border border-border/10 px-3 text-center text-sm text-foreground/75"
                  >
                    {service.email}
                  </a>
                )}
                {expandedActions && primaryContact && (
                  <button
                    type="button"
                    onClick={() => void shareService(service)}
                    aria-label={"Compartilhar serviço: " + service.name}
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border/15 px-3 text-sm font-bold text-foreground/80"
                  >
                    <Share2 className="size-3.5" />
                    Compartilhar
                  </button>
                )}
                {hasMoreOptions && (
                  <details className="mobile-disclosure mt-2">
                    <summary>
                      {service.actionUrl && !showOfficialAction
                        ? "Mais opções · canal online"
                        : secondaryContacts.length > 0 && !showSecondaryContacts
                          ? "Mais opções · contatos"
                          : service.email && !showEmail
                            ? "Mais opções · e-mail"
                            : "Compartilhar serviço"}
                      <ArrowRight className="size-4 shrink-0" />
                    </summary>
                    <div className="grid gap-2">
                      {service.actionUrl && !showOfficialAction && (
                        <a
                          href={service.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/30 px-3 text-sm font-bold text-accent"
                        >
                          <ExternalLink className="size-4" />
                          {service.actionLabel} · online
                        </a>
                      )}
                      {service.email && !showEmail && (
                        <a
                          href={"mailto:" + service.email}
                          className="flex min-h-11 items-center justify-center break-all rounded-xl border border-border/10 px-3 text-sm text-foreground/75"
                        >
                          {service.email}
                        </a>
                      )}
                      {!showSecondaryContacts &&
                        secondaryContacts.map(contact => (
                          <a
                            key={contact.href}
                            href={contact.href}
                            target={
                              contact.channel === "whatsapp"
                                ? "_blank"
                                : undefined
                            }
                            rel={
                              contact.channel === "whatsapp"
                                ? "noopener noreferrer"
                                : undefined
                            }
                            aria-label={
                              (contact.channel === "whatsapp"
                                ? "WhatsApp de "
                                : "Ligar para ") +
                              service.name +
                              (contact.label ? " · " + contact.label : "") +
                              ": " +
                              contact.number
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[.05] px-3 text-sm font-bold text-accent"
                          >
                            {contact.channel === "whatsapp" ? (
                              <MessageCircle className="size-3.5 shrink-0" />
                            ) : (
                              <Phone className="size-3.5 shrink-0" />
                            )}
                            <span className="break-words">
                              {contact.label || "Contato alternativo"} ·{" "}
                              {contact.number}
                              {contact.channel === "whatsapp"
                                ? " · WhatsApp"
                                : ""}
                            </span>
                          </a>
                        ))}
                      {primaryContact && (
                        <button
                          type="button"
                          onClick={() => void shareService(service)}
                          aria-label={"Compartilhar serviço: " + service.name}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border/15 px-3 text-sm font-bold text-foreground/80"
                        >
                          <Share2 className="size-3.5" />
                          Compartilhar
                        </button>
                      )}
                    </div>
                  </details>
                )}
                <a
                  href={service.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex min-h-10 items-center justify-center text-center text-xs font-bold text-foreground/65 hover:text-foreground"
                >
                  <BadgeCheck className="mr-1.5 inline size-3.5 text-accent" />
                  Fonte: {service.sourceLabel}
                  {service.verifiedAt
                    ? " · conferido em " + service.verifiedAt
                    : ""}
                </a>
              </article>
            );
          })}
        </section>

        {!results.length && (
          <section className="premium-card mt-5 rounded-3xl border border-border/8 bg-card p-6 text-center">
            <p className="text-sm font-black">
              {savedOnly && !favoriteCount
                ? "Nenhum serviço salvo ainda."
                : "Nenhum serviço corresponde ao filtro."}
            </p>
            <p className="mt-1 text-sm text-foreground/65">
              {savedOnly && !favoriteCount
                ? "Veja o catálogo e toque no coração dos serviços que você mais usa."
                : "Experimente outro termo ou veja todas as categorias."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("todos");
                setResource("todos");
                applyFilters("", "todos", false, false, "todos");
              }}
              className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Limpar filtros
            </button>
          </section>
        )}

        <section className="premium-card mt-5 rounded-[1.4rem] border border-border/8 bg-muted/[.025] p-4">
          <div className="flex items-start gap-3">
            {online ? (
              <Building2 className="mt-0.5 size-4 text-primary" />
            ) : (
              <WifiOff className="mt-0.5 size-4 text-warning" />
            )}
            <div>
              <p className="text-xs font-black">
                {online ? "Catálogo local disponível" : "Modo offline ativo"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                {online
                  ? "Busca, fichas e serviços salvos ficam disponíveis no aparelho após preparar o app. Ligações precisam de rede telefônica; WhatsApp, canais online e consulta às fontes precisam de internet. No planejador, rotas por ruas offline precisam ter sido preparadas."
                  : "Busca, fichas e serviços salvos continuam disponíveis. Ligações precisam de rede telefônica. WhatsApp, canais online e consulta às fontes exigem internet; no planejador, use rotas por ruas já preparadas."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
