import PlannerTravelPreferences from "@/components/PlannerTravelPreferences";
import PlannerLocationPicker from "@/components/PlannerLocationPicker";
import { useLiveTrip } from "@/hooks/useLiveTrip";
import ReadyRouteShortcuts from "@/components/ReadyRouteShortcuts";
import OfflineReadiness from "@/components/OfflineReadiness";
import RoutePublicServiceCard from "@/components/RoutePublicServiceCard";
import QuickFilterChips from "@/components/QuickFilterChips";
import { DestinationActions } from "@/components/DestinationActions";
import { ArrowLeftRight, Bike, Bookmark, Bus, Car, CheckCircle2, ChevronDown, ExternalLink, Fuel, Loader2, LocateFixed, Map, Navigation, PersonStanding, RefreshCw, Route as RouteIcon, Share2, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { localDataEvent } from "@/lib/localData";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, rememberTrip } from "@/lib/mobilePreferences";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildWazeNavigationUrl, buildRouteShareText, openExternalUrl, shareText, vibration } from "@/lib/mobileTools";
import { findPreparedRouteByCoordinates, findBestOfflineRouteForTrip, getOfflineRoute, listOfflineRoutes, offlineRouteId, offlineRouteTravelMode, saveOfflineRoute, removeOfflineRoute, isOfflineRouteStale, type OfflineRoute } from "@/lib/offlineStore";
import { RouteMap } from "@/components/RouteMap";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";
import TripFuelBriefing from "@/components/TripFuelBriefing";
import ArrivalTimePlannerCard from "@/components/ArrivalTimePlannerCard";
import RideOptions from "@/components/RideOptions";
import DepartureAssistant from "@/components/DepartureAssistant";
import { getLocalRoutePresets, LOCAL_ROUTE_PRESETS, type RouteDestinationCategory, type RouteDestinationCategoryFilter } from "@/lib/localRoutePresets";
import { mobileStationDestination } from "@/lib/unifiedDestination";
import { listUnifiedDestinationFavorites, unifiedDestinationEvent } from "@/lib/unifiedDestinationStore";
import { mobileDestinationEvent } from "@/lib/mobileDestinations";
import { supportsLiveRouting } from "@/lib/runtimeCapabilities";
import { buildPublicRoutePayload, resolveOfflineRoutePoint, calculateOfflineRoute, calculatePrivateLocationRoute, calculatePublicRoute, type PublicTravelMode } from "@/lib/publicRouting";
import { PRIVATE_LOCATION_LABEL, consumePrivateLocationHandoff, isCurrentLocationLabel, privateOriginForExternalNavigation, privateOriginForHistory } from "@/lib/locationPrivacy";
import { buildReusableTripPlannerUrl, buildSavedRoutePlannerUrl } from "@/lib/tripLinks";
import { PLANNER_EXPERIENCE_OPTIONS, plannerExperienceDetail, resolvePlannerExperience, type PlannerExperienceMode } from "@/lib/plannerModes";
import { effectivePlannerMode, plannerActionLabel, routeFreshness, shouldAutoRefreshSavedRoute } from "@/lib/routeExperience";

type ServerPlannedRoute = NonNullable<ReturnType<typeof trpc.routes.plan.useMutation>["data"]>;
type PlannedRoute = Omit<ServerPlannedRoute, "route"> & {
  route: ServerPlannedRoute["route"] & { destinationReference?: { name: string; sourceLabel: string; precision: string } };
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds === 0) return "0 min";
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
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(Date.now() + seconds * 1000));
}

const PLANNER_QUICK_PLACES = LOCAL_ROUTE_PRESETS.filter(item =>
  ["centro", "rodoviaria", "prefeitura", "upa", "heal", "aguas-lindas-shopping", "posto-ponteio"].includes(item.id)
).map(item => ({ label: item.label, value: item.destination }));

const destinationCategoryLabel: Record<RouteDestinationCategory, string> = {
  saude: "Saúde",
  educacao: "Educação",
  servicos: "Serviços",
  transporte: "Transporte",
  compras: "Compras",
  combustivel: "Combustível",
  centro: "Cidade",
  alimentacao: "Alimentação",
};

