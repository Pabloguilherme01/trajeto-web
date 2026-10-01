import { ArrowLeftRight, Bike, Bookmark, Bus, Car, CheckCircle2, ChevronDown, ExternalLink, Fuel, Loader2, LocateFixed, Map, Navigation, PersonStanding, RefreshCw, Route as RouteIcon, Share2, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, rememberTrip } from "@/lib/mobilePreferences";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildWazeNavigationUrl, buildRouteShareText, getPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import { findOfflineRouteByDestination, findOfflineRouteByTrip, getOfflineRoute, listOfflineRoutes, offlineRouteId, saveOfflineRoute, removeOfflineRoute, isOfflineRouteStale, type OfflineRoute } from "@/lib/offlineStore";
import { RouteMap } from "@/components/RouteMap";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";
import { ALL_LOCAL_ROUTE_DESTINATIONS, LOCAL_ROUTE_PRESETS } from "@/lib/localRoutePresets";
import { supportsLiveRouting } from "@/lib/runtimeCapabilities";
import { buildPublicRoutePayload, calculatePublicRoute, type PublicTravelMode } from "@/lib/publicRouting";
import { isCurrentLocationLabel, isPreciseLocationText, privateOriginForExternalNavigation, privateOriginForHistory, privateOriginForRouting, privateOriginForUrl } from "@/lib/locationPrivacy";

type PlannedRoute = NonNullable<ReturnType<typeof trpc.routes.plan.useMutation>["data"]>;

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";
  const total = Math.max(1, Math.round(seconds / 60));
  if (total >= 60) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes ? hours + "h " + minutes + "min" : hours + "h";
  }
  return total + " min";
}

function formatDistance(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  return meters >= 1000
    ? (meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"
    : Math.round(meters).toLocaleString("pt-BR") + " m";
}

function formatArrival(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(Date.now() + seconds * 1000));
}

