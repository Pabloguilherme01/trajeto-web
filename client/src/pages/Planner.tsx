import { RouteMap } from "@/components/RouteMap";
import RouteIntelligenceCard from "@/components/RouteIntelligenceCard";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { StationSheet } from "@/components/StationSheet";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Fuel, Loader2, MapPin, Route as RouteIcon, Share2, ShieldCheck, Sparkles, WifiOff, ArrowDownUp, LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { Link, useLocation } from "wouter";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildGoogleMapsDirectionsUrl, buildGoogleMapsMultiStopUrl, buildWazeNavigationUrl, shareText, buildRouteShareText } from "@/lib/mobileTools";
import { getOfflineRoute, listOfflineRoutes, offlineRouteId, saveOfflineRoute, type OfflineRoute } from "@/lib/offlineStore";
import OfflineRouteVault from "@/components/OfflineRouteVault";
import { getLastTrip, rememberTrip } from "@/lib/mobilePreferences";
import { getMobileDestinations, mobileDestinationEvent, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { projectTripCosts } from "@/lib/tripProjection";
import MobileNavigationCenter from "@/components/MobileNavigationCenter";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";

type PlannedRoute = NonNullable<ReturnType<typeof trpc.routes.plan.useMutation>["data"]>;

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function RouteResultSkeleton() {
  return <div aria-label="Carregando resultado da rota" className="flex min-h-[340px] flex-col justify-between" role="status">
    <div className="flex gap-3"><div className="h-16 flex-1 animate-pulse bg-[#E7ECE7]" /><div className="h-16 flex-1 animate-pulse bg-[#E7ECE7]" /></div>
    <div className="h-44 animate-pulse border border-[#D8DED5] bg-[#EEF2ED]" />
    <div className="space-y-3"><div className="h-4 w-28 animate-pulse bg-[#E7ECE7]" /><div className="h-8 w-3/4 animate-pulse bg-[#E7ECE7]" /><p className="text-xs text-[#6A7C78]">Calculando percurso e buscando postos próximos…</p></div>
  </div>;
}

export default function Planner() {
  const [location, setLocation] = useLocation();
  const [origin, setOrigin] = useState(() => new URLSearchParams(window.location.search).get("origem") || getLastTrip()?.origin || "");
  const [destination, setDestination] = useState(() => new URLSearchParams(window.location.search).get("destino") || getLastTrip()?.destination || "");
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [loadedFromOffline, setLoadedFromOffline] = useState(false);
  const [offlineSavedAt, setOfflineSavedAt] = useState<string | null>(null);
  const [latestOfflineRoute, setLatestOfflineRoute] = useState<OfflineRoute | null>(null);
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteIntelligenceRoute[]>([]);
  const routeContextKey = `trajeto-route-context:${origin.trim().toLocaleLowerCase("pt-BR")}→${destination.trim().toLocaleLowerCase("pt-BR")}`;
  const readPersistedRoute = () => {
    try {
      if (sessionStorage.getItem("trajeto-selected-route-context") !== routeContextKey) return null;
      return sessionStorage.getItem("trajeto-selected-route");
    } catch {
      return null;
    }
  };
  const [selectedRouteId, setSelectedRouteId] = useState(() => readPersistedRoute() || "principal");
  const [routeConfirmed, setRouteConfirmed] = useState(() => Boolean(readPersistedRoute()));
  const selectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setRouteConfirmed(false);
  };
  const confirmRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setRouteConfirmed(true);
    try {
      sessionStorage.setItem("trajeto-selected-route", routeId);
      sessionStorage.setItem("trajeto-selected-route-context", routeContextKey);
      localStorage.setItem("trajeto-confirmed-route-id", routeId);
      localStorage.setItem("trajeto-confirmed-route-context", routeContextKey);
    } catch {}
  };
  useEffect(() => {
    try {
      const savedContext = sessionStorage.getItem("trajeto-selected-route-context");
      if (savedContext === routeContextKey) return;
      sessionStorage.removeItem("trajeto-selected-route");
      sessionStorage.setItem("trajeto-selected-route-context", routeContextKey);
    } catch {}
    setRouteConfirmed(false);
    setSelectedRouteId("principal");
  }, [routeContextKey]);
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [savedDestinations, setSavedDestinations] = useState<MobileDestination[]>(() => getMobileDestinations());
  const drivingMode = new URLSearchParams(window.location.search).get("modo") === "conducao";
  
  const saveCurrentRouteOffline = async () => {
    if (!planned) return;
    try {
      const savedAt = new Date().toISOString();
      const savedRoute = {
        id: offlineRouteId(origin, destination),
        origin: origin.trim(),
        destination: destination.trim(),
        savedAt,
        payload: planned,
      };
      await saveOfflineRoute(savedRoute);
      setLatestOfflineRoute(savedRoute);
      setOfflineSavedAt(savedAt);
      setShareMessage("Rota salva neste aparelho. Ela pode ser reaberta sem recalcular.");
    } catch (error) {
      setShareMessage("Não foi possível salvar esta rota no aparelho. Tente novamente.");
      throw error;
    }
  };

  useEffect(() => {
    const loadOfflineRoute = () => {
      void listOfflineRoutes()
        .then(routes => setLatestOfflineRoute(routes[0] ?? null))
        .catch(() => setLatestOfflineRoute(null));
    };
    const update = () => setOffline(!navigator.onLine);
    loadOfflineRoute();
    window.addEventListener("focus", loadOfflineRoute);
    window.addEventListener("online", loadOfflineRoute);
    window.addEventListener("offline", loadOfflineRoute);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("focus", loadOfflineRoute);
      window.removeEventListener("online", loadOfflineRoute);
      window.removeEventListener("offline", loadOfflineRoute);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (planned) return;
    const params = new URLSearchParams(window.location.search);
    const savedRouteId = params.get("rota")?.trim();
    const savedOrigin = params.get("origem")?.trim() || origin.trim();
    const savedDestination = params.get("destino")?.trim() || destination.trim();
    if (!savedRouteId && (savedOrigin.length < 3 || savedDestination.length < 3)) return;

    const id = savedRouteId || offlineRouteId(savedOrigin, savedDestination);
    void getOfflineRoute(id).then(route => {
      if (!route) {
        if (savedRouteId) {
          setShareMessage(offline
            ? "Esta rota salva não está disponível neste aparelho."
            : "Esta rota salva não foi encontrada neste aparelho.");
        }
        return;
      }

      setOrigin(route.origin);
      setDestination(route.destination);
      setPlanned(route.payload as PlannedRoute);
      setOfflineSavedAt(route.savedAt);
      setLoadedFromOffline(true);
      setShareMessage(
        offline
          ? "Rota salva aberta sem internet. Trânsito e dados ao vivo podem estar desatualizados."
          : "Rota salva aberta imediatamente. Você pode recalculá-la quando quiser.",
      );
    }).catch(() => {
      setShareMessage("Não foi possível abrir esta rota salva. Ela pode estar corrompida.");
    });
  }, []);

  useEffect(() => {
    if (location.split("?")[0] !== appUrl("/planejar") && location.split("?")[0] !== appUrl("/salvos")) return;
    if (location.split("?")[0] === appUrl("/planejar") && new URLSearchParams(location.split("?")[1] ?? "").get("salvos") !== "1") return;
    const timer = window.setTimeout(() => {
      document.getElementById("saved-routes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshLastTrip = () => {
      setLastTrip(getLastTrip());
      setSavedDestinations(getMobileDestinations());
    };
    window.addEventListener("focus", refreshLastTrip);
    window.addEventListener(mobileDestinationEvent, refreshLastTrip);
    return () => {
      window.removeEventListener("focus", refreshLastTrip);
      window.removeEventListener(mobileDestinationEvent, refreshLastTrip);
    };
  }, []);

  useEffect(() => {
    if (!origin.trim() || !destination.trim()) setLastTrip(getLastTrip());
  }, [origin, destination]);

  useEffect(() => {
    const routeLabel = origin.trim() && destination.trim() ? origin.trim() + " → " + destination.trim() : "Planejar rota";
    const title = routeLabel + " · Trajeto";
    const description = origin.trim() && destination.trim()
      ? "Planeje " + origin.trim() + " → " + destination.trim() + " e compare distância, duração e opções de abastecimento."
      : "Planeje uma rota, compare distância, duração e opções de abastecimento.";
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
    const shareUrl = `${window.location.origin}${appUrl("/planejar")}` + (origin.trim() && destination.trim() ? `?origem=${encodeURIComponent(origin.trim())}&destino=${encodeURIComponent(destination.trim())}` : "");
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", shareUrl);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", shareUrl);
  }, [origin, destination]);
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [gasolinePrice, setGasolinePrice] = useState("");
  const [ethanolPrice, setEthanolPrice] = useState("");
  const [gasolineKmPerLiter, setGasolineKmPerLiter] = useState("");
  const [ethanolKmPerLiter, setEthanolKmPerLiter] = useState("");
  const [priceWeight, setPriceWeight] = useState(70);
  const [roundTrip, setRoundTrip] = useState(false);
  const [tripsPerWeek, setTripsPerWeek] = useState(5);
  const [selectedStop, setSelectedStop] = useState<PlannedRoute["stops"][number] | null>(null);
  const { isAuthenticated } = useAuth();
  const track = useProductEvents();
  const planRoute = trpc.routes.plan.useMutation({ onSuccess: result => { setPlanned(result); track("route_open", destination || origin); } });
  const favoriteInput = useMemo(() => ({ placeIds: planned?.stops.map(stop => stop.placeId) ?? [] }), [planned]);
  const favoriteState = trpc.personal.favoriteState.useQuery(favoriteInput, { enabled: isAuthenticated && Boolean(planned?.stops.length) });
  const addFavorite = trpc.personal.addFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); track("favorite_saved", destination || origin); }, onError: error => { if (error.message.includes("Please login")) startLogin(); } });
  const vehicles = trpc.personal.vehicles.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const selectedRoute = routeAlternatives.find(route => route.id === selectedRouteId) ?? null;
  const selectedRouteDistanceKm = selectedRoute?.distanceMeters != null ? selectedRoute.distanceMeters / 1000 : planned ? planned.route.distanceMeters / 1000 : 0;
  const selectedRouteDuration = selectedRoute?.durationSeconds ?? planned?.route.durationSeconds ?? 0;
  const selectedRouteLabel = selectedRoute ? (selectedRoute.id === "principal" ? "Principal" : selectedRoute.id.replace("alternativa-", "Alternativa ")) : null;
  const selectedRouteSnapshot = selectedRoute ? {
    id: selectedRoute.id,
    label: selectedRouteLabel,
    distanceKm: selectedRouteDistanceKm,
    durationSeconds: selectedRouteDuration,
    toll: selectedRoute.toll?.amount ?? null,
  } : null;
  const saveRouteSnapshot = () => {
    if (!selectedRouteSnapshot) return;
    try {
      const snapshot = {
        ...selectedRouteSnapshot,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("trajeto-route-simulator", JSON.stringify(snapshot));
      setShareMessage("Simulação salva neste aparelho para consulta offline.");
    } catch {
      setShareMessage("Não foi possível salvar a simulação neste aparelho.");
    }
  };
  const selectedVehicle = vehicles.data?.find(vehicle => vehicle.id === selectedVehicleId) ?? null;
  const selectedConsumption = selectedVehicle ? Number(selectedVehicle.customKmPerLiter ?? selectedVehicle.highwayKmPerLiter ?? selectedVehicle.cityKmPerLiter ?? 0) : 0;
  const fuelEconomyInput = useMemo(() => {
    const price = Number(pricePerLiter.replace(",", "."));
    if (!planned || !selectedVehicle || !Number.isFinite(price) || price <= 0 || selectedConsumption <= 0) return null;
    return { distanceKm: selectedRouteDistanceKm * (roundTrip ? 2 : 1), pricePerLiter: price, kmPerLiter: selectedConsumption, tankLiters: selectedVehicle.tankLiters ? Number(selectedVehicle.tankLiters) : null };
  }, [planned, selectedVehicle, selectedConsumption, pricePerLiter, roundTrip]);
  const fuelEconomy = trpc.personal.fuelEconomy.useQuery(fuelEconomyInput ?? { distanceKm: 0, pricePerLiter: 1, kmPerLiter: 1 }, { enabled: Boolean(fuelEconomyInput) && isAuthenticated, retry: 0 });

  useEffect(() => {
    if (selectedVehicleId || !vehicles.data?.length) return;
    setSelectedVehicleId(vehicles.data[0].id);
  }, [selectedVehicleId, vehicles.data]);

  useEffect(() => {
    if (!selectedVehicle || selectedConsumption <= 0) return;
    setGasolineKmPerLiter(current => current || String(selectedConsumption));
    setEthanolKmPerLiter(current => current || String(selectedConsumption));
  }, [selectedVehicle, selectedConsumption]);

  const calculateCurrentRoute = async () => {
    const normalizedOrigin = origin.trim();
    const normalizedDestination = destination.trim();
    if (normalizedOrigin.toLocaleLowerCase("pt-BR") === normalizedDestination.toLocaleLowerCase("pt-BR")) {
      setFormError("Origem e destino precisam ser diferentes.");
      return null;
    }

    const parse = (value: string) => Number(value.replace(",", "."));
    const gasoline = parse(gasolinePrice);
    const ethanol = parse(ethanolPrice);
    const gasolineConsumption = parse(gasolineKmPerLiter);
    const ethanolConsumption = parse(ethanolKmPerLiter);
    const economy = selectedVehicle && [gasoline, ethanol, gasolineConsumption, ethanolConsumption].every(value => Number.isFinite(value) && value > 0)
      ? { vehicleId: selectedVehicle.id, gasolinePrice: gasoline, ethanolPrice: ethanol, gasolineKmPerLiter: gasolineConsumption, ethanolKmPerLiter: ethanolConsumption }
      : undefined;

    if (offline) {
      setFormError("Sem internet: abra uma rota já salva neste aparelho. Uma rota nova precisa de conexão para calcular distância, trânsito e postos reais.");
      return null;
    }

    const result = await planRoute.mutateAsync({
      origin: normalizedOrigin,
      destination: normalizedDestination,
      economy,
      recommendation: { priceWeight },
    });
    setLoadedFromOffline(false);
    setOfflineSavedAt(null);
    if (result) rememberTrip(normalizedOrigin, normalizedDestination);
    return result;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShareMessage(null);
    setFormError(null);
    await calculateCurrentRoute();
  };

  const toggleFavorite = () => {
    if (!selectedStop) return;
    if (!isAuthenticated) return startLogin();
    addFavorite.mutate({ placeId: selectedStop.placeId, stationName: selectedStop.name, stationAddress: selectedStop.address, lat: selectedStop.lat, lng: selectedStop.lng });
  };
  const useCurrentLocation = () => {
    if (offline) {
      setFormError("Sem internet: a localização ao vivo não está disponível. Abra uma rota salva para continuar.");
      return;
    }
    if (!navigator.geolocation || locatingOrigin) return;
    setLocatingOrigin(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocatingOrigin(false);
      setOrigin(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
      setFormError(null);
    }, () => {
      setLocatingOrigin(false);
      setFormError("Não foi possível obter sua localização. Verifique a permissão do navegador.");
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 });
  };

  const openDestinationNavigation = () => {
    if (!destination.trim()) return;
    if (offline || loadedFromOffline && !navigator.onLine) {
      setShareMessage("A navegação externa precisa de internet. A rota salva continua disponível neste aparelho.");
      return;
    }
    window.open(buildGoogleMapsDestinationUrl(destination.trim(), true), "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };

  const openNavigation = (stop: PlannedRoute["stops"][number]) => {
    if (offline || loadedFromOffline && !navigator.onLine) {
      setShareMessage("A navegação externa precisa de internet. A rota salva continua disponível neste aparelho.");
      return;
    }
    window.open(buildGoogleMapsDestinationUrl(stop.name, true, stop.placeId), "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };

  const shareRoute = async () => {
    if (!origin.trim() || !destination.trim()) return;
    const url = `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(origin.trim())}&destino=${encodeURIComponent(destination.trim())}`;
    const text = buildRouteShareText(origin, destination, planned?.recommendation ? {
      name: planned.recommendation.name,
      price: planned.recommendation.price,
      detourKm: planned.recommendation.detourKm,
      detourSource: planned.recommendation.detourSource === "real" ? "real" : "estimated",
    } : null);
    try {
      await shareText(text, url, "Trajeto · rota");
      setShareMessage("Rota pronta para compartilhar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Não foi possível preparar o compartilhamento agora.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#163840]">
      <header className="border-b border-[#D8DED5] bg-[#14343C] text-white">
        <div className="container flex h-[72px] items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" aria-label="Voltar para início">
            <img className="size-9 rounded-lg bg-[#FFC928] p-1" src={appUrl("/favicon.svg")} alt="" />
            <span className="brand-wordmark text-xl text-white">trajeto</span>
            <span className="hidden border-l border-white/20 pl-3 text-[0.62rem] font-bold tracking-[0.18em] text-[#FFC928] sm:block">PLANEJADOR</span>
          </Link>
          <button onClick={() => setLocation(appUrl("/"))} className="inline-flex items-center gap-2 text-xs font-bold text-white/70 transition hover:text-[#FFC928]"><ArrowLeft className="size-4" /> Início</button>
        </div>
      </header>

      <main className="container py-10 lg:py-14">
        {offline && <section role="status" aria-live="polite" className="mb-6 rounded-2xl border border-[#FFB86B]/35 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#6D4A00]">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <strong className="text-[#163840]">Continue sem internet.</strong>
              <p className="mt-1">{latestOfflineRoute ? latestOfflineRoute.origin + " → " + latestOfflineRoute.destination + " está pronta neste aparelho." : "Nenhuma rota salva foi encontrada neste aparelho."}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {latestOfflineRoute && <Link href={appUrl("/planejar") + "?rota=" + encodeURIComponent(latestOfflineRoute.id) + "&origem=" + encodeURIComponent(latestOfflineRoute.origin) + "&destino=" + encodeURIComponent(latestOfflineRoute.destination)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#163840] px-4 py-2 text-[0.65rem] font-extrabold text-white">Continuar última rota <ArrowRight className="size-3.5" /></Link>}
            <Link href={appUrl("/planejar?salvos=1")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#163840]/20 px-4 py-2 text-[0.65rem] font-extrabold text-[#163840]">Ver rotas salvas</Link>
          </div>
          <p className="mt-3 text-[0.68rem]">{latestOfflineRoute ? "Abra a rota salva para continuar. Novas rotas, trânsito, localização ao vivo e consultas de postos precisam de internet." : "Sem rota salva: novas rotas, localização ao vivo e consultas de postos ficam disponíveis quando a conexão voltar."}</p>
        </section>}
        <div className="mb-6 max-w-3xl sm:mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Rota com dados reais</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D2C9] bg-white px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#55736C]"><ShieldCheck className="size-3" /> fonte separada de estimativa</span>
          </div>
          <h1 className="font-display mt-4 text-[clamp(3rem,6vw,5.4rem)] font-semibold leading-[0.86] tracking-[-0.065em]">Escolha melhor<br /><span className="text-[#BA5B45]">antes de sair.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#5A706D] sm:mt-6 sm:text-[1.05rem]">Pesquise uma rota de carro, veja distância e duração e compare onde parar sem confundir referência de combustível com preço em tempo real.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3"><div className="rounded-xl border border-[#C7D2C9] bg-white p-3 text-[0.68rem] leading-relaxed text-[#5A706D]"><strong className="block text-[#163840]">Rota</strong>Distância e duração da consulta.</div><div className="rounded-xl border border-[#C7D2C9] bg-white p-3 text-[0.68rem] leading-relaxed text-[#5A706D]"><strong className="block text-[#163840]">Trânsito</strong>Informação adicional quando disponível.</div><div className="col-span-2 rounded-xl border border-[#C7D2C9] bg-white p-3 text-[0.68rem] leading-relaxed text-[#5A706D] sm:col-span-1"><strong className="block text-[#163840]">Combustível</strong>Referência datada, nunca apresentada como preço ao vivo.</div></div>
        </div>

        <section className="grid overflow-hidden border border-[#C7D2C9] bg-white lg:grid-cols-[0.74fr_1.26fr]">
          <form onSubmit={submit} className={`${offline ? "hidden " : ""}relative bg-[#163840] p-6 text-white sm:p-8`}>
            <div className="absolute left-0 top-0 h-2 w-24 bg-[#FFC928]" />
            <div className="mb-8 flex items-start justify-between gap-5"><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Seu ponto de partida</p><h2 className="font-display mt-3 text-3xl font-semibold leading-none tracking-[-0.055em]">Desenhe a rota.</h2></div><RouteIcon className="size-6 text-[#FFC928]" /></div>
            {lastTrip && <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="text-[0.56rem] font-bold uppercase tracking-[0.12em] text-[#FFC928]">Última rota</p><p className="mt-1 truncate text-xs font-bold text-white/85">{lastTrip.origin} → {lastTrip.destination}</p></div>
                <button type="button" onClick={() => { setOrigin(lastTrip.origin); setDestination(lastTrip.destination); setPlanned(null); setLoadedFromOffline(false); setOfflineSavedAt(null); setFormError(null); setShareMessage(null); }} className="min-h-10 shrink-0 rounded-xl bg-[#FFC928] px-3 text-[0.62rem] font-extrabold text-[#163840] active:scale-[.98]">Retomar</button>
              </div>
            </div>}
            <div className="flex items-center justify-between gap-3"><label className="text-xs font-bold text-white/75" htmlFor="origin">Origem</label><button type="button" onClick={useCurrentLocation} disabled={locatingOrigin || offline} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[0.62rem] font-extrabold text-[#D9FF91] transition hover:border-[#FFC928] disabled:opacity-60"><LocateFixed className="size-3.5" />{locatingOrigin ? "Localizando…" : "Usar minha localização"}</button></div>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#FFC928]" /><input id="origin" required minLength={3} value={origin} onChange={event => { setOrigin(event.target.value); setPlanned(null); setLoadedFromOffline(false); setOfflineSavedAt(null); setFormError(null); setShareMessage(null); }} placeholder="Ex.: Brasília, DF ou use GPS" autoComplete="street-address" enterKeyHint="next" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>
            <div className="mt-3 flex justify-between gap-2">
              <button type="button" onClick={() => { setOrigin(""); setDestination(""); setPlanned(null); setLoadedFromOffline(false); setOfflineSavedAt(null); setFormError(null); setShareMessage(null); }} disabled={!origin.trim() && !destination.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white/55 transition hover:border-white/30 hover:text-white disabled:opacity-40">Limpar</button>
              <button type="button" onClick={() => { setOrigin(destination); setDestination(origin); setPlanned(null); setLoadedFromOffline(false); setOfflineSavedAt(null); setFormError(null); }} disabled={!origin.trim() && !destination.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold text-white/80 transition hover:border-[#FFC928] hover:text-[#FFC928] active:scale-[.98]" aria-label="Inverter origem e destino"><ArrowDownUp className="size-3.5" /> Inverter rota</button>
            </div>
            <label className="mt-7 block text-xs font-bold text-white/75" htmlFor="destination">Destino</label>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#BA5B45]" /><input id="destination" required minLength={3} value={destination} onChange={event => { setDestination(event.target.value); setPlanned(null); setLoadedFromOffline(false); setOfflineSavedAt(null); setFormError(null); setShareMessage(null); }} placeholder="Ex.: Águas Lindas de Goiás, GO" autoComplete="street-address" enterKeyHint="done" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>\n            {savedDestinations.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Destinos salvos neste aparelho">\n              {savedDestinations.map(place => <button key={place.id} type="button" onClick={() => { setDestination(place.value); setPlanned(null); setLoadedFromOffline(false); setFormError(null); rememberDestinationUsage(place); }} className="min-h-10 shrink-0 rounded-full border border-white/15 bg-white/[.05] px-3.5 text-[0.62rem] font-extrabold text-white/80 transition hover:border-[#C7FF3C] hover:bg-[#C7FF3C]/10 hover:text-[#EFFFCA] active:scale-[.98]">{place.label} · {place.value}</button>)}\n            </div>}
            <fieldset className="mt-7 border-t border-white/15 pt-5"><legend className="text-xs font-bold text-[#FFC928]">O que pesa mais na decisão</legend><div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-white/70">Menor desvio</span><output htmlFor="recommendation-weight" className="rounded-full bg-white/10 px-2.5 py-1 font-bold text-[#FFC928]">{priceWeight}% preço</output><span className="font-bold text-white/70">Menor preço</span></div><input id="recommendation-weight" type="range" min="0" max="100" step="5" value={priceWeight} onChange={event => setPriceWeight(Number(event.target.value))} aria-describedby="recommendation-weight-description" aria-valuetext={`${priceWeight}% preço · ${100 - priceWeight}% desvio real`} className="mt-3 h-2 w-full cursor-pointer accent-[#FFC928]" /><p id="recommendation-weight-description" className="mt-3 text-xs leading-relaxed text-white/60">Preço: <strong className="text-white">{priceWeight}%</strong> · desvio real: <strong className="text-white">{100 - priceWeight}%</strong>. O Trajeto mede o desvio real nos candidatos com referência de preço disponíveis para esta rota.</p></fieldset>
            {isAuthenticated && <fieldset className="mt-7 border-t border-white/15 pt-5"><legend className="text-xs font-bold text-[#FFC928]">Comparar combustíveis nesta rota</legend><p className="mt-2 text-xs leading-relaxed text-white/60">Opcional. Os valores escolhidos ficam vinculados ao histórico desta rota.</p><label className="mt-3 block text-xs font-bold text-white/75">Veículo<select value={selectedVehicleId ?? ""} onChange={event => setSelectedVehicleId(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm"><option value="">Selecione</option>{vehicles.data?.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.nickname}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-white/75">Gasolina R$/L<input value={gasolinePrice} onChange={event => setGasolinePrice(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Etanol R$/L<input value={ethanolPrice} onChange={event => setEthanolPrice(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Gasolina km/L<input value={gasolineKmPerLiter} onChange={event => setGasolineKmPerLiter(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Etanol km/L<input value={ethanolKmPerLiter} onChange={event => setEthanolKmPerLiter(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label></div></fieldset>}
            <div className="sticky bottom-0 z-10 -mx-6 mt-7 border-t border-white/15 bg-[#163840]/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"><Button type="submit" disabled={planRoute.isPending} className="min-h-12 w-full rounded-none bg-[#FFC928] font-bold text-[#163840] hover:bg-white">{planRoute.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Calculando rota…</> : <>Comparar rota e paradas <ArrowRight className="ml-2 size-4" /></>}</Button></div>
            {(formError || planRoute.isError) && (
              <div role="alert" className="mt-4 border-l-2 border-[#FFB5A1] pl-3 text-sm text-[#FFD1C3]">
                <p>{formError || "Não foi possível calcular a rota. Confira os endereços e tente novamente."}</p>
                {planRoute.isError && origin.trim().length >= 2 && destination.trim().length >= 2 && !offline && (
                  <a
                    href={buildGoogleMapsDirectionsUrl(origin, destination)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#FFD1C3]/35 bg-[#FFD1C3]/10 px-3 text-xs font-extrabold text-white"
                  >
                    Abrir rota no Google Maps <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </form>

          <div className="p-6 sm:p-8">
            {planRoute.isPending ? <RouteResultSkeleton /> : !planned ? (
              <div className="flex h-full min-h-[340px] flex-col justify-between"><div className="grid size-14 place-items-center rounded-full bg-[#E9EFE9] text-[#BA5B45]"><Sparkles className="size-6" /></div><div><p className="eyebrow">O que aparece aqui</p><h2 className="font-display mt-4 max-w-md text-4xl font-semibold leading-[0.93] tracking-[-0.06em]">Postos reais,<br />dados com contexto.</h2><p className="mt-5 max-w-lg text-sm leading-relaxed text-[#627773]">A busca usa localização e rota para organizar os pontos de abastecimento. Quando a referência oficial da ANP estiver vinculada ao posto, ela aparece separada e com a data de coleta.</p></div><div className="flex flex-wrap gap-3 text-xs font-bold text-[#496760]"><span className="border border-[#C7D2C9] px-3 py-2">Google Maps</span><span className="border border-[#C7D2C9] px-3 py-2">ANP · atualização periódica</span></div></div>
            ) : (
              <div>
                <div className="grid gap-3 border-b border-[#D8DED5] pb-6 sm:grid-cols-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Distância</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{planned.route.distanceLabel}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Tempo estimado</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{minutes(planned.route.durationSeconds)}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Trajeto</p><p className="mt-2 text-sm font-semibold leading-snug">{planned.route.summary || "Rota calculada"}</p></div></div>
                <div className="mt-6"><RouteMap
                  origin={planned.route.origin}
                  destination={planned.route.destination}
                  stops={planned.stops}
                  routes={routeAlternatives.map(route => ({
                    id: route.id,
                    polyline: route.polyline,
                    selected: route.id === selectedRouteId,
                    trafficIntervals: route.trafficIntervals,
                    durationSeconds: route.durationSeconds,
                    staticDurationSeconds: route.staticDurationSeconds,
                    distanceMeters: route.distanceMeters,
                    toll: route.toll,
                  }))}
                /></div>
                {routeConfirmed && routeAlternatives.length > 0 && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#9EBF1F] bg-[#F2F6DE] px-4 py-3">
                    <div>
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#668400]">Rota em uso</p>
                      <p className="mt-1 text-sm font-black text-[#163840]">{selectedRouteId === "principal" ? "Principal" : selectedRouteId.replace("alternativa-", "Alternativa ")}</p>
                    </div>
                    <span className="text-[0.58rem] font-bold text-[#5D7200]">Mantida enquanto você compara</span>
                  </div>
                )}
                {selectedRouteSnapshot && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2">
                    <span className="text-[0.58rem] text-white/50">Simulação: <strong className="text-white/75">{selectedRouteLabel}</strong> · {selectedRouteDistanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {minutes(selectedRouteDuration)}</span>
                    <button type="button" onClick={saveRouteSnapshot} className="min-h-9 rounded-lg border border-white/10 px-3 text-[0.58rem] font-black text-white/70">Salvar offline</button>
                  </div>
                )}
                {!drivingMode && <RouteIntelligenceCard
                  origin={origin}
                  destination={destination}
                  waypoints={[]}
                  selectedRouteId={selectedRouteId}
                  routeConfirmed={routeConfirmed}
                  onSelectRoute={selectRoute}
                  onConfirmRoute={confirmRoute}
                  onRoutesChange={routes => {
                    setRouteAlternatives(routes);
                    if (!routes.some(route => route.id === selectedRouteId)) {
                      setSelectedRouteId(routes[0]?.id || "principal");
                      setRouteConfirmed(false);
                      try {
                        sessionStorage.removeItem("trajeto-selected-route");
                        localStorage.removeItem("trajeto-confirmed-route-id");
                      } catch {}
                    }
                  }}
                />}
                <section className="mt-6 border border-[#C7D2C9] bg-[#F2F5EF] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#54706A]">Situação da rota</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">{planned.traffic.label}</h3><p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#54706A]">{planned.traffic.detail} Consulta registrada em {new Date(planned.traffic.checkedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p></div><span className={`rounded-full px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${planned.traffic.state === "active" ? "bg-[#DDEFD4] text-[#315227]" : "bg-[#FFF1BF] text-[#6C4E00]"}`}>{planned.traffic.state === "active" ? "Fonte ao vivo" : "Cobertura pendente"}</span></div>{planned.traffic.incidents.length > 0 && <div className="mt-5 grid gap-3 border-y border-[#D1DBD1] py-4">{planned.traffic.incidents.map(incident => <article key={incident.id} className="border-l-2 border-[#BA5B45] bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-bold text-[#163840]">{incident.description}</p><span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#8A4434]">{incident.severity === "major" ? "Impacto alto" : incident.severity === "moderate" ? "Impacto moderado" : "Impacto leve"}</span></div><p className="mt-2 text-xs leading-relaxed text-[#58716B]">{[incident.from, incident.to].filter(Boolean).join(" → ") || "Local informado pela fonte"}{incident.delaySeconds ? ` · atraso estimado de ${Math.round(incident.delaySeconds / 60)} min` : ""}{incident.reportedAt ? ` · atualização ${new Date(incident.reportedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p></article>)}</div>}<div className="mt-4 flex flex-wrap gap-2">{planned.traffic.officialSources.map(source => <a key={source.label} href={source.url} target="_blank" rel="noopener noreferrer" className="border border-[#C7D2C9] bg-white px-3 py-2 text-xs font-bold text-[#36564E] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">{source.label} · {source.detail}</a>)}<a href={planned.traffic.anpComVcUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("anp_quality_open", destination || origin)} className="border border-[#C7D2C9] bg-white px-3 py-2 text-xs font-bold text-[#36564E] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">ANP com VC · qualidade do posto</a></div></section>
                <div className="mt-6 flex items-center gap-3 rounded-sm bg-[#EFF3EE] px-4 py-3 text-xs leading-relaxed text-[#54706A]"><ShieldCheck className="size-4 shrink-0 text-[#BA5B45]" />{planned.priceCoverage > 0 ? `${planned.priceCoverage} referência(s) de preço da ANP foram vinculadas a esta pesquisa.` : "Os postos abaixo são reais. Ainda não há referência ANP vinculada aos identificadores retornados."}</div>
                {planned.recommendation && <section className="mt-6 border border-[#C6DA65] bg-[#F4F8D9] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#567100]">Opção que atende sua prioridade</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">{planned.recommendation.name}</h3></div><span className={`border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${planned.recommendation.detourSource === "real" ? "border-[#8AAA42] bg-white text-[#486800]" : "border-[#C8B569] bg-[#FFFBE9] text-[#695B17]"}`}>{planned.recommendation.detourSource === "real" ? "Desvio real" : "Desvio aproximado"}</span></div><p className="mt-2 text-sm leading-relaxed text-[#52644A]">Preço de referência: <strong>{planned.recommendation.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · desvio {planned.recommendation.detourSource === "real" ? "real" : "estimado"} de <strong>{planned.recommendation.detourKm.toLocaleString("pt-BR")} km</strong>.</p>{planned.recommendation.netSavings && <div className="mt-3 border-l-2 border-[#789C28] bg-white/60 p-3"><p className="text-xs font-bold text-[#426100]">Economia líquida estimada (gasolina): {planned.recommendation.netSavings.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs leading-relaxed text-[#5B6C4B]">Economia no percurso: {planned.recommendation.netSavings.grossFuelSaving.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · custo estimado do desvio: {planned.recommendation.netSavings.detourFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. {planned.recommendation.netSavingsMethod}</p></div>}<p className="mt-2 text-xs leading-relaxed text-[#5B6C4B]">{planned.recommendation.rationale} {planned.recommendation.method}</p><p className="mt-2 text-xs font-medium text-[#52644A]">{planned.recommendationDiagnostics.realDetoursCalculated}/{planned.recommendationDiagnostics.requestedCandidates} candidato(s) tiveram o desvio calculado pela rota real.</p></section>}
                {planned.economy && <section className="mt-6 border border-[#BA5B45]/35 bg-[#FFF5EE] p-4 sm:p-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8A4434]">Comparação gasolina × etanol</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">Melhor cenário: {planned.economy.recommendedFuel === "ethanol" ? "etanol" : "gasolina"}.</h3><p className="mt-2 text-sm leading-relaxed text-[#58716B]">{planned.economy.reason} O ponto de equilíbrio do etanol é {planned.economy.breakEvenEthanolPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/L.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C7F78]">Gasolina</p><p className="font-display mt-2 text-3xl tracking-[-0.06em]">{planned.economy.gasoline.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs text-[#5B716C]">{planned.economy.gasoline.litersNeeded.toLocaleString("pt-BR")} L · {planned.economy.gasoline.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C7F78]">Etanol</p><p className="font-display mt-2 text-3xl tracking-[-0.06em]">{planned.economy.ethanol.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs text-[#5B716C]">{planned.economy.ethanol.litersNeeded.toLocaleString("pt-BR")} L · {planned.economy.ethanol.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km</p></div></div></section>}
                <section className="mt-6 border border-[#9BC9B4] bg-[#EAF4EC] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#356451]">Economia da rota</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">Quanto esta viagem pode consumir.</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-[#56766A]">A estimativa combina a distância real da rota com um veículo e preço escolhidos por você. Ela não presume consumo nem preço de bomba.</p></div><Fuel className="size-5 text-[#356451]" /></div>{isAuthenticated ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#365E51]">Veículo<select value={selectedVehicleId ?? ""} onChange={event => setSelectedVehicleId(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]"><option value="">Selecione um veículo</option>{vehicles.data?.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.nickname}{vehicle.customKmPerLiter || vehicle.highwayKmPerLiter || vehicle.cityKmPerLiter ? ` · ${vehicle.customKmPerLiter ?? vehicle.highwayKmPerLiter ?? vehicle.cityKmPerLiter} km/L` : " · consumo não informado"}</option>)}</select></label><label className="text-xs font-bold text-[#365E51]">Preço escolhido (R$/L)<input value={pricePerLiter} onChange={event => setPricePerLiter(event.target.value)} inputMode="decimal" placeholder="Ex.: 5,89" className="mt-1.5 w-full border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none placeholder:text-[#8AA89D] focus:border-[#163840]" /></label><div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
  <div className="rounded-xl border border-[#A7CDBA] bg-white p-3">
    <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Tipo de viagem</p>
    <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de viagem">
      <button type="button" onClick={() => setRoundTrip(false)} aria-pressed={!roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold transition ${!roundTrip ? "bg-[#163840] text-white" : "bg-[#F2F6F2] text-[#365E51]"}`}>Só ida</button>
      <button type="button" onClick={() => setRoundTrip(true)} aria-pressed={roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold transition ${roundTrip ? "bg-[#163840] text-white" : "bg-[#F2F6F2] text-[#365E51]"}`}>Ida e volta</button>
    </div>
  </div>
  <label className="rounded-xl border border-[#A7CDBA] bg-white p-3 text-xs font-bold text-[#365E51]">Viagens por semana
    <input value={tripsPerWeek} onChange={event => setTripsPerWeek(Math.max(0, Math.min(21, Number(event.target.value) || 0)))} type="number" min="0" max="21" step="1" inputMode="numeric" className="mt-2 w-full border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
    <span className="mt-1 block text-[0.62rem] font-normal text-[#71877E]">Usado só para estimar o gasto recorrente.</span>
  </label>
</div>{planned.anpReferences.length > 0 && <div className="sm:col-span-2"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Usar uma referência semanal ANP como ponto de partida</p><div className="mt-2 flex flex-wrap gap-2">{planned.anpReferences.slice(0, 4).map(reference => <button key={reference.id} type="button" onClick={() => setPricePerLiter(String(reference.price))} className="border border-[#A7CDBA] bg-white px-3 py-2 text-xs font-bold text-[#356451] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">{reference.product} · {Number(reference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</button>)}</div></div>}{fuelEconomy.data && (() => {
  const projection = projectTripCosts({
    oneWayDistanceKm: planned.route.distanceMeters / 1000,
    oneWayCost: fuelEconomy.data.tripCost,
    roundTrip,
    tripsPerWeek,
  });
  return <div className="sm:col-span-2 rounded-2xl border border-[#D7DFD8] bg-[#F8FAF7] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Gasto recorrente estimado</p>
        <p className="mt-1 text-xs leading-relaxed text-[#56766A]">{roundTrip ? "Considerando ida e volta." : "Considerando apenas o trecho de ida."} O valor depende do preço e do consumo informados.</p>
      </div>
      <p className="font-display text-2xl font-semibold text-[#163840]">{projection.monthlyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<span className="ml-1 text-xs font-sans font-bold text-[#71877E]">/mês</span></p>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-white p-3"><p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C8E81]">Por viagem</p><p className="mt-1 text-sm font-extrabold text-[#163840]">{projection.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
      <div className="rounded-xl bg-white p-3"><p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C8E81]">Por semana</p><p className="mt-1 text-sm font-extrabold text-[#163840]">{projection.weeklyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
      <div className="rounded-xl bg-white p-3"><p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C8E81]">Por ano</p><p className="mt-1 text-sm font-extrabold text-[#163840]">{projection.annualCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
    </div>
  </div>;
})()}
<div className="sm:col-span-2">{!vehicles.isLoading && !vehicles.data?.length && <p className="border-l-2 border-[#356451] bg-white/55 p-3 text-xs leading-relaxed text-[#365E51]">Cadastre um veículo na <Link href="/minha-conta" className="font-bold underline underline-offset-2">Minha conta</Link> para usar consumo e autonomia pessoais.</p>}{selectedVehicle && selectedConsumption <= 0 && <p className="border-l-2 border-[#BA5B45] bg-white/55 p-3 text-xs leading-relaxed text-[#7C3F30]">Este veículo não tem consumo informado. Edite-o na Minha conta antes de calcular.</p>}{fuelEconomy.isLoading && <p className="text-sm font-bold text-[#356451]">Calculando estimativa…</p>}{fuelEconomy.data && <div className="grid gap-3 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Custo de ida</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Combustível</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.litersNeeded.toLocaleString("pt-BR")} L</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Autonomia</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.autonomyKm ? `${fuelEconomy.data.autonomyKm.toLocaleString("pt-BR")} km` : "—"}</p><p className="mt-1 text-xs text-[#56766A]">{fuelEconomy.data.refuelsNeeded == null ? "Adicione o tanque para estimar paradas." : fuelEconomy.data.refuelsNeeded ? `${fuelEconomy.data.refuelsNeeded} parada(s) estimada(s).` : "Sem parada estimada."}</p></div></div>}</div></div> : <div className="mt-5 border-l-2 border-[#356451] bg-white/55 p-4 text-sm leading-relaxed text-[#365E51]">Entre na sua conta para usar um veículo salvo e calcular consumo, custo e autonomia desta rota. <button type="button" onClick={startLogin} className="font-bold underline underline-offset-2">Entrar agora</button></div>}</section>
              </div>
            )}
          </div>
        </section>

        {planned && <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo da rota">
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-[#3DE3FF]">Distância</p>
            <p className="mt-1 text-lg font-black text-white">{selectedRouteDistanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
            <p className="text-[0.58rem] text-white/45">rota selecionada</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-[#C7FF3C]">Tempo</p>
            <p className="mt-1 text-lg font-black text-white">{minutes(selectedRouteDuration)}</p>
            <p className="text-[0.58rem] text-white/45">estimativa atual</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-[#BDA5FF]">Paradas</p>
            <p className="mt-1 text-lg font-black text-white">{planned.stops.length}</p>
            <p className="text-[0.58rem] text-white/45">encontradas na rota</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-black uppercase tracking-[.1em] text-[#FFC928]">ANP</p>
            <p className="mt-1 text-lg font-black text-white">{planned.priceCoverage}</p>
            <p className="text-[0.58rem] text-white/45">referências vinculadas</p>
          </div>
        </section>

        {planned && <MobileNavigationCenter
          origin={origin}
          destination={destination}
          distance={selectedRoute ? selectedRouteDistanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km" : planned.route.distanceLabel}
          duration={minutes(selectedRouteDuration)}
          recommendationName={planned.recommendation?.name ?? null}
          detourKm={planned.recommendation?.detourKm ?? null}
          detourSource={planned.recommendation?.detourSource === "real" ? "real" : "estimated"}
          fuelCost={fuelEconomy.data?.tripCost ?? null}
          litersNeeded={fuelEconomy.data?.litersNeeded ?? null}
          autonomyKm={fuelEconomy.data?.autonomyKm ?? null}
          offline={offline}
          snapshot={loadedFromOffline}
          snapshotSavedAt={offlineSavedAt}
          saved={Boolean(latestOfflineRoute && latestOfflineRoute.id === offlineRouteId(origin, destination))}
          onNavigate={openDestinationNavigation}
          onGoogleMaps={() => window.open(buildGoogleMapsDestinationUrl(destination, true), "_blank", "noopener,noreferrer")}
          onWaze={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")}
          onAppleMaps={() => window.open(buildAppleMapsDirectionsUrl(destination), "_blank", "noopener,noreferrer")}
          onMultiStopNavigate={(waypoints) => window.open(buildGoogleMapsMultiStopUrl(destination, waypoints, true), "_blank", "noopener,noreferrer")}
          onGoogleMapsPreferred={(preference, waypoints) => window.open(buildGoogleMapsMultiStopUrl(destination, waypoints, true, preference), "_blank", "noopener,noreferrer")}
          onAppleMapsPreferred={(preference, waypoints) => window.open(buildAppleMapsDirectionsUrl(destination, undefined, preference, waypoints), "_blank", "noopener,noreferrer")}
          onShare={shareRoute}
          onSave={saveCurrentRouteOffline}
          onRefresh={loadedFromOffline && !offline ? () => {
            setShareMessage("Buscando dados atuais da rota…");
            void calculateCurrentRoute().catch(() => {
              setShareMessage("Não foi possível atualizar os dados agora. A rota salva continua disponível neste aparelho.");
            });
          } : undefined}
          onStations={() => document.getElementById("route-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          activeRouteLabel={selectedRouteLabel}
          routeConfirmed={routeAlternatives.length <= 1 || routeConfirmed}
        />}

        {!drivingMode && <LocalRouteCalculator initialDistanceKm={planned ? planned.route.distanceMeters / 1000 : 0} />}




        {planned && !drivingMode && <section id="route-stations" className="mt-10 scroll-mt-24"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Paradas na rota</p><h2 className="font-display mt-3 text-4xl font-semibold tracking-[-0.06em]">Postos encontrados.</h2></div><div className="flex items-end gap-3"><p className="max-w-md text-sm leading-relaxed text-[#607570]">Preços são referências datadas; o desvio informado é real quando calculado pela rota.</p><button type="button" onClick={shareRoute} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-none border border-[#163840] px-4 py-2 text-xs font-bold text-[#163840] transition hover:bg-[#163840] hover:text-white"><Share2 className="size-4" /> Compartilhar rota</button></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{planned.stops.map(stop => { const isRecommended = planned.recommendation?.placeId === stop.placeId; return <article key={stop.placeId} className={`flex min-h-60 flex-col border bg-white p-5 ${isRecommended ? "border-[#9EBF1F] ring-1 ring-[#D4E67F]" : "border-[#D4DDD5]"}`}><div className="flex items-start justify-between gap-4"><div className="grid size-11 place-items-center rounded-full bg-[#E8EEE8] text-[#163840]"><Fuel className="size-4" /></div><span className={`text-[0.6rem] font-bold uppercase tracking-[0.14em] ${isRecommended ? "text-[#668400]" : "text-[#748985]"}`}>{isRecommended ? "Melhor para sua prioridade" : "Posto próximo"}</span></div><h3 className="mt-6 text-lg font-bold leading-tight">{stop.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#667A76]">{stop.address}</p><div className="mt-auto pt-5">{stop.priceReference ? <p className="mb-2 text-xs text-[#55736C]">Referência ANP: <strong>{Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · {new Date(stop.priceReference.collectedAt).toLocaleDateString("pt-BR")}</p> : <p className="mb-2 text-xs text-[#788A86]">Preço oficial ainda não vinculado para este posto.</p>}{isRecommended && <p className="mb-4 text-xs leading-relaxed text-[#5D7200]">Desvio {planned.recommendation?.detourSource === "real" ? "real" : "estimado"}: {planned.recommendation?.detourKm.toLocaleString("pt-BR")} km.</p>}<div className="grid grid-cols-2 gap-2"><Button onClick={() => { setSelectedStop(stop); track("station_sheet_opened", destination || origin); }} variant="outline" className="min-h-11 rounded-none border-[#163840] text-[#163840] hover:bg-[#163840] hover:text-white">Ver ficha</Button><Button onClick={() => openNavigation(stop)} variant="outline" className="min-h-11 rounded-none border-[#163840] text-[#163840] hover:bg-[#163840] hover:text-white"><ExternalLink className="mr-2 size-3.5" />Navegar</Button></div></div></article>; })}</div>
        </section>}

        {!drivingMode && <OfflineRouteVault />}

        <StationSheet open={Boolean(selectedStop)} onOpenChange={open => !open && setSelectedStop(null)} stop={selectedStop} recommendation={selectedStop && planned?.recommendation?.placeId === selectedStop.placeId ? planned.recommendation : null} favorite={Boolean(selectedStop && favoriteState.data?.includes(selectedStop.placeId))} onFavorite={toggleFavorite} onNavigationConfirmed={() => track("station_navigation_confirmed", destination || origin)} />

        {planned && planned.anpReferences.length > 0 && <section className="mt-8 border border-[#D7DFD8] bg-white p-5 sm:p-6"><p className="eyebrow">Fonte de preço</p><h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em]">Referências semanais da ANP</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#607570]">Os preços mostrados nos cartões são referências datadas e só aparecem quando há vínculo com o posto. Esta fonte não representa o preço atual na bomba.</p><div className="mt-4 flex flex-wrap gap-2">{planned.anpReferences.slice(0, 4).map(reference => <span key={reference.id} className="border border-[#CBD8CF] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#45635C]">{reference.product} · {Number(reference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {new Date(reference.collectedAt).toLocaleDateString("pt-BR")}</span>)}</div></section>}

        {shareMessage && <div className="mt-8 flex items-center gap-3 border-l-4 border-[#FFC928] bg-[#EAF0E9] p-5 text-sm text-[#42645C]"><CheckCircle2 className="size-5 text-[#163840]" />{shareMessage}</div>}
        <div className="mt-12 border-t border-[#D8DED5] pt-6 text-xs leading-relaxed text-[#667A76]">Dados geográficos e de rota: Google Maps. Preços, quando exibidos, são referências oficiais periódicas da ANP e não constituem oferta ou garantia de preço no posto.</div>
      </main>
    </div>
  );
}