export default function Planner() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const pathname = location.split("?")[0].replace(/\/$/, "") || "/";
  const savedMode = pathname === "/salvos" || queryParams.get("salvos") === "1";
  const requestedExperience = resolvePlannerExperience(queryParams);
  const [experienceMode, setExperienceMode] =
    useState<PlannerExperienceMode>(requestedExperience);
  const economyMode = experienceMode === "economy";
  const drivingMode = experienceMode === "driving";
  const offlineMode = experienceMode === "offline";
  const initialTrip = useMemo(() => getLastTrip(), []);
  const [origin, setOrigin] = useState(() => {
    const queryOrigin = queryParams.get("origem");
    if (queryOrigin) return queryOrigin;
    const historicalOrigin = initialTrip?.origin ?? "";
    return isCurrentLocationLabel(historicalOrigin) ? "" : historicalOrigin;
  });
  const [destination, setDestination] = useState(
    () => queryParams.get("destino") || initialTrip?.destination || "",
  );
  const [mode, setMode] = useState<PublicTravelMode>(() => {
    const value = queryParams.get("modo");
    return value === "walking" || value === "cycling" || value === "transit" ? value : "driving";
  });
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const liveTrip = useLiveTrip(planned?.route ?? null);
  const remaining = liveTrip.active && liveTrip.progress && !liveTrip.progress.offRoute ? liveTrip.progress : null;
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [originPrivate, setOriginPrivate] = useState(false);
  const privateOriginRef = useRef<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<OfflineRoute[]>([]);
  const [savedRouteQuery, setSavedRouteQuery] = useState("");
  const [showAllDestinations, setShowAllDestinations] = useState(() => queryParams.get("destinos") === "1");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [destinationCategory, setDestinationCategory] = useState<RouteDestinationCategoryFilter>("todos");
  const [savedStations, setSavedStations] = useState<MobileStation[]>(listMobileStationFavorites);
  const [favoriteDestinations, setFavoriteDestinations] = useState(() =>
    listUnifiedDestinationFavorites().filter(item => item.kind !== "station")
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const [publicRoutePending, setPublicRoutePending] = useState(false);
  const track = useProductEvents();
  const planRoute = trpc.routes.plan.useMutation();
  const staticRuntime = !supportsLiveRouting();
  const requestVersion = useRef(0);
  const locationRequest = useRef(0);
  const localDataVersion = useRef(0);
  const plannerFormRef = useRef<HTMLFormElement>(null);
  const autoSubmittedKey = useRef<string | null>(null);

  const resetResult = () => {
    requestVersion.current += 1;
    locationRequest.current += 1;
    setLocating(false);
    setPublicRoutePending(false);
    setPlanned(null);
    setFallbackReady(false);
    setShowMap(false);
    setError(null);
    setSavedMessage(null);
  };

  useEffect(() => {
    const clearVisibleData = () => {
      localDataVersion.current += 1;
      requestVersion.current += 1;
      locationRequest.current += 1;
      privateOriginRef.current = null;
      setOriginPrivate(false);
      setLocating(false);
      setOrigin("");
      setDestination("");
      setPlanned(null);
      setFallbackReady(false);
      setPublicRoutePending(false);
      setShowMap(false);
      setError(null);
      setSavedMessage(null);
      setSavedRoutes([]);
      setSavedStations([]);
    };
    window.addEventListener(localDataEvent, clearVisibleData);
    return () => {
      window.removeEventListener(localDataEvent, clearVisibleData);
      requestVersion.current += 1;
      locationRequest.current += 1;
      localDataVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const refreshFavorites = () =>
      setFavoriteDestinations(
        listUnifiedDestinationFavorites().filter(item => item.kind !== "station")
      );
    window.addEventListener(unifiedDestinationEvent, refreshFavorites);
    window.addEventListener(mobileDestinationEvent, refreshFavorites);
    return () => {
      window.removeEventListener(unifiedDestinationEvent, refreshFavorites);
      window.removeEventListener(mobileDestinationEvent, refreshFavorites);
    };
  }, []);

  useEffect(() => {
    setExperienceMode(requestedExperience);
  }, [requestedExperience]);

  const refreshSavedRoutes = () => {
    const version = localDataVersion.current;
    void listOfflineRoutes().then(routes => {
      if (version === localDataVersion.current) setSavedRoutes(routes);
    }).catch(() => { if (version === localDataVersion.current) setSavedRoutes([]); });
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
    const privateHandoff =
      queryParams.get("local") === "1"
        ? consumePrivateLocationHandoff()
        : null;
    let active = true;
    const dataVersion = localDataVersion.current;
    if (routeId) {
      void getOfflineRoute(routeId).then(route => {
        if (!active || dataVersion !== localDataVersion.current) return;
        if (!route) { setError("Esta rota não está salva neste aparelho."); return; }
        if (route.id && route.id !== routeId) {
          window.history.replaceState(window.history.state, "", buildSavedRoutePlannerUrl(route.id));
        }
        privateOriginRef.current = null;
        setOriginPrivate(false);
        setOrigin(route.origin);
        setDestination(route.destination);
        setPlanned(route.payload as PlannedRoute);
        setShowMap(true);
        const savedMode = (route.payload as PlannedRoute).route as PlannedRoute["route"] & { mode?: PublicTravelMode };
        if (savedMode.mode === "walking" || savedMode.mode === "cycling" || savedMode.mode === "transit" || savedMode.mode === "driving") setMode(savedMode.mode);
        setSavedMessage("Rota salva aberta. O trânsito pode estar desatualizado.");
      }).catch(() => { if (active && dataVersion === localDataVersion.current) setError("Não foi possível abrir a rota salva."); });
    } else if (privateHandoff) {
      privateOriginRef.current =
        privateHandoff.lat.toFixed(5) + ", " + privateHandoff.lng.toFixed(5);
      setOriginPrivate(true);
      setOrigin(PRIVATE_LOCATION_LABEL);
      setDestination(queryParams.get("destino") ?? "");
    } else if (queryParams.has("origem") || queryParams.has("destino")) {
      privateOriginRef.current = null;
      setOriginPrivate(false);
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

  const recoverSavedTrip = async (from: string, to: string, version: number) => {
    if (originPrivate) return false;
    let routes = savedRoutes;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      routes = await Promise.race([
        listOfflineRoutes(),
        new Promise<OfflineRoute[]>(resolve => { timer = setTimeout(() => resolve(savedRoutes), 1500); }),
      ]);
    } catch {} finally { if (timer) clearTimeout(timer); }
    if (version !== requestVersion.current) return true;
    let saved = findBestOfflineRouteForTrip(routes, from, to, mode);
    if (!saved) {
      try {
        saved = findPreparedRouteByCoordinates(routes, resolveOfflineRoutePoint(from, routes), resolveOfflineRoutePoint(to, routes), mode);
      } catch { /* An ambiguous street still requires an explicit catalog choice. */ }
    }
    if (!saved) return false;
    setPlanned(saved.payload as PlannedRoute);
    setShowMap(true);
    setFallbackReady(false);
    setError(null);
    const restored = saved.payload as PlannedRoute;
    setSavedMessage("source" in restored.route && restored.route.source === "local-estimate"
      ? "Estimativa salva recuperada neste aparelho. Distância e tempo são aproximados; esta cópia não confirma o caminho pelas ruas nem fornece curvas."
      : "Usando a melhor rota já salva para esta viagem e modo de deslocamento. Distância e instruções são da cópia local; trânsito e horários podem estar desatualizados.");
    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locating) {
      setError("Aguarde a localização da origem terminar antes de calcular a rota.");
      return;
    }
    const from = origin.trim();
    const to = destination.trim();

    if (to.length < 3) {
      setError("Preencha o destino com pelo menos 3 caracteres.");
      return;
    }
    if (isCurrentLocationLabel(from) && !originPrivate) {
      setError("Para recalcular a partir da sua posição, toque em usar localização atual.");
      return;
    }
    if (from.length < 3 && (offlineMode || !online)) {
      setError("Para calcular sem internet, informe uma origem local já conhecida ou abra uma rota salva neste aparelho.");
      return;
    }
    if (from && from.toLocaleLowerCase("pt-BR") === to.toLocaleLowerCase("pt-BR")) {
      setError("Origem e destino precisam ser diferentes.");
      return;
    }
    resetResult();
    const version = requestVersion.current;

    if ((offlineMode || !online) && from.length >= 2 && !originPrivate) {
      setPublicRoutePending(true);
      if (await recoverSavedTrip(from, to, version)) {
        if (version !== requestVersion.current) return;
        setPublicRoutePending(false);
        rememberTrip(from, to);
        track("route_open", to);
        vibration(12);
        return;
      }
      if (version !== requestVersion.current) return;
    }

    if (
      staticRuntime ||
      from.length < 3 ||
      mode !== "driving" ||
      originPrivate ||
      offlineMode ||
      !online
    ) {
      setError(null);
      setFallbackReady(false);
      setPublicRoutePending(true);
      const publicOrigin = from;
      try {
        let resolvedOrigin = publicOrigin;
        if (!resolvedOrigin) {
          if (version !== requestVersion.current) return;
          setFallbackReady(true);
          setSavedMessage(
            offlineMode || !online
              ? "Para calcular sem internet, informe uma origem local já conhecida ou abra uma rota salva neste aparelho."
              : mode === "driving"
                ? "Destino preparado. Abra Google Maps, Waze ou Apple Maps para iniciar a navegação com a localização atual do aparelho."
                : "Destino preparado. Abra o Google Maps para iniciar a navegação no modo de deslocamento escolhido."
          );
          rememberTrip("", to);
          track("route_open", to);
          vibration(12);
          return;
        }
        const publicRoute =
          offlineMode || !online
            ? await calculateOfflineRoute(
                originPrivate && privateOriginRef.current
                  ? privateOriginRef.current
                  : resolvedOrigin,
                to,
                mode
              )
            : originPrivate && privateOriginRef.current
              ? await calculatePrivateLocationRoute(
                  privateOriginRef.current,
                  to,
                  mode
                )
              : await calculatePublicRoute(resolvedOrigin, to, mode);
        if (version !== requestVersion.current) return;
        const publicPayload = buildPublicRoutePayload(publicRoute) as unknown as PlannedRoute;
        setPlanned(publicPayload);
        setShowMap(true);
        const baseMessage =
          publicRoute.source === "local-estimate"
            ? offlineMode || !online
              ? "Estimativa offline entre os locais escolhidos, em linha reta. Não fornece curvas pelas ruas; uma rota já preparada preserva o trajeto e as instruções."
              : "Rota estimada localmente. A navegação externa deve ser usada para o trajeto e trânsito atualizados."
            : publicRoute.source === "offline-road"
              ? "Rota calculada no mapa viário offline salvo neste aparelho, sem depender de um roteador externo. Confirme a sinalização porque sentidos, bloqueios e obras podem mudar."
              : publicRoute.source === "mapbox"
                ? "Rota inteligente calculada com Mapbox; no carro, o tempo pode considerar o trânsito disponível."
                : "Rota calculada no próprio Trajeto com a rede viária pública.";
        const autoSaved = originPrivate
          ? false
          : await persistRouteLocally(publicPayload, resolvedOrigin, to);
        if (version !== requestVersion.current) return;
        setSavedMessage(
          baseMessage +
            (autoSaved ? " Cópia offline criada automaticamente." : "") +
            (originPrivate ? " Esta rota não foi salva automaticamente para proteger sua localização." : "")
        );
        if (resolvedOrigin) rememberTrip(originPrivate ? privateOriginForHistory(resolvedOrigin) : resolvedOrigin, to);
        track("route_open", to);
        vibration(14);
        return;
      } catch (routeError) {
        if (version !== requestVersion.current) return;
        if (await recoverSavedTrip(from, to, version)) return;
        setSavedMessage(null);
        setFallbackReady(true);
        setError(routeError instanceof Error ? routeError.message : "Não foi possível calcular a rota pública.");
        if (publicOrigin) rememberTrip(originPrivate ? privateOriginForHistory(publicOrigin) : publicOrigin, to);
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
    rememberTrip(originPrivate ? privateOriginForHistory(from) : from, to);
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
      setPublicRoutePending(true);
      try {
        const route = navigator.onLine
          ? await calculatePublicRoute(from, to, mode)
          : await calculateOfflineRoute(from, to, mode);
        if (version !== requestVersion.current) return;
        const result = buildPublicRoutePayload(route) as unknown as PlannedRoute;
        setPlanned(result);
        setShowMap(true);
        setFallbackReady(false);
        const saved = await persistRouteLocally(result, from, to);
        if (version !== requestVersion.current) return;
        setSavedMessage("Servidor indisponível. " +
          (route.source === "local-estimate"
            ? "Usando estimativa local, sem trânsito ao vivo."
            : route.source === "offline-road"
              ? "Usando a malha viária offline salva no aparelho."
              : "Usando rota da rede viária pública.") +
          (saved ? " Cópia offline criada automaticamente." : ""));
        vibration(14);
      } catch {
        if (version !== requestVersion.current) return;
        if (await recoverSavedTrip(from, to, version)) return;
        setError("Não foi possível calcular. Use uma rota salva ou informe locais conhecidos e tente novamente.");
        setFallbackReady(true);
        vibration(8);
      } finally {
        if (version === requestVersion.current) setPublicRoutePending(false);
      }
    }
  };

  const useCurrentLocation = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      setError("Localização não disponível neste navegador. Digite a origem para continuar.");
      return;
    }
    setError(null);
    setLocating(true);
    const locationVersion = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition(
      position => {
        if (locationVersion !== locationRequest.current) return;
        setLocating(false);
        resetResult();
        privateOriginRef.current = position.coords.latitude.toFixed(5) + ", " + position.coords.longitude.toFixed(5);
        setOriginPrivate(true);
        setOrigin(PRIVATE_LOCATION_LABEL);
        vibration(14);
      },
      () => {
        if (locationVersion !== locationRequest.current) return;
        setLocating(false);
        setError("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const swap = () => {
    resetResult();
    if (originPrivate) {
      privateOriginRef.current = null;
      setOriginPrivate(false);
      setOrigin(destination);
      setDestination("");
      vibration();
      return;
    }
    setOrigin(destination);
    setDestination(origin);
    vibration();
  };

  const clear = () => {
    locationRequest.current += 1;
    setLocating(false);
    resetResult();
    privateOriginRef.current = null;
    setOriginPrivate(false);
    setOrigin("");
    setDestination("");
  };

  const persistRouteLocally = async (route: PlannedRoute, routeOrigin: string, routeDestination: string) => {
    const normalizedOrigin = originPrivate ? privateOriginForHistory(routeOrigin) : routeOrigin.trim();
    const normalizedDestination = routeDestination.trim();
    if (normalizedOrigin.length < 2 || normalizedDestination.length < 2) return false;
    try {
      await saveOfflineRoute({
        id: offlineRouteId(normalizedOrigin, normalizedDestination, mode),
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
      setSavedMessage("Viagem preparada para uso offline neste aparelho.");
      vibration(16);
    } else {
      setSavedMessage("Não foi possível preparar esta viagem para uso offline.");
    }
  };

  const openSavedRoute = (route: OfflineRoute) => {
    setLocation(buildSavedRoutePlannerUrl(route.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeSavedRoute = async (route: OfflineRoute) => {
    try {
      await removeOfflineRoute(route.id);
      refreshSavedRoutes();
    } catch { setSavedMessage("Não foi possível excluir a rota. Tente novamente."); }
  };

  const routeOriginIsPrivate = originPrivate || isCurrentLocationLabel(origin);

  const shareRoute = async () => {
    if (!planned) return;
    try {
      const text = buildRouteShareText(
        routeOriginIsPrivate ? PRIVATE_LOCATION_LABEL : origin,
        destination,
        planned.recommendation ? {
          name: planned.recommendation.name,
          price: planned.recommendation.price,
          detourKm: planned.recommendation.detourKm,
          detourSource: planned.recommendation.detourSource,
        } : null
      );
      const params = new URLSearchParams({ destino: destination.trim(), modo: mode });
      if (!routeOriginIsPrivate) params.set("origem", origin.trim());
      const url = window.location.origin + appUrl("/planejar") + "?" + params.toString();
      await shareText(text, url, "Trajeto · rota");
      setSavedMessage("Rota compartilhada.");
    } catch {}
  };

  const openExternal = (provider: "google" | "waze" | "apple") => {
    const googleMode = mode === "walking" ? "walking" : mode === "cycling" ? "bicycling" : mode === "transit" ? "transit" : "driving";
    const externalOrigin = routeOriginIsPrivate
      ? privateOriginForExternalNavigation(PRIVATE_LOCATION_LABEL)
      : origin;
    const target =
      provider === "google" || mode !== "driving"
        ? buildGoogleMapsDirectionsUrl(externalOrigin, destination, googleMode, true)
        : provider === "waze"
          ? buildWazeNavigationUrl(destination)
          : buildAppleMapsDirectionsUrl(destination, externalOrigin);
    openExternalUrl(target);
    track("route_open", destination || origin);
  };

  const openStation = (stop: PlannedRoute["stops"][number] | undefined) => {
    if (!stop) { setSavedMessage("Não há endereço disponível para esta parada."); return; }
    openExternalUrl(buildGoogleMapsDirectionsUrl(routeOriginIsPrivate ? "" : origin, stop.address || stop.name, "driving", true));
  };

  const availableDestinations = useMemo(
    () => getLocalRoutePresets(destinationFilter, destinationCategory),
    [destinationFilter, destinationCategory]
  );

  const filteredSavedRoutes = useMemo(() => {
    const query = savedRouteQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return savedRoutes;
    return savedRoutes.filter(route =>
      (route.origin + " " + route.destination).toLocaleLowerCase("pt-BR").includes(query)
    );
  }, [savedRoutes, savedRouteQuery]);

  const hasOfflineRouteForDestination = useMemo(() => {
    const target = destination.trim().toLocaleLowerCase("pt-BR");
    if (target.length < 3) return false;
    return savedRoutes.some(
      route => route.destination.trim().toLocaleLowerCase("pt-BR") === target,
    );
  }, [savedRoutes, destination]);

  const exactSavedRoute = useMemo(
    () =>
      originPrivate
        ? null
        : findBestOfflineRouteForTrip(
            savedRoutes,
            origin.trim(),
            destination.trim(),
            mode
          ),
    [savedRoutes, origin, destination, mode, originPrivate]
  );
  const activeExperienceMode = effectivePlannerMode(
    experienceMode,
    online,
    Boolean(exactSavedRoute)
  );
  const exactSavedRouteFreshness = exactSavedRoute
    ? routeFreshness(exactSavedRoute.savedAt)
    : null;
  const primaryActionLabel = plannerActionLabel(
    activeExperienceMode,
    mode,
    online
  );

  const publicRouteSource = planned
    ? (
        planned.route as typeof planned.route & {
          source?: "mapbox" | "osrm" | "offline-road" | "local-estimate";
          steps?: Array<{
            instruction: string;
            name?: string;
            distanceMeters: number;
            durationSeconds: number;
            maneuver?: string;
          }>;
        }
      ).source
    : undefined;

  const routeForMap = planned ? [{
    id: "principal",
    source: publicRouteSource,
    polyline: planned.route.polyline ?? null,
    selected: true,
    trafficIntervals: [],
    durationSeconds: planned.route.durationSeconds,
    distanceMeters: planned.route.distanceMeters,
    steps: (
      planned.route as typeof planned.route & {
        steps?: Array<{
          instruction: string;
          name?: string;
          distanceMeters: number;
          durationSeconds: number;
          maneuver?: string;
        }>;
      }
    ).steps ?? [],
  }] : [];

  return (
    <main className="planner-premium visual-shell min-h-[100dvh] bg-background pb-28 text-foreground md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div>

            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">Planejar rota</h1>
          </div>
          <span className={"status-pill " + (online ? "border-primary/20 text-primary" : "border-warning/25 text-warning")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!savedMode && (
          <details open={!planned} className="premium-card premium-panel planner-trip-form mt-5 rounded-[1.6rem] border border-border/15 bg-card p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <summary className="planner-form-summary">{planned ? "Alterar viagem" : "Origem e destino"}<ChevronDown className="size-4" /></summary>
            <form ref={plannerFormRef} onSubmit={submit}>
              <h2 className="sr-only">Escolha seu destino</h2>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-foreground/70">Destino</span>
                <div className="premium-field mt-2 flex items-center gap-2 rounded-2xl border border-primary/18 bg-background px-3">
                  <span className="size-2.5 rounded-full bg-primary" />
                  <input value={destination} onChange={event => { resetResult(); setDestination(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="Para onde você vai" autoComplete="street-address" />
                </div>
              </label>
              <details className="planner-location-options mt-2"><summary>Escolher destino no catálogo</summary>
              <QuickFilterChips
                label="Destinos rápidos"
                options={PLANNER_QUICK_PLACES}
                value={destination}
                onPick={value => { resetResult(); setDestination(value); }}
                className="mt-2"
              />

              <PlannerLocationPicker kind="destino" value={destination} onChoose={coordinate => { resetResult(); setDestination(coordinate); }} />
              </details>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[.14em] text-foreground/70">{staticRuntime ? "Origem · opcional" : "Origem"}</span>
                <div className="premium-field planner-location-field mt-2 flex items-center gap-2 rounded-2xl border border-border/10 bg-background px-3">
                  <span className="size-2.5 rounded-full bg-accent" />
                  <input value={origin} onChange={event => { resetResult(); privateOriginRef.current = null; setOriginPrivate(false); setOrigin(event.target.value); }} className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="De onde você sai" autoComplete="street-address" />
                  <button type="button" onClick={useCurrentLocation} disabled={locating} className="grid size-11 shrink-0 place-items-center rounded-xl text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-25" aria-label="Usar localização atual"><LocateFixed className="size-4" /></button>
                </div>
              </label>
              <details className="planner-location-options mt-2"><summary>Escolher origem no catálogo</summary>
              <QuickFilterChips
                label="Origens rápidas"
                options={PLANNER_QUICK_PLACES}
                value={origin}
                onPick={value => { resetResult(); privateOriginRef.current = null; setOriginPrivate(false); setOrigin(value); }}
                className="mt-2"
              />

              <PlannerLocationPicker kind="origem" value={origin} onChoose={coordinate => { resetResult(); privateOriginRef.current = null; setOriginPrivate(false); setOrigin(coordinate); }} />
              </details>

              <div className="my-2 flex justify-end">
                <button type="button" onClick={swap} disabled={!origin && !destination} className="grid size-11 place-items-center rounded-full border border-border/10 text-muted-foreground disabled:opacity-25" aria-label="Inverter origem e destino">
                  <ArrowLeftRight className="size-4" />
                </button>
              </div>

              <PlannerTravelPreferences
                mode={mode}
                experienceMode={experienceMode}
                onModeChange={value => { resetResult(); setMode(value); }}
                onExperienceChange={value => {
                  resetResult();
                  setExperienceMode(value);
                  if (value === "economy" || value === "driving") setMode("driving");
                }}
              />

              <button type="submit" data-testid="planner-primary-action" aria-busy={locating || planRoute.isPending || publicRoutePending} disabled={locating || planRoute.isPending || publicRoutePending || destination.trim().length < 3} className="planner-primary-action mt-4 flex min-h-13 w-full items-center justify-between rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-35 active:scale-[.99]">
                <span>{locating ? "Aguarde a localização…" : planRoute.isPending || publicRoutePending ? "Calculando rota…" : primaryActionLabel}</span>
                {planRoute.isPending || publicRoutePending ? <Loader2 className="size-5 animate-spin" /> : <Navigation className="size-5" />}
              </button>
              <details className="mobile-disclosure mt-3"><summary>Destinos e atalhos <ChevronDown className="size-4" /></summary>
              <div className="mt-3">
                <button type="button" onClick={() => setShowAllDestinations(value => !value)} aria-expanded={showAllDestinations} aria-controls="all-destinations-panel" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-accent/15 bg-accent/[.04] px-3 text-left">
                  <span><span className="block text-xs font-black uppercase tracking-[.12em] text-accent">Destinos disponíveis</span><span className="mt-0.5 block text-xs font-bold text-foreground/75">Todos os {getLocalRoutePresets().length} destinos locais, lojas e referências, por categoria</span></span>
                  <ChevronDown className={"size-4 text-accent transition-transform " + (showAllDestinations ? "rotate-180" : "")} />
                </button>
                {showAllDestinations && (
                  <div id="all-destinations-panel" className="premium-card mt-2 rounded-2xl border border-border/10 bg-card p-3">
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                      {([
                        ["todos", "Todos"],
                        ["alimentacao", "Comer"],
                        ["saude", "Saúde"],
                        ["educacao", "Educação"],
                        ["servicos", "Serviços"],
                        ["transporte", "Transporte"],
                        ["compras", "Compras"],
                        ["combustivel", "Combustível"],
                        ["centro", "Centro"],
                      ] as const).map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setDestinationCategory(value)} aria-pressed={destinationCategory === value} className={"min-h-10 shrink-0 rounded-full border px-3 text-xs font-black " + (destinationCategory === value ? "border-primary/35 bg-primary/10 text-primary" : "border-border/10 bg-muted/[.02] text-muted-foreground")}>{label}</button>
                      ))}
                    </div>
                    <input value={destinationFilter} onChange={event => setDestinationFilter(event.target.value)} aria-label="Filtrar todos os destinos disponíveis" placeholder="Filtrar destino, bairro ou serviço" className="mt-2 min-h-11 w-full rounded-xl border border-border/10 bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground" autoComplete="off" enterKeyHint="search" />
                    <div className="mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" tabIndex={0} role="region" aria-label="Lista de destinos disponíveis">
                      {availableDestinations.map(item => (
                        <button key={item.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(item.destination) + "&auto=1")} className="premium-card group flex min-h-[5.4rem] min-w-0 items-center gap-3 rounded-2xl border border-border/10 px-3 text-left transition-colors hover:border-accent/30 active:scale-[.99]">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15"><RouteIcon className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="min-w-0 break-words text-xs font-black leading-snug text-foreground">{item.label}</span>
                              <span className="rounded-full border border-border/15 bg-muted/[.04] px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[.07em] text-primary">{destinationCategoryLabel[item.category]}</span>
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[.08em] text-primary">Ir</span>
                        </button>
                      ))}
                      {availableDestinations.length === 0 && <p className="rounded-xl bg-muted/[.025] p-4 text-xs text-muted-foreground">Nenhum destino corresponde ao filtro.</p>}
                    </div>
                  </div>
                )}
              </div>

              <ReadyRouteShortcuts compact initialMode={mode} />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getLastTrip() && <button type="button" onClick={() => { const trip = getLastTrip(); if (!trip) return; setLocation(buildReusableTripPlannerUrl(trip, { auto: true })); }} className="min-h-11 shrink-0 rounded-full border border-border/10 bg-muted/[.03] px-3 text-xs font-bold text-foreground/60">Última rota</button>}
                <button type="button" onClick={clear} disabled={!origin && !destination} className="min-h-11 shrink-0 rounded-full border border-border/10 bg-muted/[.03] px-3 text-xs font-bold text-muted-foreground disabled:opacity-30">Limpar</button>
              </div>

              </details>
              {destination.trim().length >= 3 && online && activeExperienceMode !== "offline" && (
                <div className={"mt-2 grid gap-2 " + (mode === "driving" ? "grid-cols-3" : "grid-cols-1")}>
                  <button type="button" onClick={() => openExternal("google")} aria-label="Abrir Google Maps agora" className="min-h-11 rounded-xl border border-border/10 bg-muted/[.03] px-2 text-xs font-black text-foreground/75">
                    Google · {mode === "walking" ? "a pé" : mode === "cycling" ? "bicicleta" : mode === "transit" ? "transporte" : "carro"}
                  </button>
                  {mode === "driving" && (
                    <>
                      <button type="button" onClick={() => openExternal("waze")} aria-label="Abrir Waze agora" className="min-h-11 rounded-xl border border-accent/20 bg-accent/[.04] px-2 text-xs font-black text-accent">
                        Waze
                      </button>
                      <button type="button" onClick={() => openExternal("apple")} aria-label="Abrir Apple Maps agora" className="min-h-11 rounded-xl border border-border/10 bg-muted/[.03] px-2 text-xs font-black text-foreground/75">
                        Apple
                      </button>
                    </>
                  )}
                </div>
              )}
              {destination.trim().length >= 3 && (!online || activeExperienceMode === "offline") && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-warning/15 bg-warning/[.035] px-3 py-2">
                  <p className="text-xs leading-relaxed text-foreground/55">
                    Navegação externa oculta para evitar um atalho que depende de internet.
                  </p>
                  <button type="button" onClick={() => setLocation(appUrl("/salvos"))} className="min-h-10 shrink-0 rounded-xl border border-warning/20 px-3 text-xs font-black text-warning">
                    Salvas
                  </button>
                </div>
              )}
            </form>

            {error && (
              <div className="mt-3 rounded-2xl border border-warning/20 bg-warning/[.05] p-3" role="alert">
                <p className="text-xs font-bold text-warning">{error}</p>
                {!online && (
                  <button
                    type="button"
                    onClick={() => setLocation(appUrl("/salvos"))}
                    className="mt-2 min-h-10 rounded-xl border border-warning/25 px-3 text-xs font-black text-warning"
                  >
                    Ver rotas salvas
                  </button>
                )}
                {online && destination.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      openExternal("google")
                    }
                    className="mt-2 min-h-10 rounded-xl border border-warning/25 px-3 text-xs font-black text-warning"
                  >
                    Abrir no Google Maps
                  </button>
                )}
              </div>
            )}
          </details>
        )}

        {!savedMode && <details className="mobile-disclosure mt-4"><summary>Mais recursos da viagem <ChevronDown className="size-4" /></summary>
        {!savedMode && (
          <section className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Estado do planejamento">
            <div className="premium-card rounded-2xl border border-border/10 bg-muted/[.025] p-3">
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-muted-foreground">Modo efetivo</p>
              <p className="mt-1 text-sm font-black text-foreground">
                {PLANNER_EXPERIENCE_OPTIONS.find(item => item.id === activeExperienceMode)?.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {!online && experienceMode === "smart"
                  ? "Inteligente mudou para offline automaticamente."
                  : plannerExperienceDetail(activeExperienceMode)}
              </p>
            </div>
            <div className="premium-card rounded-2xl border border-border/10 bg-muted/[.025] p-3">
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-muted-foreground">Cópia local</p>
              <p className="mt-1 text-sm font-black text-foreground">
                {exactSavedRoute
                  ? exactSavedRouteFreshness === "fresh"
                    ? "Pronta · recente"
                    : exactSavedRouteFreshness === "aging"
                      ? "Pronta · salva hoje"
                      : "Pronta · antiga"
                  : "Ainda não preparada"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {exactSavedRoute
                  ? exactSavedRouteFreshness === "stale"
                    ? "Pode abrir sem rede; atualize quando estiver online."
                    : "Esta viagem pode ser recuperada no aparelho."
                  : "Calcule online uma vez para aumentar a cobertura offline."}
              </p>
            </div>
            <div className="premium-card rounded-2xl border border-border/10 bg-muted/[.025] p-3">
              <p className="text-[11px] font-black uppercase tracking-[.12em] text-muted-foreground">Rede</p>
              <p className={"mt-1 text-sm font-black " + (online ? "text-primary" : "text-warning")}>
                {online ? "Conectado" : "Sem conexão"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {online
                  ? exactSavedRoute && exactSavedRouteFreshness && shouldAutoRefreshSavedRoute(experienceMode, online, exactSavedRouteFreshness)
                    ? "Modo Inteligente vai preferir recalcular esta cópia antiga."
                    : "Rotas e dados disponíveis podem ser atualizados."
                  : exactSavedRoute
                    ? "A rota local continua disponível."
                    : "Use destinos preparados ou uma rota salva."}
              </p>
            </div>
          </section>
        )}

        {!savedMode && (
          <DepartureAssistant
            origin={originPrivate ? PRIVATE_LOCATION_LABEL : origin}
            destination={destination}
            mode={mode}
            online={online}
            hasOfflineRoute={hasOfflineRouteForDestination}
          />
        )}

        {!savedMode && destination.trim().length >= 3 && <RideOptions destination={destination} online={online} />}

        </details>}

        {economyMode && !savedMode && !planned && (
          <section className="premium-card mt-4 rounded-[1.6rem] border border-primary/15 bg-card p-4" aria-labelledby="economy-mode-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Fuel className="size-5" /></div>
              <div><p className="text-xs font-black uppercase tracking-[.15em] text-primary">Modo economia</p><h2 id="economy-mode-title" className="mt-1 text-lg font-black">Calculadora pronta.</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Informe distância, preço e consumo para calcular custo por viagem, mês e autonomia. Os valores ficam salvos neste aparelho.</p></div>
            </div>
          </section>
        )}

        {economyMode && !savedMode && !planned && <LocalRouteCalculator compact />}

        {offlineMode && !savedMode && (
          <section className="mt-4 rounded-2xl border border-warning/15 bg-warning/[.04] px-4 py-3" role="status" aria-live="polite">
            <p className="text-xs font-black text-warning">Modo offline ativo</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              O Trajeto evita provedores externos, reaproveita a rota salva exata quando existir e usa apenas dados locais para novas estimativas.
            </p>
          </section>
        )}

        {!savedMode && (offlineMode || !online) && <OfflineReadiness />}

        {drivingMode && !savedMode && (
          <section className="mt-4 rounded-2xl border border-accent/15 bg-accent/[.04] px-4 py-3" role="status" aria-live="polite">
            <p className="text-xs font-black text-accent">Modo condução ativo</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O Trajeto deixa a tela focada na viagem e mantém Google Maps, Waze e Apple Maps como opções de navegação atualizada.</p>
          </section>
        )}

        {savedMode && (
          <section className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-accent">Biblioteca local</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-.055em]">Rotas salvas.</h2></div>
              <span className="rounded-full border border-border/10 px-2.5 py-1 text-xs font-black text-muted-foreground">{savedRoutes.length + savedStations.length + favoriteDestinations.length}</span>
            </div>
            {savedMessage && <p role="status" className="mt-3 rounded-xl border border-border/15 px-3 py-2 text-xs text-foreground/70">{savedMessage}</p>}
            {savedRoutes.length > 0 && (
              <label className="mt-3 block">
                <span className="sr-only">Filtrar rotas salvas</span>
                <input
                  value={savedRouteQuery}
                  onChange={event => setSavedRouteQuery(event.target.value)}
                  placeholder="Filtrar por origem ou destino"
                  className="min-h-11 w-full rounded-xl border border-border/10 bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            )}
            {savedRoutes.length === 0 && savedStations.length === 0 && favoriteDestinations.length === 0 ? (
              <>
                <div className="mt-4 rounded-3xl border border-warning/20 bg-card p-4">
                  <p className="text-xs font-black text-foreground">Biblioteca vazia, mas o modo offline continua útil.</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/42">Os atalhos abaixo são destinos locais preparados no próprio app. Locais conhecidos permitem novas estimativas sem internet. Para guardar o trajeto pelas ruas e as instruções, calcule a viagem online uma vez; a cópia é salva automaticamente.</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
                    <a href="tel:190" className="min-h-11 rounded-xl border border-border/10 bg-background px-2 py-2 text-center text-xs font-black">Polícia · 190</a>
                    <a href="tel:192" className="min-h-11 rounded-xl border border-border/10 bg-background px-2 py-2 text-center text-xs font-black">SAMU · 192</a>
                    <a href="tel:193" className="min-h-11 rounded-xl border border-border/10 bg-background px-2 py-2 text-center text-xs font-black">Bombeiros · 193</a>
                  </div>
                </div>
                <section className="mt-4" aria-labelledby="offline-ready-title">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-[.14em] text-accent">Destinos prontos</p><h3 id="offline-ready-title" className="mt-1 text-lg font-black">Abra uma rota sem preencher tudo.</h3></div>
                    <span className="text-xs text-muted-foreground">Disponível no aparelho</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
                    {LOCAL_ROUTE_PRESETS.slice(0, 12).map(route => (
                      <button key={route.id} type="button" onClick={() => setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(route.destination) + "&auto=1")} className="min-h-[5.2rem] rounded-2xl border border-border/10 bg-card p-3 text-left">
                        <p className="break-words text-xs font-black leading-snug">{route.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{route.detail}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : savedRoutes.length > 0 && filteredSavedRoutes.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-border/10 bg-card p-5 text-sm leading-relaxed text-muted-foreground">
                Nenhuma rota corresponde ao filtro.
              </div>
            ) : (
              filteredSavedRoutes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filteredSavedRoutes.map(route => {
                    const stale = isOfflineRouteStale(route.savedAt);
                    return (
                      <article key={route.id} className="premium-card rounded-2xl border border-border/10 bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-xs font-black leading-snug">{route.origin} → {route.destination}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Salva em {new Date(route.savedAt).toLocaleString("pt-BR")}</p>
                          </div>
                          <span className={"shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase tracking-[.08em] " + (stale ? "border-amber-300/20 text-amber-200" : "border-primary/15 text-primary")}>
                            {stale ? "revisar" : "pronta"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                          <button type="button" onClick={() => openSavedRoute(route)} className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-background">Abrir rota</button>
                          <button type="button" onClick={() => {
                            const savedMode = offlineRouteTravelMode(route);
                            const googleMode = savedMode === "cycling" ? "bicycling" : savedMode;
                            openExternalUrl(buildGoogleMapsDirectionsUrl(privateOriginForExternalNavigation(route.origin), route.destination, googleMode, true));
                          }} className="min-h-11 rounded-xl border border-border/10 px-3 text-xs font-black text-foreground/70">Navegar agora · {offlineRouteTravelMode(route) === "walking" ? "a pé" : offlineRouteTravelMode(route) === "cycling" ? "bicicleta" : offlineRouteTravelMode(route) === "transit" ? "transporte" : "carro"}</button>
                        </div>
                        <button type="button" onClick={() => void removeSavedRoute(route)} aria-label={"Excluir rota salva " + route.destination} className="mt-2 min-h-10 w-full rounded-xl border border-destructive/20 text-xs font-black text-destructive"><Trash2 className="mr-1.5 inline size-3.5" />Excluir da biblioteca</button>
                      </article>
                    );
                  })}
                </div>
              )
            )}
          </section>
        )}

        {savedMode && favoriteDestinations.length > 0 && (
          <section className="mt-5" aria-labelledby="saved-destinations-title">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-accent">Destinos favoritos</p><h2 id="saved-destinations-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Seus lugares.</h2></div>
              <span className="rounded-full border border-border/10 px-2.5 py-1 text-xs font-black text-muted-foreground">{favoriteDestinations.length}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {favoriteDestinations.map(item => (
                <article key={item.id} className="premium-card min-w-0 rounded-2xl border border-border/10 bg-card p-4">
                  <p className="truncate text-sm font-black">{item.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.address}</p>
                  <div className="mt-3">
                    <DestinationActions
                      destination={item}
                      compact
                      saved={item.kind === "personal" ? true : undefined}
                      saveLocked={item.kind === "personal"}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {savedMode && savedStations.length > 0 && (
          <section className="mt-5" aria-labelledby="saved-stations-title">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.17em] text-accent">Postos favoritos</p><h2 id="saved-stations-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Seus postos.</h2></div>
              <span className="rounded-full border border-border/10 px-2.5 py-1 text-xs font-black text-muted-foreground">{savedStations.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedStations.map(station => (
                <article key={station.placeId} className="premium-card rounded-2xl border border-border/10 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{station.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{station.address}</p>
                      {station.isOpen != null && <p className={"mt-2 text-xs font-black " + (station.isOpen ? "text-primary" : "text-muted-foreground")}>{station.isOpen ? "Aberto na consulta salva" : "Fechado na consulta salva"}</p>}
                    </div>
                    <button type="button" onClick={() => { const result = toggleMobileStationFavorite(station); if (result.error) setSavedMessage("Não foi possível alterar o favorito. Confira o espaço e as permissões do navegador."); else setSavedStations(result.stations); }} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-border/10 text-primary" aria-label={"Remover " + station.name + " dos favoritos"}><Bookmark className="size-4 fill-current" /></button>
                  </div>
                  <div className="mt-3">
                    <DestinationActions
                      destination={mobileStationDestination(station)}
                      saved
                      onToggleSaved={() => {
                        const result = toggleMobileStationFavorite(station);
                        if (result.error) setSavedMessage("Não foi possível alterar o favorito. Confira o espaço e as permissões do navegador.");
                        else setSavedStations(result.stations);
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {fallbackReady && !planned && !savedMode && destination.trim() && online && activeExperienceMode !== "offline" && (
          <section className="mt-5 rounded-[1.6rem] border border-accent/20 bg-card p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="navigation-fallback-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-accent">Navegação externa</p>
                <h2 id="navigation-fallback-title" className="mt-1 text-lg font-black">Navegação pronta.</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{staticRuntime ? "Sua rota está pronta para abrir. O site público prepara a viagem sem fingir um cálculo próprio; o navegador escolhido recebe origem e destino e calcula distância, trânsito e chegada atualizados." : "O cálculo interno não está disponível para esta partida, mas sua viagem não ficou travada. Nenhuma distância, tempo ou pedágio foi inventado; o Trajeto encaminha a rota para um navegador que faz o cálculo atualizado."}</p>
              </div>
            </div>
            <div className={"mt-4 grid grid-cols-1 gap-2 " + (mode === "driving" ? "sm:grid-cols-3" : "")}>
              <button type="button" aria-label="Abrir Google Maps" onClick={() => openExternal("google")} className="min-h-12 rounded-xl bg-primary px-3 text-xs font-black text-background">
                Abrir Google Maps · {mode === "walking" ? "a pé" : mode === "cycling" ? "bicicleta" : mode === "transit" ? "transporte" : "carro"}
              </button>
              {mode === "driving" && (
                <>
                  <button type="button" onClick={() => openExternal("waze")} className="min-h-12 rounded-xl border border-warning/20 bg-warning/[.05] px-3 text-xs font-black text-warning">Abrir Waze</button>
                  <button type="button" onClick={() => openExternal("apple")} className="min-h-12 rounded-xl border border-border/15 bg-muted/[.04] px-3 text-xs font-black">Abrir Apple Maps</button>
                </>
              )}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">Esse modo é compatível com hospedagem estática, como GitHub Pages.</p>
          </section>
        )}

        {!savedMode && planned && (
          <section className="mt-5 animate-route-in">
            <div data-route-card className="premium-card route-card min-w-0 rounded-[1.6rem] border border-primary/15 bg-card p-4 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-primary">Rota calculada</p>
                  <h2 className="mt-1 break-words text-lg font-black leading-tight sm:text-xl">{origin} <span className="text-muted-foreground">→</span> {destination}</h2>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
                <div data-route-card className="min-w-0 rounded-2xl border border-accent/10 bg-accent/[.035] p-3"><RouteIcon className="size-4 text-accent" /><p className="mt-2 text-[11px] font-black uppercase tracking-[.1em] text-muted-foreground">{liveTrip.active ? "Distância restante" : "Distância"}</p><p className="mt-1 break-words text-base font-black">{formatDistance(liveTrip.active ? remaining?.distanceMeters : planned.route.distanceMeters)}</p></div>
                <div data-route-card className="min-w-0 rounded-2xl border border-primary/10 bg-primary/[.035] p-3"><Navigation className="size-4 text-primary" /><p className="mt-2 text-[11px] font-black uppercase tracking-[.1em] text-muted-foreground">{liveTrip.active ? "Tempo restante estimado" : "Tempo"}</p><p className="mt-1 break-words text-base font-black">{formatDuration(liveTrip.active ? remaining?.durationSeconds : planned.route.durationSeconds)}</p></div>
                <div data-route-card className="min-w-0 rounded-2xl border border-warning/10 bg-warning/[.035] p-3"><RefreshCw className="size-4 text-warning" /><p className="mt-2 text-[11px] font-black uppercase tracking-[.1em] text-muted-foreground">Chegada</p><p className="mt-1 break-words text-base font-black">{formatArrival(liveTrip.active ? remaining?.durationSeconds : planned.route.durationSeconds)}</p></div>
              </div>

              <div className="mt-3">
                <div className="premium-card rounded-2xl border border-border/10 bg-muted/[.025] p-3">
                  <p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Trânsito</p>
                  <p className="mt-1 text-xs font-black">{planned.traffic?.label ?? "Não informado"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{planned.traffic?.detail ?? "Sem detalhamento disponível."}</p>
                </div>

              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {online && activeExperienceMode !== "offline" && (
                  <>
                    <button type="button" aria-label="Google Maps" onClick={() => openExternal("google")} className="min-h-12 rounded-2xl bg-primary px-3 text-xs font-black text-background">
                      Google Maps · {mode === "walking" ? "a pé" : mode === "cycling" ? "bicicleta" : mode === "transit" ? "transporte" : "carro"}
                    </button>
                    {mode === "driving" && (
                      <>
                        <button type="button" onClick={() => openExternal("waze")} className="min-h-12 rounded-2xl border border-accent/30 bg-accent/[.06] px-3 text-xs font-black text-accent">Waze</button>
                        <button type="button" onClick={() => openExternal("apple")} className="min-h-11 rounded-2xl border border-border/10 bg-muted/[.03] px-3 text-xs font-black text-foreground/70">Apple Maps</button>
                      </>
                    )}
                  </>
                )}
                <button type="button" onClick={() => void shareRoute()} className="min-h-11 rounded-2xl border border-border/10 bg-muted/[.03] px-3 text-xs font-black text-foreground/70"><Share2 className="mr-1.5 inline size-3.5" />Compartilhar</button>
              </div>

              <div className="mt-3 rounded-2xl border border-accent/20 bg-accent/[.04] p-3">
                <button type="button" onClick={() => { if (liveTrip.active) liveTrip.stop(); else { liveTrip.start(); setShowMap(true); } }} className="min-h-11 w-full rounded-xl bg-accent px-3 text-sm font-black text-primary-foreground">{liveTrip.active ? "Parar acompanhamento" : "Iniciar acompanhamento"}</button>
                <p className="mt-2 text-xs leading-relaxed text-foreground/65">GPS ao vivo neste aparelho. Posição temporária no mapa local; tempo restante estimado, sem trânsito ao vivo.</p>
                <p role="status" className="mt-2 text-xs font-bold text-foreground/80">{liveTrip.message || (liveTrip.progress?.offRoute ? "Você está fora do trajeto. Pare o acompanhamento e confira ou recalcule a rota." : liveTrip.progress?.nearDestination ? "Você está próximo ao destino. Confirme a entrada do local." : liveTrip.point ? "Posição atualizada · precisão de " + Math.round(liveTrip.point.accuracy) + " m" : "Inicie para acompanhar sua viagem.")}</p>
                {liveTrip.point && <p className="mt-2 break-words text-xs leading-relaxed text-foreground/60">GPS atualizado às {new Date(liveTrip.point.timestamp).toLocaleTimeString("pt-BR")}{liveTrip.speed !== null ? " · " + Math.round(liveTrip.speed * 3.6) + " km/h · chegada estimada pela velocidade atual" : " · chegada estimada pelo percurso"}. Sem trânsito ao vivo.</p>}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                <button type="button" onClick={() => void saveCurrentRoute()} className="min-h-11 rounded-2xl border border-border/10 bg-muted/[.02] px-3 text-xs font-black text-foreground/60"><Bookmark className="mr-1.5 inline size-3.5" />Preparar para offline</button>
                <button type="button" onClick={() => setShowMap(value => !value)} className="min-h-11 rounded-2xl border border-border/10 bg-muted/[.02] px-3 text-xs font-black text-foreground/60"><Map className="mr-1.5 inline size-3.5" />{showMap ? "Ocultar mapa" : "Ver mapa"}</button>
              </div>

              {savedMessage && <p role="status" className="mt-3 rounded-xl bg-primary/[.05] px-3 py-2 text-xs font-bold text-primary">{savedMessage}</p>}
            </div>

            {planned.route.destinationReference && <p className="mt-3 break-words rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100" role="note">
              {planned.route.destinationReference.name} · {planned.route.destinationReference.precision} Fonte: {planned.route.destinationReference.sourceLabel}
            </p>}
            {showMap && (
              <section className="planner-map-shell mt-3 overflow-hidden rounded-[1.6rem] border border-border/10 bg-card shadow-[0_22px_60px_rgba(0,0,0,.28)]">
                <div className="flex items-center justify-between border-b border-border/10 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[.15em] text-muted-foreground">Mapa da rota</p>

                </div>
                <div className="min-h-[430px] max-w-full">
                  <RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} routes={routeForMap} privateOrigin={routeOriginIsPrivate} forceOffline={offlineMode || !online || liveTrip.active} travelMode={mode} livePosition={liveTrip.point ?? undefined} liveProgress={liveTrip.progress} liveSpeedMps={liveTrip.speed} />
                </div>
              </section>
            )}

            <RoutePublicServiceCard destination={destination} online={online} />
            {!liveTrip.active && <ArrivalTimePlannerCard durationSeconds={planned.route.durationSeconds} />}
            {mode === "driving" && <TripFuelBriefing distanceKm={(planned.route.distanceMeters ?? 0) / 1000} durationSeconds={planned.route.durationSeconds ?? undefined} />}

            {planned.recommendation && (
              <section className="mt-3 rounded-[1.5rem] border border-primary/15 bg-card p-4">
                <p className="text-xs font-black uppercase tracking-[.15em] text-primary">Parada sugerida</p>
                <h3 className="mt-1 text-lg font-black">{planned.recommendation.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{planned.recommendation.detourSource === "real" ? "Desvio calculado pela rota real" : "Desvio estimado"} · {planned.recommendation.detourKm.toLocaleString("pt-BR")} km</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openStation(planned.stops.find(stop => stop.name === planned.recommendation?.name) ?? planned.stops[0])} className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-background">Abrir rota até o posto</button>
                  <button type="button" onClick={() => setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(planned.recommendation?.name ?? ""))} className="min-h-11 rounded-xl border border-border/10 px-3 text-xs font-black text-foreground/70">Ver postos</button>
                </div>
              </section>
            )}

            {planned.stops.length > 0 && (
              <section className="mt-3">
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-accent">{publicRouteSource ? "No caminho" : "Paradas encontradas"}</p><h3 className="mt-1 text-2xl font-black tracking-[-.05em]">{planned.stops.length} posto(s)</h3></div><span className="text-xs text-muted-foreground">{publicRouteSource ? "catálogo local · posição estimada no corredor" : "dados desta consulta"}</span></div>
                <div className="mt-3 space-y-2">
                  {planned.stops.slice(0, 6).map(stop => (
                    <article key={stop.placeId} data-route-card className="min-w-0 rounded-2xl border border-border/10 bg-card p-4 shadow-[0_12px_30px_rgba(0,0,0,.18)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="break-words text-sm font-black leading-snug">{stop.name}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{stop.address}</p></div>
                        <Fuel className="size-4 shrink-0 text-accent" />
                      </div>
                      {stop.priceReference && <p className="mt-2 text-xs font-bold text-primary">Referência ANP: {Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}
                      <button type="button" onClick={() => openStation(stop)} className="mt-3 min-h-11 w-full rounded-xl border border-border/10 bg-muted/[.03] text-xs font-black text-foreground/70">Navegar até esta parada</button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-3 rounded-3xl border border-border/10 bg-muted/[.025] p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Mais detalhes da decisão</span><ChevronDown className="size-4 text-muted-foreground" /></summary>
                <div className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-foreground">
                  <p>Fonte da rota: {publicRouteSource === "local-estimate"
                    ? "estimativa local baseada nas coordenadas"
                    : publicRouteSource === "offline-road"
                      ? "malha viária OpenStreetMap salva para uso offline"
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
          <details className="mobile-disclosure mt-4">
            <summary>Calcular custo da viagem <ChevronDown className="size-4" /></summary>
          <LocalRouteCalculator initialDistanceKm={(planned.route.distanceMeters ?? 0) / 1000} compact />
          </details>
        )}

        <section className="mt-8 pb-3 text-center text-xs leading-relaxed text-muted-foreground">
          O Trajeto organiza dados e abre a navegação externa; ele não substitui Google Maps, Waze ou Apple Maps.
        </section>
      </div>
    </main>
  );
}