export default function Planner() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const pathname = location.split("?")[0].replace(/\/$/, "") || "/";
  const savedMode = pathname === "/salvos" || queryParams.get("salvos") === "1";
  const economyMode = queryParams.get("economia") === "1";
  const drivingMode = queryParams.get("conducao") === "1";
  const [origin, setOrigin] = useState(() => queryParams.get("origem") || getLastTrip()?.origin || "");
  const [destination, setDestination] = useState(() => queryParams.get("destino") || getLastTrip()?.destination || "");
  const [mode, setMode] = useState<PublicTravelMode>(() => {
    const value = queryParams.get("modo");
    return value === "walking" || value === "cycling" || value === "transit" ? value : "driving";
  });
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<OfflineRoute[]>([]);
  const [savedRouteQuery, setSavedRouteQuery] = useState("");
  const [showAllDestinations, setShowAllDestinations] = useState(() => queryParams.get("destinos") === "1");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [destinationCategory, setDestinationCategory] = useState<"todos" | "saude" | "servicos" | "transporte" | "compras" | "combustivel" | "centro" | "alimentacao">("todos");
  const [savedStations, setSavedStations] = useState<MobileStation[]>(listMobileStationFavorites);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const [publicRoutePending, setPublicRoutePending] = useState(false);
  const track = useProductEvents();
  const planRoute = trpc.routes.plan.useMutation();
  const staticRuntime = !supportsLiveRouting();
  const requestVersion = useRef(0);
  const plannerFormRef = useRef<HTMLFormElement>(null);
  const autoSubmittedKey = useRef<string | null>(null);

  const resetResult = () => {
    requestVersion.current += 1;
    setPlanned(null);
    setFallbackReady(false);
    setShowMap(false);
    setError(null);
    setSavedMessage(null);
  };

  useEffect(() => () => { requestVersion.current += 1; }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const refreshSavedRoutes = () => {
    void listOfflineRoutes().then(setSavedRoutes).catch(() => setSavedRoutes([]));
  };

  useEffect(() => {
    refreshSavedRoutes();
  }, []);

  useEffect(() => {
    if (!savedMode) return;
    refreshSavedRoutes();
  }, [savedMode]);

  useEffect(() => {
    const value = queryParams.get("modo");
    setMode(drivingMode ? "driving" : (value === "walking" || value === "cycling" || value === "transit" ? value : "driving"));
    resetResult();
    const routeId = queryParams.get("rota");
    let active = true;
    if (routeId) {
      void getOfflineRoute(routeId).then(route => {
        if (!active) return;
        if (!route) { setError("Esta rota não está salva neste aparelho."); return; }
        setOrigin(route.origin);
        setDestination(route.destination);
        setPlanned(route.payload as PlannedRoute);
        setShowMap(true);
        const savedMode = (route.payload as PlannedRoute).route as PlannedRoute["route"] & { mode?: PublicTravelMode };
        if (savedMode.mode === "walking" || savedMode.mode === "cycling" || savedMode.mode === "transit" || savedMode.mode === "driving") setMode(savedMode.mode);
        setSavedMessage("Rota salva aberta. O trânsito pode estar desatualizado.");
      }).catch(() => { if (active) setError("Não foi possível abrir a rota salva."); });
    } else if (queryParams.has("origem") || queryParams.has("destino")) {
      setOrigin(queryParams.get("origem") ?? "");
      setDestination(queryParams.get("destino") ?? "");
    }
    return () => { active = false; };
  }, [queryParams, drivingMode]);

  useEffect(() => {
    const auto = queryParams.get("auto") === "1";
    const to = queryParams.get("destino")?.trim() ?? "";
    const from = queryParams.get("origem")?.trim() ?? "";
    if (!auto || to.length < 3 || savedMode || economyMode) return;
    const key = from + "::" + to + "::" + mode;
    if (autoSubmittedKey.current === key) return;
    autoSubmittedKey.current = key;
    const timer = window.setTimeout(() => plannerFormRef.current?.requestSubmit(), 0);
    return () => window.clearTimeout(timer);
  }, [queryParams, savedMode, economyMode, staticRuntime, mode]);

  const resolveCurrentOrigin = async () => {
    if (!navigator.geolocation) return null;
    setLocating(true);

    const requestPosition = (options: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

    try {
      let position: GeolocationPosition;
      try {
        position = await requestPosition({
          enableHighAccuracy: true,
          timeout: 6500,
          maximumAge: 300000,
        });
      } catch {
        position = await requestPosition({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 900000,
        });
      }
      return (
        position.coords.latitude.toFixed(5) +
        ", " +
        position.coords.longitude.toFixed(5)
      );
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let from = origin.trim();
    const to = destination.trim();

    if (to.length < 3) {
      setError("Preencha o destino com pelo menos 3 caracteres.");
      return;
    }
    if (from && from.toLocaleLowerCase("pt-BR") === to.toLocaleLowerCase("pt-BR")) {
      setError("Origem e destino precisam ser diferentes.");
      return;
    }

    if (!online) {
      const offlineRoutes = savedRoutes.length
        ? savedRoutes
        : await listOfflineRoutes().catch(() => []);
      const savedMatch = from
        ? findOfflineRouteByTrip(offlineRoutes, from, to) ??
          findOfflineRouteByDestination(offlineRoutes, to)
        : findOfflineRouteByDestination(offlineRoutes, to);
      if (savedMatch) {
        setOrigin(savedMatch.origin);
        setDestination(savedMatch.destination);
        setPlanned(savedMatch.payload as PlannedRoute);
        setShowMap(true);
        setFallbackReady(false);
        setError(null);
        setSavedMessage(
          from &&
            savedMatch.origin.trim().toLocaleLowerCase("pt-BR") !==
              from.toLocaleLowerCase("pt-BR")
            ? "Sem internet: abrimos a rota salva para este destino usando a origem gravada anteriormente."
            : "Sem internet: abrimos a cópia salva desta rota."
        );
        vibration(14);
        return;
      }
    }

    if (!from || isCurrentLocationLabel(from)) {
      setError(null);
      setSavedMessage("Identificando sua origem para calcular a rota…");
      const currentOrigin = await resolveCurrentOrigin();
      if (currentOrigin) {
        from = currentOrigin;
        setOrigin(currentOrigin);
      } else {
        setSavedMessage(null);
        setFallbackReady(true);
        setError(
          "Não conseguimos identificar sua origem. Toque em “Usar localização” ou digite um ponto de partida."
        );
        vibration(8);
        return;
      }
    }

    resetResult();
    const version = requestVersion.current;

    if (staticRuntime || mode !== "driving" || !online || isPreciseLocationText(from)) {
      setError(null);
      setFallbackReady(false);
      setPublicRoutePending(true);
      const publicOrigin = from;
      try {
        const resolvedOrigin = publicOrigin;
        const publicRoute = await calculatePublicRoute(privateOriginForRouting(resolvedOrigin), to, mode);
        if (version !== requestVersion.current) return;
        const publicPayload = buildPublicRoutePayload(publicRoute) as unknown as PlannedRoute;
        setPlanned(publicPayload);
        setShowMap(true);
        const baseMessage = publicRoute.source === "local-estimate"
          ? "Rota estimada localmente. A navegação externa deve ser usada para o trajeto e trânsito atualizados."
          : "Caminho pronto no próprio Trajeto. Distância e duração vêm da rede viária pública; trânsito ao vivo fica no navegador escolhido.";
        const autoSaved = await persistRouteLocally(publicPayload, resolvedOrigin, to);
        setSavedMessage(baseMessage + (autoSaved ? " Cópia offline criada automaticamente." : ""));
        if (resolvedOrigin) rememberTrip(privateOriginForHistory(resolvedOrigin), to);
        track("route_open", to);
        vibration(14);
        return;
      } catch (routeError) {
        if (version !== requestVersion.current) return;
        setSavedMessage(null);
        setFallbackReady(true);
        setError(routeError instanceof Error ? routeError.message : "Não foi possível calcular a rota pública.");
        if (publicOrigin) rememberTrip(privateOriginForHistory(publicOrigin), to);
        vibration(8);
        return;
      } finally {
        if (version === requestVersion.current) setPublicRoutePending(false);
      }
    }

    setError(null);
    setSavedMessage(null);
    setFallbackReady(false);
    setShowMap(false);
    rememberTrip(privateOriginForHistory(from), to);
    track("route_open", to);
    try {
      const result = await planRoute.mutateAsync({ origin: from, destination: to });
      if (version !== requestVersion.current) return;
      setPlanned(result);
      setShowMap(true);
      setFallbackReady(false);
      const autoSaved = await persistRouteLocally(result, from, to);
      if (version !== requestVersion.current) return;
      if (autoSaved) setSavedMessage("Caminho pronto e salva automaticamente neste aparelho.");
      vibration(14);
    } catch {
      if (version !== requestVersion.current) return;
      setPublicRoutePending(true);
      try {
        const publicRoute = await calculatePublicRoute(privateOriginForRouting(from), to, "driving");
        if (version !== requestVersion.current) return;
        const publicPayload = buildPublicRoutePayload(publicRoute) as unknown as PlannedRoute;
        setPlanned(publicPayload);
        setShowMap(true);
        setError(null);
        setFallbackReady(false);
        const autoSaved = await persistRouteLocally(publicPayload, from, to);
        setSavedMessage(
          (publicRoute.source === "local-estimate"
            ? "O roteador principal não respondeu; usamos uma estimativa local."
            : "O roteador principal não respondeu; usamos a rota pública de contingência.") +
            (autoSaved ? " Cópia offline criada automaticamente." : "")
        );
        vibration(14);
      } catch (routeError) {
        if (version !== requestVersion.current) return;
        setError(
          routeError instanceof Error
            ? routeError.message
            : "Não foi possível calcular a rota automaticamente."
        );
        setFallbackReady(true);
        vibration(8);
      } finally {
        if (version === requestVersion.current) setPublicRoutePending(false);
      }
    }
  };

  const useCurrentLocation = async () => {
    if (locating) return;
    const currentOrigin = await resolveCurrentOrigin();
    if (!currentOrigin) {
      setError("Não foi possível obter sua localização. Digite a origem ou tente novamente.");
      return;
    }
    resetResult();
    setOrigin(currentOrigin);
    vibration(14);
  };

  const swap = () => {
    resetResult();
    setOrigin(destination);
    setDestination(origin);
    vibration();
  };

  const clear = () => {
    resetResult();
    setOrigin("");
    setDestination("");
  };

  const persistRouteLocally = async (route: PlannedRoute, routeOrigin: string, routeDestination: string) => {
    const normalizedOrigin = privateOriginForHistory(routeOrigin);
    const normalizedDestination = routeDestination.trim();
    if (normalizedOrigin.length < 2 || normalizedDestination.length < 2) return false;
    try {
      await saveOfflineRoute({
        id: offlineRouteId(normalizedOrigin, normalizedDestination),
        origin: normalizedOrigin,
        destination: normalizedDestination,
        savedAt: new Date().toISOString(),
        payload: route,
      });
      refreshSavedRoutes();
      return true;
    } catch {
      return false;
    }
  };

  const saveCurrentRoute = async () => {
    if (!planned) return;
    const saved = await persistRouteLocally(planned, origin, destination);
    if (saved) {
      setSavedMessage("Cópia offline atualizada neste aparelho.");
      vibration(16);
    } else {
      setSavedMessage("Não foi possível salvar a rota neste aparelho.");
    }
  };

  const openSavedRoute = (route: OfflineRoute) => {
    setLocation(appUrl("/planejar") + "?rota=" + encodeURIComponent(route.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeSavedRoute = async (route: OfflineRoute) => {
    try {
      await removeOfflineRoute(route.id);
      refreshSavedRoutes();
    } catch { setSavedMessage("Não foi possível excluir a rota. Tente novamente."); }
  };

  const shareRoute = async () => {
    if (!planned) return;
    try {
      const text = buildRouteShareText(origin, destination, planned.recommendation ? {
        name: planned.recommendation.name,
        price: planned.recommendation.price,
        detourKm: planned.recommendation.detourKm,
        detourSource: planned.recommendation.detourSource,
      } : null);
      const params = new URLSearchParams({
        destino: destination.trim(),
        modo: mode,
      });
      const safeOrigin = privateOriginForUrl(origin);
      if (safeOrigin) params.set("origem", safeOrigin);
      const url = window.location.origin + appUrl("/planejar") + "?" + params.toString();
      await shareText(text, url, "Trajeto · rota");
      setSavedMessage("Rota compartilhada.");
    } catch {}
  };

  const openExternal = (provider: "google" | "waze" | "apple") => {
    const googleMode = mode === "walking" ? "walking" : mode === "cycling" ? "bicycling" : mode === "transit" ? "transit" : "driving";
    const externalOrigin = privateOriginForExternalNavigation(origin);
    const target = provider === "google"
      ? buildGoogleMapsDirectionsUrl(externalOrigin, destination, googleMode, true)
      : provider === "waze"
        ? buildWazeNavigationUrl(destination)
        : buildAppleMapsDirectionsUrl(destination, externalOrigin);
    window.open(target, "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };
  const openPreferredNavigation = () => {
    openExternal(getPreferredNavigationProvider());
  };

  const openStation = (stop: PlannedRoute["stops"][number] | undefined) => {
    if (!stop) { setSavedMessage("Não há endereço disponível para esta parada."); return; }
    window.open(buildGoogleMapsDirectionsUrl(privateOriginForExternalNavigation(origin), stop.address || stop.name, "driving", true), "_blank", "noopener,noreferrer");
  };

  const availableDestinations = useMemo(() => {
    const query = destinationFilter.trim().toLocaleLowerCase("pt-BR");
    return ALL_LOCAL_ROUTE_DESTINATIONS.filter(item => {
      if (destinationCategory !== "todos" && item.category !== destinationCategory) return false;
      if (!query) return true;
      return (item.label + " " + item.detail + " " + item.destination).toLocaleLowerCase("pt-BR").includes(query);
    });
  }, [destinationFilter, destinationCategory]);

  const filteredSavedRoutes = useMemo(() => {
    const query = savedRouteQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return savedRoutes;
    return savedRoutes.filter(route =>
      (route.origin + " " + route.destination).toLocaleLowerCase("pt-BR").includes(query)
    );
  }, [savedRoutes, savedRouteQuery]);

  const publicRouteSource = planned
    ? (planned.route as typeof planned.route & { source?: "osrm" | "local-estimate" }).source
    : undefined;

  const routeForMap = planned ? [{
    id: "principal",
    polyline: planned.route.polyline ?? null,
    selected: true,
    trafficIntervals: [],
    durationSeconds: planned.route.durationSeconds,
    distanceMeters: planned.route.distanceMeters,
  }] : [];

  return (
    <main className="min-h-[100dvh] bg-[#0D1418] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="soft-kicker text-xs text-[#B7D86B]">Seu caminho</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.035em]">Para onde você vai?</h1>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black " + (online ? "border-[#B7D86B]/20 text-[#B7D86B]" : "border-[#D8B47A]/25 text-[#D8B47A]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!savedMode && !online && (
          <section className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-[#D8B47A]/20 bg-[#D8B47A]/[.05] p-3" aria-label="Rotas disponíveis offline">
            <div className="flex min-w-0 gap-2.5">
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[#D8B47A]" />
              <div>
                <p className="text-sm font-bold">
                  {savedRoutes.length
                    ? `${savedRoutes.length} rota${savedRoutes.length === 1 ? "" : "s"} pronta${savedRoutes.length === 1 ? "" : "s"} sem internet`
                    : "Nenhuma rota salva ainda"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  {savedRoutes.length
                    ? "Digite um destino já salvo e o Trajeto abre a cópia local automaticamente."
                    : "Rotas novas podem depender de dados consultados antes. Salve seus trajetos mais usados quando estiver online."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation(appUrl("/salvos"))}
              className="min-h-11 shrink-0 rounded-xl border border-white/10 px-3 text-xs font-bold text-white/75"
            >
              Ver salvas
            </button>
          </section>
        )}

        {!savedMode && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#141E23] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form ref={plannerFormRef} onSubmit={submit}>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-white/65">Origem <span className="font-medium normal-case tracking-normal text-white/45">· opcional</span></span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0D1418] px-3">
                  <span className="size-2.5 rounded-full bg-[#79C6D0]" />
                  <input value={origin} onChange={event => { resetResult(); setOrigin(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/60" placeholder="Seu ponto de partida" autoComplete="street-address" enterKeyHint="next" autoCapitalize="words" autoCorrect="off" />
                  <button type="button" onClick={useCurrentLocation} disabled={locating} className="grid size-11 place-items-center text-[#79C6D0] disabled:opacity-25" aria-label="Usar localização atual"><LocateFixed className="size-4" /></button>
                </div>
                <p className="mt-1.5 text-xs leading-snug text-white/50">Se deixar vazio, tentamos usar a localização deste aparelho.</p>
              </label>

              <div className="my-2 flex justify-end">
                <button type="button" onClick={swap} disabled={!origin && !destination} className="grid size-11 place-items-center rounded-full border border-white/8 text-white/65 disabled:opacity-25" aria-label="Inverter origem e destino">
                  <ArrowLeftRight className="size-4" />
                </button>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-white/65">Destino</span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#B7D86B]/18 bg-[#0D1418] px-3">
                  <span className="size-2.5 rounded-full bg-[#B7D86B]" />
                  <input value={destination} onChange={event => { resetResult(); setDestination(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/60" placeholder="Digite o destino" autoComplete="street-address" enterKeyHint="go" autoCapitalize="words" autoCorrect="off" />
                </div>
              </label>

              <div className="mt-3">
                <button type="button" onClick={() => setShowAllDestinations(value => !value)} aria-expanded={showAllDestinations} aria-controls="all-destinations-panel" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#79C6D0]/15 bg-[#79C6D0]/[.04] px-3 text-left">
                  <span><span className="block soft-kicker text-xs text-[#79C6D0]">Destinos de Águas Lindas</span><span className="mt-0.5 block text-xs font-bold text-white/75">Saúde, serviços, compras, transporte e referências locais</span></span>
                  <ChevronDown className={"size-4 text-[#79C6D0] transition-transform " + (showAllDestinations ? "rotate-180" : "")} />
                </button>
                {showAllDestinations && (
                  <div id="all-destinations-panel" className="mt-2 rounded-2xl border border-white/8 bg-[#111A1F] p-3">
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                      {([
                        ["todos", "Todos"],
                        ["alimentacao", "Comer"],
                        ["saude", "Saúde"],
                        ["servicos", "Serviços"],
                        ["transporte", "Transporte"],
                        ["compras", "Compras"],
                        ["combustivel", "Combustível"],
                        ["centro", "Centro"],
                      ] as const).map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setDestinationCategory(value)} aria-pressed={destinationCategory === value} className={"min-h-11 shrink-0 rounded-full border px-3 text-xs font-black " + (destinationCategory === value ? "border-[#B7D86B]/35 bg-[#B7D86B]/10 text-[#DFFF9A]" : "border-white/8 bg-white/[.02] text-white/65")}>{label}</button>
                      ))}
                    </div>
                    <input value={destinationFilter} onChange={event => setDestinationFilter(event.target.value)} aria-label="Filtrar todos os destinos disponíveis" placeholder="Filtrar destino, bairro ou serviço" className="mt-2 min-h-11 w-full rounded-xl border border-white/8 bg-[#0D1418] px-3 text-sm text-white outline-none placeholder:text-white/60" autoComplete="off" autoCapitalize="none" autoCorrect="off" inputMode="search" enterKeyHint="search" />
                    <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" tabIndex={0} aria-label="Lista de destinos disponíveis">
                      {availableDestinations.map(item => (
                        <button key={item.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(item.destination) + "&auto=1")} className="flex min-h-[4.6rem] items-center gap-3 rounded-xl border border-white/8 bg-[#141E23] px-3 text-left">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#79C6D0]/10 text-[#79C6D0]"><RouteIcon className="size-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block line-clamp-2 break-words text-sm font-bold leading-snug">{item.label}</span><span className="mt-0.5 block line-clamp-2 break-words text-xs leading-snug text-white/65">{item.detail}</span></span>
                          <span className="text-xs font-black uppercase tracking-[.08em] text-[#B7D86B]">Ir</span>
                        </button>
                      ))}
                      {availableDestinations.length === 0 && <p className="rounded-xl bg-white/[.025] p-4 text-xs text-white/65">Nenhum destino corresponde ao filtro.</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getLastTrip() && <button type="button" onClick={() => { const trip = getLastTrip(); if (!trip) return; setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination) + "&auto=1"); }} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-xs font-bold text-white/60">Última rota</button>}
                <button type="button" onClick={clear} disabled={!origin && !destination} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-xs font-bold text-white/65 disabled:opacity-30">Limpar</button>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[.14em] text-white/65">Modo</span>
                  <span className="text-xs font-bold text-white/25">{mode === "driving" ? "carro" : mode === "walking" ? "a pé" : mode === "cycling" ? "bicicleta" : "transporte"}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    ["driving", "Carro", Car],
                    ["walking", "A pé", PersonStanding],
                    ["cycling", "Bicicleta", Bike],
                    ["transit", "Transporte", Bus],
                  ] as const).map(([value, label, Icon]) => (
                    <button key={value} type="button" onClick={() => { resetResult(); setMode(value); }} className={"flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-black " + (mode === value ? "border-[#B7D86B]/30 bg-[#B7D86B]/10 text-[#B7D86B]" : "border-white/8 bg-white/[.02] text-white/65")}>
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={planRoute.isPending || publicRoutePending || destination.trim().length < 3} className="mt-4 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#B7D86B] px-4 text-sm font-black text-[#0B1014] disabled:opacity-35 active:scale-[.99]">
                <span>{planRoute.isPending || publicRoutePending ? "Calculando rota…" : "Calcular rota"}</span>
                {planRoute.isPending || publicRoutePending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" /> : <Navigation className="size-5" />}
              </button>
              {destination.trim().length >= 3 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openExternal("google")} aria-label="Abrir Google Maps agora" className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-xs font-black text-white/75">
                    Google
                  </button>
                  <button type="button" onClick={() => openExternal("waze")} aria-label="Abrir Waze agora" className="min-h-11 rounded-xl border border-[#79C6D0]/20 bg-[#79C6D0]/[.04] px-2 text-xs font-black text-[#C7E9ED]">
                    Waze
                  </button>
                  <button type="button" onClick={() => openExternal("apple")} aria-label="Abrir Apple Maps agora" className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-xs font-black text-white/75">
                    Apple
                  </button>
                </div>
              )}
            </form>

            {error && (
              <div className="mt-3 rounded-2xl border border-[#D8B47A]/20 bg-[#D8B47A]/[.05] p-3" role="alert">
                <p className="text-xs font-bold text-[#FFD59B]">{error}</p>
                {!online && destination.trim() && <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination), "_blank", "noopener,noreferrer")} className="mt-2 min-h-11 rounded-xl border border-[#D8B47A]/25 px-3 text-xs font-black text-[#FFD59B]">Abrir no Google Maps</button>}
              </div>
            )}
          </section>
        )}

        {economyMode && !savedMode && !planned && (
          <section className="mt-4 rounded-[1.6rem] border border-[#B7D86B]/15 bg-[#141E23] p-4" aria-labelledby="economy-mode-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]"><Fuel className="size-5" /></div>
              <div><p className="text-xs font-black uppercase tracking-[.15em] text-[#B7D86B]">Modo economia</p><h2 id="economy-mode-title" className="mt-1 text-lg font-black">Calculadora pronta.</h2><p className="mt-1 text-xs leading-relaxed text-white/65">Informe distância, preço e consumo para calcular custo por viagem, mês e autonomia. Os valores ficam salvos neste aparelho.</p></div>
            </div>
          </section>
        )}

        {economyMode && !savedMode && !planned && <LocalRouteCalculator compact />}

        {drivingMode && !savedMode && (
          <section className="mt-4 rounded-2xl border border-[#79C6D0]/15 bg-[#79C6D0]/[.04] px-4 py-3" role="status" aria-live="polite">
            <p className="text-xs font-black text-[#C7E9ED]">Modo condução ativo</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">O Trajeto deixa a tela focada na viagem e mantém Google Maps, Waze e Apple Maps como opções de navegação atualizada.</p>
          </section>
        )}

        {savedMode && (
          <section className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-[#BDA5FF]">Biblioteca local</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.055em]">Rotas salvas.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs font-black text-white/65">{savedRoutes.length + savedStations.length}</span>
            </div>
            {savedMessage && <p role="status" className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70">{savedMessage}</p>}
            {savedRoutes.length > 0 && (
              <label className="mt-3 block">
                <span className="sr-only">Filtrar rotas salvas</span>
                <input
                  value={savedRouteQuery}
                  onChange={event => setSavedRouteQuery(event.target.value)}
                  placeholder="Filtrar por origem ou destino"
                  className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0D1418] px-3 text-sm text-white outline-none placeholder:text-white/60"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="search"
                  enterKeyHint="search"
                />
              </label>
            )}
            {savedRoutes.length === 0 && savedStations.length === 0 ? (
              <>
                <div className="mt-4 rounded-3xl border border-[#D8B47A]/20 bg-[#141E23] p-4">
                  <p className="text-xs font-black text-white">Biblioteca vazia, mas o modo offline continua útil.</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/42">Os atalhos abaixo são destinos locais preparados no próprio app. Para uma rota realmente disponível sem internet, calcule com origem e destino quando estiver conectado e salve automaticamente.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <a href="tel:190" className="min-h-11 rounded-xl border border-white/8 bg-[#0D1418] px-2 py-2 text-center text-xs font-black">Polícia · 190</a>
                    <a href="tel:192" className="min-h-11 rounded-xl border border-white/8 bg-[#0D1418] px-2 py-2 text-center text-xs font-black">SAMU · 192</a>
                    <a href="tel:193" className="min-h-11 rounded-xl border border-white/8 bg-[#0D1418] px-2 py-2 text-center text-xs font-black">Bombeiros · 193</a>
                  </div>
                </div>
                <section className="mt-4" aria-labelledby="offline-ready-title">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-[.14em] text-[#79C6D0]">Destinos prontos</p><h3 id="offline-ready-title" className="mt-1 text-lg font-black">Abra uma rota sem preencher tudo.</h3></div>
                    <span className="text-xs text-white/25">catálogo incorporado</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {LOCAL_ROUTE_PRESETS.slice(0, 12).map(route => (
                      <button key={route.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(route.destination) + "&auto=1")} className="min-h-[5.2rem] rounded-2xl border border-white/8 bg-[#141E23] p-3 text-left">
                        <p className="line-clamp-2 break-words text-sm font-bold leading-snug">{route.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/65">{route.detail}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : savedRoutes.length > 0 && filteredSavedRoutes.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-white/8 bg-[#141E23] p-5 text-sm leading-relaxed text-white/65">
                Nenhuma rota corresponde ao filtro.
              </div>
            ) : (
              filteredSavedRoutes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filteredSavedRoutes.map(route => {
                    const stale = isOfflineRouteStale(route.savedAt);
                    return (
                      <article key={route.id} className="rounded-2xl border border-white/8 bg-[#141E23] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 break-words text-sm font-bold leading-snug">{route.origin} → {route.destination}</p>
                            <p className="mt-1 text-xs text-white/65">Salva em {new Date(route.savedAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <span className={"shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase tracking-[.08em] " + (stale ? "border-amber-300/20 text-amber-200" : "border-[#B7D86B]/15 text-[#B7D86B]")}>
                            {stale ? "revisar" : "pronta"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openSavedRoute(route)} className="min-h-11 rounded-xl bg-[#B7D86B] px-3 text-xs font-black text-[#0B1014]">Abrir rota</button>
                          <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(route.origin, route.destination, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Começar navegação</button>
                        </div>
                        <button type="button" onClick={() => void removeSavedRoute(route)} aria-label={"Excluir rota salva " + route.destination} className="mt-2 min-h-11 w-full rounded-xl border border-[#FF7D6A]/20 text-xs font-black text-[#FFB7A9]"><Trash2 className="mr-1.5 inline size-3.5" />Excluir da biblioteca</button>
                      </article>
                    );
                  })}
                </div>
              )
            )}
          </section>
        )}

        {savedMode && savedStations.length > 0 && (
          <section className="mt-5" aria-labelledby="saved-stations-title">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-[#79C6D0]">Postos favoritos</p><h2 id="saved-stations-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Seus postos.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs font-black text-white/65">{savedStations.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedStations.map(station => (
                <article key={station.placeId} className="rounded-2xl border border-white/8 bg-[#141E23] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-bold leading-snug">{station.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/65">{station.address}</p>
                      {station.isOpen != null && <p className={"mt-2 text-xs font-black " + (station.isOpen ? "text-[#B7D86B]" : "text-white/65")}>{station.isOpen ? "Aberto na consulta salva" : "Fechado na consulta salva"}</p>}
                    </div>
                    <button type="button" onClick={() => { const result = toggleMobileStationFavorite(station); if (result.error) setSavedMessage("Não foi possível alterar o favorito. Confira o espaço e as permissões do navegador."); else setSavedStations(result.stations); }} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/8 text-[#B7D86B]" aria-label={"Remover " + station.name + " dos favoritos"}><Bookmark className="size-4 fill-current" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl("", station.lat + "," + station.lng, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-[#B7D86B] px-3 text-xs font-black text-[#0B1014]">Ir agora</button>
                    <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(station.address || station.name))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Planejar</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {fallbackReady && !planned && !savedMode && destination.trim() && (
          <section className="mt-5 rounded-[1.6rem] border border-[#79C6D0]/20 bg-[#0F1A20] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="navigation-fallback-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#79C6D0]/10 text-[#79C6D0]"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-[#79C6D0]">Navegação pronta</p>
                <h2 id="navigation-fallback-title" className="mt-1 text-lg font-black">{staticRuntime ? "Navegação pronta para este site estático." : "O serviço de cálculo não respondeu, mas sua viagem não ficou travada."}</h2>
                <p className="mt-2 text-xs leading-relaxed text-white/65">{staticRuntime ? "O site público prepara a viagem sem fingir um cálculo próprio. Ao escolher o navegador, ele recebe origem e destino e calcula distância, trânsito e chegada atualizados." : "Nenhuma distância, tempo ou pedágio foi inventado. Para manter a informação correta, o Trajeto encaminha a rota para um navegador que faz o cálculo atualizado."}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#B7D86B] px-3 text-xs font-black text-[#0B1014]">Abrir Google Maps</button>
              <button type="button" onClick={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-[#D8B47A]/20 bg-[#D8B47A]/[.05] px-3 text-xs font-black text-[#FFD9AF]">Abrir Waze</button>
              <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(destination, origin), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black">Abrir Apple Maps</button>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-white/65">Esse modo é compatível com hospedagem estática, como GitHub Pages.</p>
          </section>
        )}

        {!savedMode && planned && (
          <section className="mt-5 animate-route-in">
            <div className="rounded-[1.6rem] border border-[#B7D86B]/15 bg-[#10191F] p-4 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="soft-kicker text-xs text-[#B7D86B]">Caminho pronto</p>
                  <h2 className="mt-1 line-clamp-3 break-words text-lg font-bold leading-snug sm:text-xl">{origin} → {destination}</h2>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-[#B7D86B]" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[.045] p-3"><RouteIcon className="size-4 text-[#79C6D0]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/65">Distância</p><p className="mt-1 text-base font-black">{formatDistance(planned.route.distanceMeters)}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[.045] p-3"><Navigation className="size-4 text-[#B7D86B]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/65">Tempo</p><p className="mt-1 text-base font-black">{formatDuration(planned.route.durationSeconds)}</p></div>
                <div className="col-span-2 rounded-2xl border border-white/8 bg-white/[.045] p-3 sm:col-span-1"><RefreshCw className="size-4 text-[#D8B47A]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/65">Chegada estimada</p><p className="mt-1 text-base font-black">{formatArrival(planned.route.durationSeconds)}</p></div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-xs font-black uppercase tracking-[.1em] text-white/65">Trânsito</p>
                  <p className="mt-1 text-xs font-black">{planned.traffic?.label ?? "Não informado"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{planned.traffic?.detail ?? "Sem detalhamento disponível."}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-xs font-black uppercase tracking-[.1em] text-white/65">Pedágio</p>
                  <p className="mt-1 text-xs font-black">Não informado</p>
                  <p className="mt-1 text-xs text-white/65">o retorno básico da rota não fornece pedágio</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={openPreferredNavigation} className="col-span-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#B7D86B] px-4 text-sm font-black text-[#0B1014] shadow-[0_12px_30px_rgba(199,255,60,.12)]">
                  <Navigation className="size-5" /> Começar navegação
                </button>
                <button type="button" onClick={() => void saveCurrentRoute()} className="min-h-12 rounded-2xl border border-[#79C6D0]/20 bg-[#79C6D0]/[.05] px-3 text-xs font-black text-[#C7E9ED]"><Bookmark className="mr-1.5 inline size-4" />Salvar offline</button>
                <button type="button" onClick={() => void shareRoute()} className="min-h-12 rounded-2xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-white/75"><Share2 className="mr-1.5 inline size-4" />Compartilhar</button>
                <button type="button" onClick={() => setShowMap(value => !value)} className="col-span-2 min-h-12 rounded-2xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-white/75"><Map className="mr-1.5 inline size-4" />{showMap ? "Ocultar mapa" : "Mostrar mapa"}</button>
              </div>
              <details className="mt-2 rounded-2xl border border-white/8 bg-white/[.02]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-black text-white/55">
                  <span>Escolher navegador</span><ChevronDown className="size-4" />
                </summary>
                <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                  <button type="button" onClick={() => openExternal("google")} className="min-h-11 rounded-xl border border-white/8 px-2 text-xs font-black text-white/75">Google</button>
                  <button type="button" onClick={() => openExternal("waze")} className="min-h-11 rounded-xl border border-[#79C6D0]/20 px-2 text-xs font-black text-[#C7E9ED]">Waze</button>
                  <button type="button" onClick={() => openExternal("apple")} className="min-h-11 rounded-xl border border-white/8 px-2 text-xs font-black text-white/75">Apple</button>
                </div>
              </details>

              {savedMessage && <p role="status" className="mt-3 rounded-xl bg-[#B7D86B]/[.05] px-3 py-2 text-xs font-bold text-[#D9FF91]">{savedMessage}</p>}
            </div>

            {showMap && (
              <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#141E23]">
                <div className="flex flex-col gap-2 border-b border-white/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="min-w-0">
                    <p className="soft-kicker text-xs text-white/60">{online ? "Mapa do caminho" : "Mapa salvo"}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-white/65">{online ? "Ruas e geometria da rota no próprio Trajeto" : "Rota salva sem depender do mapa de ruas"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <button type="button" onClick={openPreferredNavigation} className="min-h-11 rounded-xl bg-[#B7D86B] px-3 text-sm font-bold text-[#0B1014]">Navegar</button>
                    <button type="button" onClick={() => setShowMap(false)} className="min-h-11 rounded-xl border border-white/8 px-3 text-sm font-bold text-white/70">Fechar</button>
                  </div>
                </div>
                <div className="h-[min(62dvh,520px)] min-h-[360px]">
                  <RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} routes={routeForMap} />
                </div>
              </section>
            )}

            {planned.recommendation && (
              <section className="mt-3 rounded-[1.5rem] border border-[#B7D86B]/15 bg-[#141E23] p-4">
                <p className="text-xs font-black uppercase tracking-[.15em] text-[#B7D86B]">Pode ser útil no caminho</p>
                <h3 className="mt-1 text-lg font-black">{planned.recommendation.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{planned.recommendation.detourSource === "real" ? "Desvio calculado pela rota real" : "Desvio estimado"} · {planned.recommendation.detourKm.toLocaleString("pt-BR")} km</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openStation(planned.stops.find(stop => stop.name === planned.recommendation?.name) ?? planned.stops[0])} className="min-h-11 rounded-xl bg-[#B7D86B] px-3 text-xs font-black text-[#0B1014]">Abrir rota até o posto</button>
                  <button type="button" onClick={() => setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(planned.recommendation?.name ?? ""))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Ver postos</button>
                </div>
              </section>
            )}

            {planned.stops.length > 0 && (
              <section className="mt-3">
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#79C6D0]">{publicRouteSource ? "No caminho" : "Paradas encontradas"}</p><h3 className="mt-1 text-2xl font-black tracking-[-.05em]">{planned.stops.length} posto(s)</h3></div><span className="text-xs text-white/65">{publicRouteSource ? "catálogo local · posição estimada no corredor" : "dados desta consulta"}</span></div>
                <div className="mt-3 space-y-2">
                  {planned.stops.slice(0, 6).map(stop => (
                    <article key={stop.placeId} className="rounded-2xl border border-white/8 bg-[#141E23] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="line-clamp-2 break-words text-sm font-bold leading-snug">{stop.name}</p><p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-white/65">{stop.address}</p></div>
                        <Fuel className="size-4 shrink-0 text-[#79C6D0]" />
                      </div>
                      {stop.priceReference && <p className="mt-2 text-xs font-bold text-[#D9FF91]">Referência ANP: {Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}
                      <button type="button" onClick={() => openStation(stop)} className="mt-3 min-h-11 w-full rounded-xl border border-white/8 bg-white/[.03] text-xs font-black text-white/70">Navegar até esta parada</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-3 rounded-3xl border border-white/8 bg-white/[.025] p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Detalhes da rota</span><ChevronDown className="size-4 text-white/65" /></summary>
                <div className="mt-3 grid gap-2 text-xs leading-relaxed text-white/65">
                  <p>Fonte da rota: {publicRouteSource === "local-estimate"
                    ? "estimativa local baseada nas coordenadas"
                    : staticRuntime
                      ? "rede viária OpenStreetMap/OSRM, calculada no navegador"
                      : "serviço de rota do Trajeto"}.</p>
                  <p>Referências de preço, quando presentes, são identificadas separadamente e têm data de coleta própria.</p>
                  <p>Tempo de chegada é uma estimativa calculada a partir da duração retornada; a navegação ao vivo fica sob responsabilidade do app externo escolhido.</p>
                </div>
              </details>
            </section>
          </section>
        )}

        {!savedMode && planned && (
          <LocalRouteCalculator initialDistanceKm={(planned.route.distanceMeters ?? 0) / 1000} compact />
        )}

        <section className="mt-8 pb-3 text-center text-xs leading-relaxed text-white/25">
          O Trajeto organiza dados e abre a navegação externa; ele não substitui Google Maps, Waze ou Apple Maps.
        </section>
      </div>
    </main>
  );
}
