import { ArrowLeftRight, Bike, Bookmark, Bus, Car, CheckCircle2, ChevronDown, ExternalLink, Fuel, Loader2, LocateFixed, Map, Navigation, PersonStanding, RefreshCw, Route as RouteIcon, Share2, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, rememberTrip } from "@/lib/mobilePreferences";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildWazeNavigationUrl, buildRouteShareText, shareText, vibration } from "@/lib/mobileTools";
import { getOfflineRoute, listOfflineRoutes, offlineRouteId, saveOfflineRoute, removeOfflineRoute, isOfflineRouteStale, type OfflineRoute } from "@/lib/offlineStore";
import { RouteMap } from "@/components/RouteMap";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";
import { ALL_LOCAL_ROUTE_DESTINATIONS, LOCAL_ROUTE_PRESETS } from "@/lib/localRoutePresets";
import { supportsLiveRouting } from "@/lib/runtimeCapabilities";
import { buildPublicRoutePayload, calculatePublicRoute, type PublicTravelMode } from "@/lib/publicRouting";

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
    if (!auto || to.length < 3 || savedMode || economyMode || (!staticRuntime && from.length < 3)) return;
    const key = from + "::" + to + "::" + mode;
    if (autoSubmittedKey.current === key) return;
    autoSubmittedKey.current = key;
    const timer = window.setTimeout(() => plannerFormRef.current?.requestSubmit(), 0);
    return () => window.clearTimeout(timer);
  }, [queryParams, savedMode, economyMode, staticRuntime, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = origin.trim();
    const to = destination.trim();

    if (to.length < 3) {
      setError("Preencha o destino com pelo menos 3 caracteres.");
      return;
    }
    if (!staticRuntime && from.length < 3) {
      setError("Preencha a origem com pelo menos 3 caracteres.");
      return;
    }
    if (from && from.toLocaleLowerCase("pt-BR") === to.toLocaleLowerCase("pt-BR")) {
      setError("Origem e destino precisam ser diferentes.");
      return;
    }
    if (!online && !staticRuntime) {
      setError("Sem internet. Para calcular uma rota nova no servidor, conecte-se ou abra uma rota salva.");
      return;
    }

    resetResult();
    const version = requestVersion.current;

    if (staticRuntime || mode !== "driving") {
      setError(null);
      setFallbackReady(false);
      setPublicRoutePending(true);
      const publicOrigin = from;
      try {
        let resolvedOrigin = publicOrigin;
        if (!resolvedOrigin) {
          if (version !== requestVersion.current) return;
          setFallbackReady(true);
          setSavedMessage("Destino preparado. Abra Google Maps, Waze ou Apple Maps para iniciar a navegação com a localização atual do aparelho.");
          rememberTrip("", to);
          track("route_open", to);
          vibration(12);
          return;
        }
        const publicRoute = await calculatePublicRoute(resolvedOrigin, to, mode);
        if (version !== requestVersion.current) return;
        const publicPayload = buildPublicRoutePayload(publicRoute) as unknown as PlannedRoute;
        setPlanned(publicPayload);
        setShowMap(true);
        const baseMessage = publicRoute.source === "local-estimate"
          ? "Rota estimada localmente. A navegação externa deve ser usada para o trajeto e trânsito atualizados."
          : "Rota calculada no próprio Trajeto. Distância e duração vêm da rede viária pública; trânsito ao vivo fica no navegador escolhido.";
        const autoSaved = await persistRouteLocally(publicPayload, resolvedOrigin, to);
        setSavedMessage(baseMessage + (autoSaved ? " Cópia offline criada automaticamente." : ""));
        if (resolvedOrigin) rememberTrip(resolvedOrigin, to);
        track("route_open", to);
        vibration(14);
        return;
      } catch (routeError) {
        if (version !== requestVersion.current) return;
        setSavedMessage(null);
        setFallbackReady(true);
        setError(routeError instanceof Error ? routeError.message : "Não foi possível calcular a rota pública.");
        if (publicOrigin) rememberTrip(publicOrigin, to);
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
    rememberTrip(from, to);
    track("route_open", to);
    try {
      const result = await planRoute.mutateAsync({ origin: from, destination: to });
      if (version !== requestVersion.current) return;
      setPlanned(result);
      setShowMap(true);
      setFallbackReady(false);
      const autoSaved = await persistRouteLocally(result, from, to);
      if (version !== requestVersion.current) return;
      if (autoSaved) setSavedMessage("Rota calculada e salva automaticamente neste aparelho.");
      vibration(14);
    } catch {
      if (version !== requestVersion.current) return;
      setError(null);
      setFallbackReady(true);
      vibration(8);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        resetResult();
        setOrigin(position.coords.latitude.toFixed(5) + ", " + position.coords.longitude.toFixed(5));
        vibration(14);
      },
      () => {
        setLocating(false);
        setError("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
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
    const normalizedOrigin = routeOrigin.trim();
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
      const url = window.location.origin + appUrl("/planejar") + "?origem=" + encodeURIComponent(origin.trim()) + "&destino=" + encodeURIComponent(destination.trim()) + "&modo=" + encodeURIComponent(mode);
      await shareText(text, url, "Trajeto · rota");
      setSavedMessage("Rota compartilhada.");
    } catch {}
  };

  const openExternal = (provider: "google" | "waze" | "apple") => {
    const googleMode = mode === "walking" ? "walking" : mode === "cycling" ? "bicycling" : mode === "transit" ? "transit" : "driving";
    const target = provider === "google"
      ? buildGoogleMapsDirectionsUrl(origin, destination, googleMode, true)
      : provider === "waze"
        ? buildWazeNavigationUrl(destination)
        : buildAppleMapsDirectionsUrl(destination, origin);
    window.open(target, "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };

  const openStation = (stop: PlannedRoute["stops"][number] | undefined) => {
    if (!stop) { setSavedMessage("Não há endereço disponível para esta parada."); return; }
    window.open(buildGoogleMapsDirectionsUrl(origin, stop.address || stop.name, "driving", true), "_blank", "noopener,noreferrer");
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
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#C7FF3C]">Planejador</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">Sua próxima saída.</h1>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black " + (online ? "border-[#C7FF3C]/20 text-[#C7FF3C]" : "border-[#FFB86B]/25 text-[#FFB86B]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!savedMode && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form ref={plannerFormRef} onSubmit={submit}>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-white/35">{staticRuntime ? "Origem · opcional" : "Origem"}</span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                  <span className="size-2.5 rounded-full bg-[#3DE3FF]" />
                  <input value={origin} onChange={event => { resetResult(); setOrigin(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="De onde você sai" autoComplete="street-address" enterKeyHint="next" autoCapitalize="words" autoCorrect="off" />
                  <button type="button" onClick={useCurrentLocation} disabled={locating} className="grid size-11 place-items-center text-[#3DE3FF] disabled:opacity-25" aria-label="Usar localização atual"><LocateFixed className="size-4" /></button>
                </div>
              </label>

              <div className="my-2 flex justify-end">
                <button type="button" onClick={swap} disabled={!origin && !destination} className="grid size-11 place-items-center rounded-full border border-white/8 text-white/45 disabled:opacity-25" aria-label="Inverter origem e destino">
                  <ArrowLeftRight className="size-4" />
                </button>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-white/35">Destino</span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#0B1014] px-3">
                  <span className="size-2.5 rounded-full bg-[#C7FF3C]" />
                  <input value={destination} onChange={event => { resetResult(); setDestination(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="Para onde você vai" autoComplete="street-address" enterKeyHint="go" autoCapitalize="words" autoCorrect="off" />
                </div>
              </label>

              <div className="mt-3">
                <button type="button" onClick={() => setShowAllDestinations(value => !value)} aria-expanded={showAllDestinations} aria-controls="all-destinations-panel" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-3 text-left">
                  <span><span className="block text-xs font-black uppercase tracking-[.12em] text-[#3DE3FF]">Destinos disponíveis</span><span className="mt-0.5 block text-xs font-bold text-white/75">Todos os {ALL_LOCAL_ROUTE_DESTINATIONS.length} destinos locais, lojas e referências, por categoria</span></span>
                  <ChevronDown className={"size-4 text-[#3DE3FF] transition-transform " + (showAllDestinations ? "rotate-180" : "")} />
                </button>
                {showAllDestinations && (
                  <div id="all-destinations-panel" className="mt-2 rounded-2xl border border-white/8 bg-[#0E161C] p-3">
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
                        <button key={value} type="button" onClick={() => setDestinationCategory(value)} aria-pressed={destinationCategory === value} className={"min-h-11 shrink-0 rounded-full border px-3 text-xs font-black " + (destinationCategory === value ? "border-[#C7FF3C]/35 bg-[#C7FF3C]/10 text-[#DFFF9A]" : "border-white/8 bg-white/[.02] text-white/50")}>{label}</button>
                      ))}
                    </div>
                    <input value={destinationFilter} onChange={event => setDestinationFilter(event.target.value)} aria-label="Filtrar todos os destinos disponíveis" placeholder="Filtrar destino, bairro ou serviço" className="mt-2 min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-sm text-white outline-none placeholder:text-white/25" autoComplete="off" autoCapitalize="none" autoCorrect="off" inputMode="search" enterKeyHint="search" />
                    <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" tabIndex={0} aria-label="Lista de destinos disponíveis">
                      {availableDestinations.map(item => (
                        <button key={item.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(item.destination) + "&auto=1")} className="flex min-h-[4.6rem] items-center gap-3 rounded-xl border border-white/8 bg-[#121B22] px-3 text-left">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#3DE3FF]/10 text-[#3DE3FF]"><RouteIcon className="size-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{item.label}</span><span className="mt-0.5 block truncate text-xs text-white/35">{item.detail}</span></span>
                          <span className="text-xs font-black uppercase tracking-[.08em] text-[#C7FF3C]">Ir</span>
                        </button>
                      ))}
                      {availableDestinations.length === 0 && <p className="rounded-xl bg-white/[.025] p-4 text-xs text-white/40">Nenhum destino corresponde ao filtro.</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getLastTrip() && <button type="button" onClick={() => { const trip = getLastTrip(); if (!trip) return; setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination) + "&auto=1"); }} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-xs font-bold text-white/60">Última rota</button>}
                <button type="button" onClick={clear} disabled={!origin && !destination} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-xs font-bold text-white/50 disabled:opacity-30">Limpar</button>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[.14em] text-white/35">Modo</span>
                  <span className="text-xs font-bold text-white/25">{mode === "driving" ? "carro" : mode === "walking" ? "a pé" : mode === "cycling" ? "bicicleta" : "transporte"}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    ["driving", "Carro", Car],
                    ["walking", "A pé", PersonStanding],
                    ["cycling", "Bicicleta", Bike],
                    ["transit", "Transporte", Bus],
                  ] as const).map(([value, label, Icon]) => (
                    <button key={value} type="button" onClick={() => { resetResult(); setMode(value); }} className={"flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-black " + (mode === value ? "border-[#C7FF3C]/30 bg-[#C7FF3C]/10 text-[#C7FF3C]" : "border-white/8 bg-white/[.02] text-white/45")}>
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={planRoute.isPending || publicRoutePending || destination.trim().length < 3} className="mt-4 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:opacity-35 active:scale-[.99]">
                <span>{planRoute.isPending || publicRoutePending ? "Calculando rota…" : "Calcular rota"}</span>
                {planRoute.isPending ? <Loader2 className="size-5 animate-spin" /> : <Navigation className="size-5" />}
              </button>
              {destination.trim().length >= 3 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openExternal("google")} aria-label="Abrir Google Maps agora" className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-xs font-black text-white/75">
                    Google
                  </button>
                  <button type="button" onClick={() => openExternal("waze")} aria-label="Abrir Waze agora" className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 text-xs font-black text-[#C9F7FF]">
                    Waze
                  </button>
                  <button type="button" onClick={() => openExternal("apple")} aria-label="Abrir Apple Maps agora" className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-xs font-black text-white/75">
                    Apple
                  </button>
                </div>
              )}
            </form>

            {error && (
              <div className="mt-3 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] p-3" role="alert">
                <p className="text-xs font-bold text-[#FFD59B]">{error}</p>
                {!online && destination.trim() && <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination), "_blank", "noopener,noreferrer")} className="mt-2 min-h-11 rounded-xl border border-[#FFB86B]/25 px-3 text-xs font-black text-[#FFD59B]">Abrir no Google Maps</button>}
              </div>
            )}
          </section>
        )}

        {economyMode && !savedMode && !planned && (
          <section className="mt-4 rounded-[1.6rem] border border-[#C7FF3C]/15 bg-[#121B22] p-4" aria-labelledby="economy-mode-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Fuel className="size-5" /></div>
              <div><p className="text-xs font-black uppercase tracking-[.15em] text-[#C7FF3C]">Modo economia</p><h2 id="economy-mode-title" className="mt-1 text-lg font-black">Calculadora pronta.</h2><p className="mt-1 text-xs leading-relaxed text-white/45">Informe distância, preço e consumo para calcular custo por viagem, mês e autonomia. Os valores ficam salvos neste aparelho.</p></div>
            </div>
          </section>
        )}

        {economyMode && !savedMode && !planned && <LocalRouteCalculator compact />}

        {drivingMode && !savedMode && (
          <section className="mt-4 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-4 py-3" role="status" aria-live="polite">
            <p className="text-xs font-black text-[#C9F7FF]">Modo condução ativo</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">O Trajeto deixa a tela focada na viagem e mantém Google Maps, Waze e Apple Maps como opções de navegação atualizada.</p>
          </section>
        )}

        {savedMode && (
          <section className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-[#BDA5FF]">Biblioteca local</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.055em]">Rotas salvas.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs font-black text-white/35">{savedRoutes.length + savedStations.length}</span>
            </div>
            {savedMessage && <p role="status" className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70">{savedMessage}</p>}
            {savedRoutes.length > 0 && (
              <label className="mt-3 block">
                <span className="sr-only">Filtrar rotas salvas</span>
                <input
                  value={savedRouteQuery}
                  onChange={event => setSavedRouteQuery(event.target.value)}
                  placeholder="Filtrar por origem ou destino"
                  className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-sm text-white outline-none placeholder:text-white/25"
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
                <div className="mt-4 rounded-3xl border border-[#FFB86B]/20 bg-[#121B22] p-4">
                  <p className="text-xs font-black text-white">Biblioteca vazia, mas o modo offline continua útil.</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/42">Os atalhos abaixo são destinos locais preparados no próprio app. Para uma rota realmente disponível sem internet, calcule com origem e destino quando estiver conectado e salve automaticamente.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <a href="tel:190" className="min-h-11 rounded-xl border border-white/8 bg-[#0B1014] px-2 py-2 text-center text-xs font-black">Polícia · 190</a>
                    <a href="tel:192" className="min-h-11 rounded-xl border border-white/8 bg-[#0B1014] px-2 py-2 text-center text-xs font-black">SAMU · 192</a>
                    <a href="tel:193" className="min-h-11 rounded-xl border border-white/8 bg-[#0B1014] px-2 py-2 text-center text-xs font-black">Bombeiros · 193</a>
                  </div>
                </div>
                <section className="mt-4" aria-labelledby="offline-ready-title">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-[.14em] text-[#3DE3FF]">Destinos prontos</p><h3 id="offline-ready-title" className="mt-1 text-lg font-black">Abra uma rota sem preencher tudo.</h3></div>
                    <span className="text-xs text-white/25">catálogo incorporado</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {LOCAL_ROUTE_PRESETS.slice(0, 12).map(route => (
                      <button key={route.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(route.destination) + "&auto=1")} className="min-h-[5.2rem] rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left">
                        <p className="truncate text-xs font-black">{route.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/35">{route.detail}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : savedRoutes.length > 0 && filteredSavedRoutes.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-white/8 bg-[#121B22] p-5 text-sm leading-relaxed text-white/45">
                Nenhuma rota corresponde ao filtro.
              </div>
            ) : (
              filteredSavedRoutes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filteredSavedRoutes.map(route => {
                    const stale = isOfflineRouteStale(route.savedAt);
                    return (
                      <article key={route.id} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">{route.origin} → {route.destination}</p>
                            <p className="mt-1 text-xs text-white/35">Salva em {new Date(route.savedAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <span className={"shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase tracking-[.08em] " + (stale ? "border-amber-300/20 text-amber-200" : "border-[#C7FF3C]/15 text-[#C7FF3C]")}>
                            {stale ? "revisar" : "pronta"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openSavedRoute(route)} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir rota</button>
                          <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(route.origin, route.destination, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Navegar agora</button>
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
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-[#3DE3FF]">Postos favoritos</p><h2 id="saved-stations-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Seus postos.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs font-black text-white/35">{savedStations.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedStations.map(station => (
                <article key={station.placeId} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{station.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/40">{station.address}</p>
                      {station.isOpen != null && <p className={"mt-2 text-xs font-black " + (station.isOpen ? "text-[#C7FF3C]" : "text-white/35")}>{station.isOpen ? "Aberto na consulta salva" : "Fechado na consulta salva"}</p>}
                    </div>
                    <button type="button" onClick={() => { const result = toggleMobileStationFavorite(station); if (result.error) setSavedMessage("Não foi possível alterar o favorito. Confira o espaço e as permissões do navegador."); else setSavedStations(result.stations); }} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/8 text-[#C7FF3C]" aria-label={"Remover " + station.name + " dos favoritos"}><Bookmark className="size-4 fill-current" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl("", station.lat + "," + station.lng, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Ir agora</button>
                    <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(station.address || station.name))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Planejar</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {fallbackReady && !planned && !savedMode && destination.trim() && (
          <section className="mt-5 rounded-[1.6rem] border border-[#3DE3FF]/20 bg-[#0F1A20] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="navigation-fallback-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-[#3DE3FF]">Navegação pronta</p>
                <h2 id="navigation-fallback-title" className="mt-1 text-lg font-black">{staticRuntime ? "Navegação pronta para este site estático." : "O serviço de cálculo não respondeu, mas sua viagem não ficou travada."}</h2>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{staticRuntime ? "O site público prepara a viagem sem fingir um cálculo próprio. Ao escolher o navegador, ele recebe origem e destino e calcula distância, trânsito e chegada atualizados." : "Nenhuma distância, tempo ou pedágio foi inventado. Para manter a informação correta, o Trajeto encaminha a rota para um navegador que faz o cálculo atualizado."}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir Google Maps</button>
              <button type="button" onClick={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] px-3 text-xs font-black text-[#FFD9AF]">Abrir Waze</button>
              <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(destination, origin), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black">Abrir Apple Maps</button>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-white/30">Esse modo é compatível com hospedagem estática, como GitHub Pages.</p>
          </section>
        )}

        {!savedMode && planned && (
          <section className="mt-5 animate-route-in">
            <div className="rounded-[1.6rem] border border-[#C7FF3C]/15 bg-[#10191F] p-4 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-[#C7FF3C]">Rota calculada</p>
                  <h2 className="mt-1 truncate text-xl font-black">{origin} → {destination}</h2>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-[#C7FF3C]" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/[.045] p-3"><RouteIcon className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/30">Distância</p><p className="mt-1 text-sm font-black">{formatDistance(planned.route.distanceMeters)}</p></div>
                <div className="rounded-2xl bg-white/[.045] p-3"><Navigation className="size-3.5 text-[#C7FF3C]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/30">Tempo</p><p className="mt-1 text-sm font-black">{formatDuration(planned.route.durationSeconds)}</p></div>
                <div className="rounded-2xl bg-white/[.045] p-3"><RefreshCw className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-xs font-black uppercase tracking-[.1em] text-white/30">Chegada</p><p className="mt-1 text-sm font-black">{formatArrival(planned.route.durationSeconds)}</p></div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-xs font-black uppercase tracking-[.1em] text-white/30">Trânsito</p>
                  <p className="mt-1 text-xs font-black">{planned.traffic?.label ?? "Não informado"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/35">{planned.traffic?.detail ?? "Sem detalhamento disponível."}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-xs font-black uppercase tracking-[.1em] text-white/30">Pedágio</p>
                  <p className="mt-1 text-xs font-black">Não informado</p>
                  <p className="mt-1 text-xs text-white/35">o retorno básico da rota não fornece pedágio</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => openExternal("google")} className="min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Google Maps</button>
                <button type="button" onClick={() => openExternal("waze")} className="min-h-12 rounded-2xl border border-[#3DE3FF]/30 bg-[#3DE3FF]/[.06] px-3 text-xs font-black text-[#C9F7FF]">Waze</button>
                <button type="button" onClick={() => openExternal("apple")} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.03] px-3 text-xs font-black text-white/70">Apple Maps</button>
                <button type="button" onClick={() => void shareRoute()} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.03] px-3 text-xs font-black text-white/70"><Share2 className="mr-1.5 inline size-3.5" />Compartilhar</button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void saveCurrentRoute()} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.02] px-3 text-xs font-black text-white/60"><Bookmark className="mr-1.5 inline size-3.5" />Salvar offline</button>
                <button type="button" onClick={() => setShowMap(value => !value)} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.02] px-3 text-xs font-black text-white/60"><Map className="mr-1.5 inline size-3.5" />{showMap ? "Ocultar mapa" : "Ver mapa"}</button>
              </div>

              {savedMessage && <p role="status" className="mt-3 rounded-xl bg-[#C7FF3C]/[.05] px-3 py-2 text-xs font-bold text-[#D9FF91]">{savedMessage}</p>}
            </div>

            {showMap && (
              <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#121B22]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[.15em] text-white/35">Mapa da rota</p>
                  <button type="button" onClick={() => setShowMap(false)} className="text-xs font-bold text-white/45">Fechar</button>
                </div>
                <div className="h-[min(68vh,520px)]">
                  <RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} routes={routeForMap} />
                </div>
              </section>
            )}

            {planned.recommendation && (
              <section className="mt-3 rounded-[1.5rem] border border-[#C7FF3C]/15 bg-[#121B22] p-4">
                <p className="text-xs font-black uppercase tracking-[.15em] text-[#C7FF3C]">Parada sugerida</p>
                <h3 className="mt-1 text-lg font-black">{planned.recommendation.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/45">{planned.recommendation.detourSource === "real" ? "Desvio calculado pela rota real" : "Desvio estimado"} · {planned.recommendation.detourKm.toLocaleString("pt-BR")} km</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openStation(planned.stops.find(stop => stop.name === planned.recommendation?.name) ?? planned.stops[0])} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir rota até o posto</button>
                  <button type="button" onClick={() => setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(planned.recommendation?.name ?? ""))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/70">Ver postos</button>
                </div>
              </section>
            )}

            {planned.stops.length > 0 && (
              <section className="mt-3">
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#3DE3FF]">{publicRouteSource ? "No caminho" : "Paradas encontradas"}</p><h3 className="mt-1 text-2xl font-black tracking-[-.05em]">{planned.stops.length} posto(s)</h3></div><span className="text-xs text-white/30">{publicRouteSource ? "catálogo local · posição estimada no corredor" : "dados desta consulta"}</span></div>
                <div className="mt-3 space-y-2">
                  {planned.stops.slice(0, 6).map(stop => (
                    <article key={stop.placeId} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-black">{stop.name}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/40">{stop.address}</p></div>
                        <Fuel className="size-4 shrink-0 text-[#3DE3FF]" />
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
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Mais detalhes da decisão</span><ChevronDown className="size-4 text-white/35" /></summary>
                <div className="mt-3 grid gap-2 text-xs leading-relaxed text-white/45">
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
