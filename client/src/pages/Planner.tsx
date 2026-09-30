import { ArrowLeftRight, Bookmark, CheckCircle2, ChevronDown, ExternalLink, Fuel, Loader2, LocateFixed, Map, Navigation, RefreshCw, Route as RouteIcon, Share2, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, rememberTrip } from "@/lib/mobilePreferences";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildWazeNavigationUrl, buildRouteShareText, shareText, vibration } from "@/lib/mobileTools";
import { getOfflineRoute, listOfflineRoutes, offlineRouteId, saveOfflineRoute, removeOfflineRoute, type OfflineRoute } from "@/lib/offlineStore";
import { RouteMap } from "@/components/RouteMap";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";
import { supportsLiveRouting } from "@/lib/runtimeCapabilities";
import { buildPublicRoutePayload, calculatePublicRoute } from "@/lib/publicRouting";

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
  const [origin, setOrigin] = useState(() => queryParams.get("origem") || getLastTrip()?.origin || "");
  const [destination, setDestination] = useState(() => queryParams.get("destino") || getLastTrip()?.destination || "");
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<OfflineRoute[]>([]);
  const [savedStations, setSavedStations] = useState<MobileStation[]>(listMobileStationFavorites);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const [publicRoutePending, setPublicRoutePending] = useState(false);
  const track = useProductEvents();
  const planRoute = trpc.routes.plan.useMutation();
  const staticRuntime = !supportsLiveRouting();
  const requestVersion = useRef(0);

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
        setSavedMessage("Rota salva aberta. O trânsito pode estar desatualizado.");
      }).catch(() => { if (active) setError("Não foi possível abrir a rota salva."); });
    } else if (queryParams.has("origem") || queryParams.has("destino")) {
      setOrigin(queryParams.get("origem") ?? "");
      setDestination(queryParams.get("destino") ?? "");
    }
    return () => { active = false; };
  }, [queryParams]);

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

    if (staticRuntime) {
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
        const publicRoute = await calculatePublicRoute(resolvedOrigin, to);
        if (version !== requestVersion.current) return;
        const publicPayload = buildPublicRoutePayload(publicRoute);
        setPlanned(publicPayload as unknown as PlannedRoute);
        setSavedMessage(
          publicRoute.source === "local-estimate"
            ? "Rota estimada localmente. A navegação externa deve ser usada para o trajeto e trânsito atualizados."
            : "Rota calculada no próprio Trajeto. Distância e duração vêm da rede viária pública; trânsito ao vivo fica no navegador escolhido.",
        );
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
      setFallbackReady(false);
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

  const saveCurrentRoute = async () => {
    if (!planned) return;
    try {
      const savedAt = new Date().toISOString();
      await saveOfflineRoute({
        id: offlineRouteId(origin, destination),
        origin: origin.trim(),
        destination: destination.trim(),
        savedAt,
        payload: planned,
      });
      setSavedMessage("Rota salva neste aparelho.");
      refreshSavedRoutes();
      vibration(16);
    } catch {
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
      const url = window.location.origin + appUrl("/planejar") + "?origem=" + encodeURIComponent(origin.trim()) + "&destino=" + encodeURIComponent(destination.trim());
      await shareText(text, url, "Trajeto · rota");
      setSavedMessage("Rota compartilhada.");
    } catch {}
  };

  const openExternal = (provider: "google" | "waze" | "apple") => {
    const target = provider === "google"
      ? buildGoogleMapsDirectionsUrl(origin, destination, "driving", true)
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
            <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#C7FF3C]">Planejador</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">Sua próxima saída.</h1>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.54rem] font-black " + (online ? "border-[#C7FF3C]/20 text-[#C7FF3C]" : "border-[#FFB86B]/25 text-[#FFB86B]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!savedMode && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form onSubmit={submit}>
              <label className="block">
                <span className="text-[0.56rem] font-black uppercase tracking-[.14em] text-white/35">{staticRuntime ? "Origem · opcional" : "Origem"}</span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                  <span className="size-2.5 rounded-full bg-[#3DE3FF]" />
                  <input value={origin} onChange={event => { resetResult(); setOrigin(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="De onde você sai" autoComplete="street-address" />
                  <button type="button" onClick={useCurrentLocation} disabled={locating} className="grid size-10 place-items-center text-[#3DE3FF] disabled:opacity-25" aria-label="Usar localização atual"><LocateFixed className="size-4" /></button>
                </div>
              </label>

              <div className="my-2 flex justify-end">
                <button type="button" onClick={swap} disabled={!origin && !destination} className="grid size-11 place-items-center rounded-full border border-white/8 text-white/45 disabled:opacity-25" aria-label="Inverter origem e destino">
                  <ArrowLeftRight className="size-4" />
                </button>
              </div>

              <label className="block">
                <span className="text-[0.56rem] font-black uppercase tracking-[.14em] text-white/35">Destino</span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#0B1014] px-3">
                  <span className="size-2.5 rounded-full bg-[#C7FF3C]" />
                  <input value={destination} onChange={event => { resetResult(); setDestination(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="Para onde você vai" autoComplete="street-address" />
                </div>
              </label>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getLastTrip() && <button type="button" onClick={() => { const trip = getLastTrip(); if (!trip) return; resetResult(); setOrigin(trip.origin); setDestination(trip.destination); }} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.58rem] font-bold text-white/60">Última rota</button>}
                <button type="button" onClick={clear} disabled={!origin && !destination} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.58rem] font-bold text-white/50 disabled:opacity-30">Limpar</button>
              </div>

              <button type="submit" disabled={planRoute.isPending || publicRoutePending || destination.trim().length < 3} className="mt-4 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:opacity-35 active:scale-[.99]">
                <span>{planRoute.isPending || publicRoutePending ? "Calculando rota…" : "Calcular rota"}</span>
                {planRoute.isPending ? <Loader2 className="size-5 animate-spin" /> : <Navigation className="size-5" />}
              </button>
              {destination.trim().length >= 3 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openExternal("google")} className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-[0.58rem] font-black text-white/75">
                    Google
                  </button>
                  <button type="button" onClick={() => openExternal("waze")} className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 text-[0.58rem] font-black text-[#C9F7FF]">
                    Waze
                  </button>
                  <button type="button" onClick={() => openExternal("apple")} className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-[0.58rem] font-black text-white/75">
                    Apple
                  </button>
                </div>
              )}
            </form>

            {error && (
              <div className="mt-3 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] p-3" role="alert">
                <p className="text-xs font-bold text-[#FFD59B]">{error}</p>
                {!online && destination.trim() && <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination), "_blank", "noopener,noreferrer")} className="mt-2 min-h-10 rounded-xl border border-[#FFB86B]/25 px-3 text-[0.62rem] font-black text-[#FFD59B]">Abrir no Google Maps</button>}
              </div>
            )}
          </section>
        )}

        {savedMode && (
          <section className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#BDA5FF]">Neste aparelho</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.055em]">Rotas salvas.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-[0.5rem] font-black text-white/35">{savedRoutes.length + savedStations.length}</span>
            </div>
            {savedMessage && <p role="status" className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70">{savedMessage}</p>}
            {savedRoutes.length === 0 && savedStations.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-white/8 bg-[#121B22] p-5 text-sm leading-relaxed text-white/45">
                Nenhuma rota salva ainda. Calcule uma rota e use “Salvar offline” para manter o plano neste aparelho.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {savedRoutes.map(route => (
                  <article key={route.id} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                    <p className="truncate text-xs font-black">{route.origin} → {route.destination}</p>
                    <p className="mt-1 text-[0.58rem] text-white/35">Salva em {new Date(route.savedAt).toLocaleString("pt-BR")}</p>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button type="button" onClick={() => openSavedRoute(route)} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir rota</button>
                      <button type="button" onClick={() => void removeSavedRoute(route)} aria-label="Excluir rota salva" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#FF7D6A]/25 text-[#FFB7A9]"><Trash2 className="size-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {savedMode && savedStations.length > 0 && (
          <section className="mt-5" aria-labelledby="saved-stations-title">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Postos favoritos</p><h2 id="saved-stations-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Seus postos.</h2></div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-[0.5rem] font-black text-white/35">{savedStations.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedStations.map(station => (
                <article key={station.placeId} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{station.name}</p>
                      <p className="mt-1 line-clamp-2 text-[0.62rem] leading-relaxed text-white/40">{station.address}</p>
                      {station.isOpen != null && <p className={"mt-2 text-[0.56rem] font-black " + (station.isOpen ? "text-[#C7FF3C]" : "text-white/35")}>{station.isOpen ? "Aberto na consulta salva" : "Fechado na consulta salva"}</p>}
                    </div>
                    <button type="button" onClick={() => { toggleMobileStationFavorite(station); setSavedStations(listMobileStationFavorites()); }} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-white/8 text-[#C7FF3C]" aria-label={"Remover " + station.name + " dos favoritos"}><Bookmark className="size-4 fill-current" /></button>
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
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Navegação pronta</p>
                <h2 id="navigation-fallback-title" className="mt-1 text-lg font-black">{staticRuntime ? "Navegação pronta para este site estático." : "O serviço de cálculo não respondeu, mas sua viagem não ficou travada."}</h2>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-white/45">{staticRuntime ? "O site público prepara a viagem sem fingir um cálculo próprio. Ao escolher o navegador, ele recebe origem e destino e calcula distância, trânsito e chegada atualizados." : "Nenhuma distância, tempo ou pedágio foi inventado. Para manter a informação correta, o Trajeto encaminha a rota para um navegador que faz o cálculo atualizado."}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination, "driving", true), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir Google Maps</button>
              <button type="button" onClick={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] px-3 text-xs font-black text-[#FFD9AF]">Abrir Waze</button>
              <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(destination, origin), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black">Abrir Apple Maps</button>
            </div>
            <p className="mt-3 text-center text-[0.56rem] font-semibold text-white/30">Esse modo é compatível com hospedagem estática, como GitHub Pages.</p>
          </section>
        )}

        {!savedMode && planned && (
          <section className="mt-5 animate-route-in">
            <div className="rounded-[1.6rem] border border-[#C7FF3C]/15 bg-[#10191F] p-4 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Rota calculada</p>
                  <h2 className="mt-1 truncate text-xl font-black">{origin} → {destination}</h2>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-[#C7FF3C]" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/[.045] p-3"><RouteIcon className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Distância</p><p className="mt-1 text-sm font-black">{formatDistance(planned.route.distanceMeters)}</p></div>
                <div className="rounded-2xl bg-white/[.045] p-3"><Navigation className="size-3.5 text-[#C7FF3C]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Tempo</p><p className="mt-1 text-sm font-black">{formatDuration(planned.route.durationSeconds)}</p></div>
                <div className="rounded-2xl bg-white/[.045] p-3"><RefreshCw className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Chegada</p><p className="mt-1 text-sm font-black">{formatArrival(planned.route.durationSeconds)}</p></div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-white/30">Trânsito</p>
                  <p className="mt-1 text-xs font-black">{planned.traffic?.label ?? "Não informado"}</p>
                  <p className="mt-1 text-[0.58rem] leading-relaxed text-white/35">{planned.traffic?.detail ?? "Sem detalhamento disponível."}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                  <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-white/30">Pedágio</p>
                  <p className="mt-1 text-xs font-black">Não informado</p>
                  <p className="mt-1 text-[0.58rem] text-white/35">o retorno básico da rota não fornece pedágio</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => openExternal("google")} className="min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Google Maps</button>
                <button type="button" onClick={() => openExternal("waze")} className="min-h-12 rounded-2xl border border-[#3DE3FF]/30 bg-[#3DE3FF]/[.06] px-3 text-xs font-black text-[#C9F7FF]">Waze</button>
                <button type="button" onClick={() => openExternal("apple")} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.03] px-3 text-[0.65rem] font-black text-white/70">Apple Maps</button>
                <button type="button" onClick={() => void shareRoute()} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.03] px-3 text-[0.65rem] font-black text-white/70"><Share2 className="mr-1.5 inline size-3.5" />Compartilhar</button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void saveCurrentRoute()} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.02] px-3 text-[0.65rem] font-black text-white/60"><Bookmark className="mr-1.5 inline size-3.5" />Salvar offline</button>
                <button type="button" onClick={() => setShowMap(value => !value)} className="min-h-11 rounded-2xl border border-white/8 bg-white/[.02] px-3 text-[0.65rem] font-black text-white/60"><Map className="mr-1.5 inline size-3.5" />{showMap ? "Ocultar mapa" : "Ver mapa"}</button>
              </div>

              {savedMessage && <p role="status" className="mt-3 rounded-xl bg-[#C7FF3C]/[.05] px-3 py-2 text-[0.58rem] font-bold text-[#D9FF91]">{savedMessage}</p>}
            </div>

            {showMap && (
              <section className="mt-3 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#121B22]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-white/35">Mapa da rota</p>
                  <button type="button" onClick={() => setShowMap(false)} className="text-xs font-bold text-white/45">Fechar</button>
                </div>
                <div className="h-[min(68vh,520px)]">
                  <RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} routes={routeForMap} />
                </div>
              </section>
            )}

            {planned.recommendation && (
              <section className="mt-3 rounded-[1.5rem] border border-[#C7FF3C]/15 bg-[#121B22] p-4">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Parada sugerida</p>
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
                <div className="flex items-end justify-between gap-3"><div><p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Paradas encontradas</p><h3 className="mt-1 text-2xl font-black tracking-[-.05em]">{planned.stops.length} posto(s)</h3></div><span className="text-[0.55rem] text-white/30">dados desta consulta</span></div>
                <div className="mt-3 space-y-2">
                  {planned.stops.slice(0, 6).map(stop => (
                    <article key={stop.placeId} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-black">{stop.name}</p><p className="mt-1 line-clamp-2 text-[0.62rem] leading-relaxed text-white/40">{stop.address}</p></div>
                        <Fuel className="size-4 shrink-0 text-[#3DE3FF]" />
                      </div>
                      {stop.priceReference && <p className="mt-2 text-[0.58rem] font-bold text-[#D9FF91]">Referência ANP: {Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}
                      <button type="button" onClick={() => openStation(stop)} className="mt-3 min-h-11 w-full rounded-xl border border-white/8 bg-white/[.03] text-xs font-black text-white/70">Navegar até esta parada</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-3 rounded-3xl border border-white/8 bg-white/[.025] p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Mais detalhes da decisão</span><ChevronDown className="size-4 text-white/35" /></summary>
                <div className="mt-3 grid gap-2 text-[0.62rem] leading-relaxed text-white/45">
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

        <section className="mt-8 pb-3 text-center text-[0.55rem] leading-relaxed text-white/25">
          O Trajeto organiza dados e abre a navegação externa; ele não substitui Google Maps, Waze ou Apple Maps.
        </section>
      </div>
    </main>
  );
}
