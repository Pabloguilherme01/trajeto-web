import { BadgeInfo, ChevronRight, CircleCheck, Fuel, Heart, Loader2, Map as MapIcon, MapPin, Navigation, Search, Share2, SlidersHorizontal, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { appUrl } from "@/lib/appUrl";
import { buildGoogleMapsSearchUrl, getPreferredNavigationProvider, openNavigation, shareText, vibration } from "@/lib/mobileTools";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { getEconomyMode, getRecentSearches, mobilePreferenceEvent, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { corridorPresets } from "@/lib/corridorPresets";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE, AGUAS_LINDAS_ANP_CATALOG_REFERENCE, AGUAS_LINDAS_ANP_VERIFIED_COUNT, AGUAS_LINDAS_PRICE_REFERENCE, AGUAS_LINDAS_STATION_STATS, AGUAS_LINDAS_STATIONS_COUNT, AGUAS_LINDAS_STATIONS_LAST_SYNC, searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { inferredBrand } from "@/lib/stationListControls";
import { StationMap, type StationMapItem } from "@/components/StationMap";
import StationFiltersSheet from "@/components/StationFiltersSheet";
import { StationDirectoryCard } from "@/components/StationDirectoryCard";
import StationComparePanel from "@/components/StationComparePanel";
import { toast } from "sonner";
import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { cacheOfflineAnpSnapshot, cacheOfflineMapStations, getOfflineAnpSnapshot, getOfflineMapAgeLabel, getOfflineMapStations, hydrateOfflineAnpSnapshot, hydrateOfflineMapStations } from "@/lib/stationMapOffline";
import { loadAguasLindasAnpPrices, indexAnpPricesByCnpj } from "@/lib/anpPrices";
import { buildDirectoryCards, getDirectoryCoordinates, getDirectoryGasolinePrice, getDirectoryLabel, matchesFuelFilter, type FuelFilter } from "@/lib/stationDirectoryModel";
import type { AnpPriceSnapshot } from "@/lib/anpPrices";
import { stationDataConfidence } from "@/lib/stationEntity";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

function isBroadAguasLindasQuery(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized === "postos" ||
    normalized === "aguas lindas" ||
    normalized.includes("postos em aguas lindas") ||
    normalized.includes("postos de aguas lindas");
}


function getInitialQuery() {
  if (typeof window === "undefined") return corridorPresets[0]?.query || "postos";
  return new URLSearchParams(window.location.search).get("q") || corridorPresets[0]?.query || "postos";
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const [input, setInput] = useState(getInitialQuery);
  const [query, setQuery] = useState(getInitialQuery);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [economyMode, setEconomyMode] = useState(getEconomyMode);
  const [nearby, setNearby] = useState(false);
  const [showMap, setShowMap] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("view") === "map";
  });
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [saved, setSaved] = useState<MobileStation[]>(listMobileStationFavorites);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const verifiedFilterAvailable = AGUAS_LINDAS_ANP_VERIFIED_COUNT > 0;
  const [directorySearch, setDirectorySearch] = useState("");
  const [directorySort, setDirectorySort] = useState<"name" | "distance" | "brand" | "price">("name");
  const [directoryVisibleCount, setDirectoryVisibleCount] = useState(48);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [addressOnly, setAddressOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mappedOnly, setMappedOnly] = useState(false);
  const [priceOnly, setPriceOnly] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<"all" | 2 | 5 | 10>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const initialOfflineAnp = getOfflineAnpSnapshot();
  const initialOfflineMap = getOfflineMapStations();
  const [staticAnpRows, setStaticAnpRows] = useState<AnpFuelRow[]>(initialOfflineAnp.rows);
  const [staticAnpRetrievedAt, setStaticAnpRetrievedAt] = useState<string | null>(initialOfflineAnp.retrievedAt);
  const [offlineMap, setOfflineMap] = useState<StationMapItem[]>(initialOfflineMap.stations);
  const [priceSnapshot, setPriceSnapshot] = useState<AnpPriceSnapshot | null>(null);
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("all");

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const showSavedOnly = params.get("salvos") === "1";
  const staticRuntime = isGitHubPagesRuntime();
  const broadAguasLindasQuery = isBroadAguasLindasQuery(query);
  const anpLiveQuery = trpc.stationDirectory.anp.useQuery(
    { municipio: "AGUASLINDASDEGOIAS", uf: "GO" },
    { enabled: broadAguasLindasQuery && !showSavedOnly && !staticRuntime, retry: 1, staleTime: 10 * 60_000 },
  );
  const liveAnpRows = anpLiveQuery.data?.rows ?? [];
  const anpRows = staticRuntime ? staticAnpRows : liveAnpRows.length > 0 ? liveAnpRows : staticAnpRows;
  const anpStations = useMemo(() => groupAnpFuelRows(anpRows), [anpRows]);
  const aguasLindasCatalog = useMemo(() => searchAguasLindasStations("postos"), []);
  const pricesByCnpj = useMemo(() => indexAnpPricesByCnpj(priceSnapshot?.data ?? []), [priceSnapshot]);
  const directoryCards = useMemo(() => buildDirectoryCards(aguasLindasCatalog, anpStations), [aguasLindasCatalog, anpStations]);

  const directoryConfidenceCount = useMemo(
    () => directoryCards.filter(item => stationDataConfidence({ anp: item.anp, local: item.local }) >= 70).length,
    [directoryCards],
  );
  const directoryPriceCount = useMemo(
    () => directoryCards.filter(item => (pricesByCnpj.get(item.key)?.length ?? 0) > 0).length,
    [directoryCards, pricesByCnpj],
  );
  const priceFilterAvailable = directoryPriceCount > 0;

  const directoryBrands = useMemo(() => Array.from(new Set(directoryCards.map(item => item.anp?.distribuidora || item.local?.brand || "Sem bandeira"))).sort((a, b) => a.localeCompare(b, "pt-BR")), [directoryCards]);
  const directoryNeighborhoods = useMemo(() => Array.from(new Set(directoryCards.map(item => item.anp?.bairro || item.local?.neighborhood).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [directoryCards]);

  const directoryCardsFiltered = useMemo(() => {
    const normalized = directorySearch.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = directoryCards.filter(item => {
      const text = [
        item.local?.displayName,
        item.local?.legalName,
        item.local?.cnpj,
        item.local?.neighborhood,
        item.local?.address,
        item.local?.brand,
        item.anp?.razaoSocial,
        item.anp?.cnpj,
        item.anp?.bairro,
        item.anp?.endereco,
        item.anp?.distribuidora,
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const neighborhoodMatches = neighborhoodFilter === "all" || (item.anp?.bairro || item.local?.neighborhood || "") === neighborhoodFilter;
      const brandMatches = brandFilter === "all" || (item.anp?.distribuidora || item.local?.brand || "Sem bandeira") === brandFilter;
      const addressMatches = !addressOnly || Boolean(item.anp?.endereco || item.local?.address);
      const verifiedMatches = !verifiedOnly || Boolean(item.anp) || item.local?.dataQuality === "anp-confirmed" || item.local?.dataOrigin === "ANP";
      const mappedMatches = !mappedOnly || Boolean(item.local?.mapData);
      const priceMatches = !priceOnly || (pricesByCnpj.get(item.key)?.length ?? 0) > 0;
      const coords = getDirectoryCoordinates(item);
      const distanceMatches = distanceFilter === "all" || !userCoords || !coords || haversineKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng) <= distanceFilter;
      return (!normalized || text.includes(normalized)) && neighborhoodMatches && brandMatches && addressMatches && verifiedMatches && mappedMatches && priceMatches && distanceMatches;
    });
    return matches.sort((a, b) => {
      const stationLabel = getDirectoryLabel;
      if (directorySort === "distance" && userCoords) {
        const aCoords = getDirectoryCoordinates(a);
        const bCoords = getDirectoryCoordinates(b);
        const aDistance = aCoords ? haversineKm(userCoords.lat, userCoords.lng, aCoords.lat, aCoords.lng) : Number.POSITIVE_INFINITY;
        const bDistance = bCoords ? haversineKm(userCoords.lat, userCoords.lng, bCoords.lat, bCoords.lng) : Number.POSITIVE_INFINITY;
        return aDistance - bDistance || stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      if (directorySort === "price") {
        const aPrice = getDirectoryGasolinePrice(a, pricesByCnpj) ?? Number.POSITIVE_INFINITY;
        const bPrice = getDirectoryGasolinePrice(b, pricesByCnpj) ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice || stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      if (directorySort === "brand") {
        return (a.anp?.distribuidora || a.local?.brand || "Sem bandeira").localeCompare(b.anp?.distribuidora || b.local?.brand || "Sem bandeira", "pt-BR") ||
          stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      return stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
    });
  }, [directoryCards, directorySearch, directorySort, userCoords, pricesByCnpj, neighborhoodFilter, brandFilter, addressOnly, verifiedOnly, mappedOnly, priceOnly, distanceFilter]);

  const directoryCardsForDisplay = useMemo(
    () => directoryCardsFiltered.filter(item => matchesFuelFilter(item, fuelFilter, pricesByCnpj)),
    [directoryCardsFiltered, fuelFilter, pricesByCnpj],
  );

  const fuelOptions = useMemo<Array<{ id: FuelFilter; label: string }>>(
    () => [
      { id: "all", label: "Todos" },
      { id: "gasolina-comum", label: "Gasolina" },
      { id: "etanol", label: "Etanol" },
      { id: "diesel-s10", label: "Diesel S10" },
      { id: "diesel-s500", label: "Diesel S500" },
      { id: "glp-p13", label: "GLP P13" },
      { id: "gnv", label: "GNV" },
    ],
    [],
  );
  const directoryFilterCount = Number(neighborhoodFilter !== "all") + Number(brandFilter !== "all") + Number(addressOnly) + Number(verifiedOnly) + Number(mappedOnly) + Number(priceOnly) + Number(fuelFilter !== "all") + Number(distanceFilter !== "all");

  const toggleDirectorySaved = (local: typeof aguasLindasCatalog[number] | null, anp: typeof anpStations[number] | null) => {
    const lat = anp?.latitude ?? local?.anp?.latitude;
    const lng = anp?.longitude ?? local?.anp?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.message("Este cadastro ainda não possui coordenada consolidada para o atalho local.");
      return;
    }
    const station = {
      placeId: "aguas-lindas:" + (anp?.cnpj || local?.cnpj),
      name: local?.displayName || anp?.razaoSocial || "Posto",
      address: [
        anp?.endereco || local?.address,
        anp?.bairro || local?.neighborhood,
        anp?.municipio || "Águas Lindas de Goiás",
        anp?.uf || "GO",
      ].filter(Boolean).join(", "),
      lat: Number(lat),
      lng: Number(lng),
      phone: local?.mapData?.phone ?? null,
      website: null,
      openingHours: local?.mapData?.hours ? [local.mapData.hours] : [],
      isOpen: local?.mapData?.operationalStatus === "open" ? true : local?.mapData?.operationalStatus === "closed" ? false : null,
    } satisfies MobileStation;
    const result = toggleMobileStationFavorite(station);
    setSaved(result.stations);
    vibration();
    toast.message(result.saved ? "Posto salvo neste aparelho." : "Posto removido dos salvos.");
  };


  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    hasCoordinates ? { query, lat, lng, limit: economyMode ? 8 : 20 } : { query, limit: economyMode ? 8 : 20 },
    {
      enabled: query.trim().length >= 3 && !showSavedOnly && !staticRuntime,
      retry: 1,
      getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    },
  );

  const liveStations = useMemo(() => {
    const seen = new Set<string>();
    const all = stationPages.data?.pages.flatMap(page => page.stations) ?? [];
    return all.filter(station => !seen.has(station.placeId) && (seen.add(station.placeId), true));
  }, [stationPages.data]);

  const mapStations = useMemo<StationMapItem[]>(() => {
    const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
    const official: StationMapItem[] = anpStations
      .filter(station => Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
      .map(station => ({
        id: "anp-" + station.cnpj,
        name: station.razaoSocial || "Posto " + station.cnpj,
        address: [station.endereco, station.bairro, station.municipio, station.uf].filter(Boolean).join(" · "),
        lat: station.latitude as number,
        lng: station.longitude as number,
        cnpj: station.cnpj,
        brand: station.distribuidora,
        source: "ANP" as const,
      }));

    const local: StationMapItem[] = aguasLindasCatalog.map(station => ({
      id: "local-" + station.cnpj,
      name: station.displayName || station.legalName,
      address: [station.address, station.neighborhood, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(" · "),
      ...(Number.isFinite(station.anp?.latitude) && Number.isFinite(station.anp?.longitude)
        ? { lat: Number(station.anp?.latitude), lng: Number(station.anp?.longitude) }
        : {}),
      cnpj: station.cnpj,
      brand: station.brand || station.mapData?.observedBrand,
      source: "local" as const,
    }));

    const directory: StationMapItem[] = directoryCards.map(item => ({
      id: "directory-" + item.key,
      name: item.local?.displayName || item.anp?.razaoSocial || "Posto",
      address: [
        item.anp?.endereco || item.local?.address,
        item.anp?.complemento,
        item.anp?.bairro || item.local?.neighborhood,
        item.anp?.municipio || "Águas Lindas de Goiás",
        item.anp?.uf || "GO",
      ].filter(Boolean).join(" · "),
      ...(Number.isFinite(item.anp?.latitude) && Number.isFinite(item.anp?.longitude)
        ? { lat: Number(item.anp?.latitude), lng: Number(item.anp?.longitude) }
        : Number.isFinite(item.local?.anp?.latitude) && Number.isFinite(item.local?.anp?.longitude)
          ? { lat: Number(item.local?.anp?.latitude), lng: Number(item.local?.anp?.longitude) }
          : {}),
      cnpj: item.anp?.cnpj || item.local?.cnpj || null,
      brand: item.anp?.distribuidora || item.local?.brand || item.local?.mapData?.observedBrand || null,
      source: "local" as const,
    }));

    const seen = new Set<string>();
    const merged: StationMapItem[] = [];
    for (const station of [...official, ...local, ...directory, ...offlineMap]) {
      const key = station.cnpj
        ? "cnpj:" + station.cnpj
        : station.placeId
          ? "place:" + station.placeId
          : "address:" + normalize(station.address || station.name);
      const coordinateKey = typeof station.lat === "number" && typeof station.lng === "number"
        ? "coord:" + station.lat.toFixed(5) + "," + station.lng.toFixed(5)
        : null;
      if (seen.has(key) || (coordinateKey && seen.has(coordinateKey))) continue;
      seen.add(key);
      if (coordinateKey) seen.add(coordinateKey);
      merged.push(station);
    }
    return merged;
  }, [anpStations, aguasLindasCatalog, directoryCards, offlineMap]);
  const anpWithCoordinates = anpStations.filter(station => Number.isFinite(station.latitude) && Number.isFinite(station.longitude)).length;
  const anpWithoutCoordinates = Math.max(0, anpStations.length - anpWithCoordinates);
  const mapOfficialCount = mapStations.filter(station => station.source === "ANP").length;
  const mapSecondaryCount = mapStations.filter(station => station.source !== "ANP").length;
  const offlineMapAge = getOfflineMapAgeLabel(getOfflineMapStations().savedAt);
  const stations = showSavedOnly ? saved : liveStations;
  const visibleStations = onlyOpen ? stations.filter(station => station.isOpen === true) : stations;
  const compared = visibleStations.filter(station => compareIds.includes(station.placeId));
  const openVisibleCount = visibleStations.filter(station => station.isOpen === true).length;
  const withDistanceCount = visibleStations.filter(station => station.distanceMeters != null).length;
  const recentSearches = getRecentSearches();

  const searchedAt = stationPages.data?.pages[0]?.queriedAt
    ? new Date(stationPages.data.pages[0].queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;

  useEffect(() => {
    if (!broadAguasLindasQuery || showSavedOnly) return;
    const controller = new AbortController();
    void loadAguasLindasAnpPrices(controller.signal).then(snapshot => {
      if (snapshot) setPriceSnapshot(snapshot);
    });
    return () => controller.abort();
  }, [broadAguasLindasQuery, showSavedOnly]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([hydrateOfflineAnpSnapshot(), hydrateOfflineMapStations()]).then(([anpSnapshot, mapSnapshot]) => {
      if (cancelled) return;
      if (anpSnapshot.rows.length && staticAnpRows.length === 0) {
        setStaticAnpRows(anpSnapshot.rows);
        setStaticAnpRetrievedAt(anpSnapshot.retrievedAt);
      }
      if (mapSnapshot.stations.length && offlineMap.length === 0) setOfflineMap(mapSnapshot.stations);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!staticRuntime || !broadAguasLindasQuery || showSavedOnly) return;
    let cancelled = false;
    fetch(appUrl("/data/aguas-lindas-anp.json"), { cache: "default" })
      .then(response => response.ok ? response.json() as Promise<{ data?: unknown[]; retrievedAt?: string }> : Promise.reject(new Error("snapshot unavailable")))
      .then(payload => {
        if (cancelled) return;
        const rows = (payload.data ?? []).map(item => item && typeof item === "object" ? normalizeAnpFuelRow(item as Record<string, unknown>) : null).filter((row): row is AnpFuelRow => Boolean(row));
        setStaticAnpRows(rows);
        setStaticAnpRetrievedAt(typeof payload.retrievedAt === "string" ? payload.retrievedAt : null);
        cacheOfflineAnpSnapshot(rows, typeof payload.retrievedAt === "string" ? payload.retrievedAt : null);
      })
      .catch(() => {
        // Mantém o snapshot/cache local já carregado quando a rede falha.
      });
    return () => { cancelled = true; };
  }, [staticRuntime, broadAguasLindasQuery, showSavedOnly]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onPreferencesChange = () => setEconomyMode(getEconomyMode());
    const refreshSaved = () => setSaved(listMobileStationFavorites());
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(mobilePreferenceEvent, onPreferencesChange);
    window.addEventListener("focus", refreshSaved);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(mobilePreferenceEvent, onPreferencesChange);
      window.removeEventListener("focus", refreshSaved);
    };
  }, []);

  useEffect(() => {
    if (!hasCoordinates) return;
    setUserCoords(current => current && current.lat === lat && current.lng === lng ? current : { lat, lng });
  }, [hasCoordinates, lat, lng]);

  useEffect(() => {
    if (anpRows.length > 0) {
      const retrievedAt = staticAnpRetrievedAt ?? anpLiveQuery.data?.retrievedAt ?? null;
      cacheOfflineAnpSnapshot(anpRows, retrievedAt);
    }
  }, [anpRows, staticAnpRetrievedAt, anpLiveQuery.data?.retrievedAt]);

  useEffect(() => {
    const mapped = mapStations.filter((station): station is StationMapItem & { id: string; lat: number; lng: number } => typeof station.id === "string" && typeof station.lat === "number" && Number.isFinite(station.lat) && typeof station.lng === "number" && Number.isFinite(station.lng));
    if (mapped.length) cacheOfflineMapStations(mapped);
  }, [mapStations]);




  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#posto-")) return;
    const target = decodeURIComponent(hash.slice("#posto-".length));
    if (!target) return;
    const timer = window.setTimeout(() => {
      document.getElementById("posto-" + encodeURIComponent(target))?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [directoryCards.length, directorySearch, location]);

  useEffect(() => {
    setDirectoryVisibleCount(48);
  }, [
    query,
    neighborhoodFilter,
    brandFilter,
    addressOnly,
    verifiedOnly,
    mappedOnly,
    priceOnly,
    directorySearch,
    directorySort,
    fuelFilter,
    distanceFilter,
  ]);

  useEffect(() => {
    document.title = query.trim() ? "Postos em " + query.trim() + " · Trajeto" : "Postos · Trajeto";
  }, [query]);

  const resetDirectoryView = () => {
    setDirectorySearch("");
    setDirectorySort("name");
    setFuelFilter("all");
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
    setPriceOnly(false);
    setDistanceFilter("all");
    setDirectoryVisibleCount(48);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 3) {
      toast.error("Digite uma cidade, bairro, endereço ou nome de posto.");
      return;
    }
    rememberIntent("stations");
    rememberSearch(trimmed);
    vibration();
    setQuery(trimmed);
    setShowMap(isBroadAguasLindasQuery(trimmed));
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
    setPriceOnly(false);
    setDirectorySearch("");
    setDirectorySort("name");
    setFuelFilter("all");
    setDistanceFilter("all");
    setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(trimmed));
  };

  const useNearby = () => {
    if (!navigator.geolocation || locating) {
      toast.message("Este navegador não disponibilizou a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        rememberIntent("nearby");
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserCoords(coords);
        setShowMap(true);
        setNearby(true);
        setOnlyOpen(false);
        setNeighborhoodFilter("all");
        setBrandFilter("all");
        setAddressOnly(false);
        setVerifiedOnly(false);
        setMappedOnly(false);
        setPriceOnly(false);
        setDistanceFilter("all");
        setFuelFilter("all");
        setDirectorySort("distance");
        setFiltersOpen(false);
        vibration(18);
        setQuery("postos");
        setInput("postos próximos");
        setLocation(appUrl("/postos") + "?q=postos&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const handleMapStationSelect = (station: StationMapItem) => {
    const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedAddress = normalize(station.address);
    let targetCnpj = station.cnpj?.trim();

    if (!targetCnpj) {
      const stationName = normalize(station.name);
      const matched = directoryCards.find(item => {
        const itemAddress = normalize([
          item.anp?.endereco || item.local?.address,
          item.anp?.bairro || item.local?.neighborhood,
          item.anp?.municipio || "Águas Lindas de Goiás",
          item.anp?.uf || "GO",
        ].filter(Boolean).join(" · "));
        const itemName = normalize(item.local?.displayName || item.anp?.razaoSocial || "");
        return (normalizedAddress && itemAddress === normalizedAddress) || (stationName && itemName === stationName);
      });
      targetCnpj = matched?.anp?.cnpj || matched?.local?.cnpj || undefined;
    }

    if (!targetCnpj) {
      toast.message("A referência do mapa ainda não possui ficha consolidada.");
      return;
    }

    // Um clique no marcador deve sempre revelar a ficha, mesmo se filtros antigos
    // estiverem escondendo o posto no diretório.
    setDirectorySearch("");
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
    setPriceOnly(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("posto-" + encodeURIComponent(targetCnpj as string))
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const saveMapOffline = () => {
    if (!mapStations.length) {
      toast.message("Ainda não há coordenadas suficientes para salvar o mapa.");
      return;
    }
    const offlineCandidates = mapStations.filter(station => station.source === "ANP" || station.source === "local");
    const normalized = offlineCandidates
      .filter((station): station is StationMapItem & { id: string; lat: number; lng: number } =>
        (typeof station.id === "string" || typeof station.placeId === "string") &&
        typeof station.lat === "number" && Number.isFinite(station.lat) &&
        typeof station.lng === "number" && Number.isFinite(station.lng)
      )
      .map((station, index) => ({ ...station, id: station.id ?? station.placeId ?? "map-" + index }));
    if (!normalized.length) {
      toast.message("Não há coordenadas oficiais ou locais suficientes para um mapa offline confiável.");
      return;
    }
    const saved = cacheOfflineMapStations(normalized);
    if (saved) setOfflineMap(getOfflineMapStations().stations);
    toast.message(saved ? `Mapa oficial/local salvo neste aparelho · ${normalized.length} referências` : "Não foi possível gravar o mapa local.");
  };

  const refreshStationData = async () => {
    try {
      if (staticRuntime) {
        const response = await fetch(appUrl("/data/aguas-lindas-anp.json?refresh=" + Date.now()), { cache: "no-store" });
        if (!response.ok) throw new Error("snapshot indisponível");
        const payload = await response.json() as { data?: unknown[]; retrievedAt?: string };
        const rows = (payload.data ?? [])
          .map(item => item && typeof item === "object" ? normalizeAnpFuelRow(item as Record<string, unknown>) : null)
          .filter((row): row is AnpFuelRow => Boolean(row));
        if (!rows.length) throw new Error("snapshot vazio");
        setStaticAnpRows(rows);
        setStaticAnpRetrievedAt(payload.retrievedAt ?? new Date().toISOString());
        cacheOfflineAnpSnapshot(rows, payload.retrievedAt ?? null);
      } else {
        await anpLiveQuery.refetch();
      }
      toast.message("Dados oficiais atualizados.");
    } catch {
      toast.error("Não foi possível atualizar agora. O último cache continua disponível.");
    }
  };

  const exportAnpCsv = () => {
    if (!anpRows.length) {
      toast.message("Nenhum dado oficial da ANP disponível nesta consulta.");
      return;
    }
    const headers = ["codigoSIMP","autorizacao","dataPublicacao","razaoSocial","cnpj","endereco","complemento","bairro","cep","uf","municipio","distribuidora","dataVinculacao","classe","produto","tancagem","unidadeMedidaTancagem","quantidadeBicos","latitude","longitude","latitudeANP4C","longitudeANP4C","validacao","estimativaAcuraciaM","srid","sistemaReferenciaCoordenadas","dataObtencao","origemInformacao","situacaoConstatada","observacao","statusSIGAF"];
    const rows = anpRows.map(row => [
      row.codigoSimp,row.autorizacao,row.dataPublicacao,row.razaoSocial,row.cnpj,row.endereco,row.complemento,row.bairro,row.cep,row.uf,row.municipio,row.distribuidora,row.dataVinculacao,row.classe,row.produto,row.tancagem,row.unidadeMedidaTancagem,row.quantidadeBicos,row.latitude,row.longitude,row.latitudeAnp4c,row.longitudeAnp4c,row.validacao,row.estimativaAcuraciaM,row.srid,row.sistemaReferenciaCoordenadas,row.dataObtencao,row.origemInformacao,row.situacaoConstatada,row.observacao,row.statusSigaf
    ]);
    const csvValue = (value: unknown) => '"' + (value == null ? "" : String(value)).replace(/"/g, '""') + '"';
    const csv = "\ufeff" + [headers, ...rows].map(row => row.map(csvValue).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trajeto-aguas-lindas-anp-2026.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.message(anpRows.length + " registro(s) ANP exportado(s).");
  };

  const toggleSaved = (station: typeof stations[number]) => {
    const result = toggleMobileStationFavorite(station as unknown as MobileStation);
    setSaved(result.stations);
    vibration();
    toast.message(result.saved ? "Posto salvo neste aparelho." : "Posto removido dos salvos.");
  };

  const toggleCompare = (placeId: string) => {
    setCompareIds(current =>
      current.includes(placeId)
        ? current.filter(id => id !== placeId)
        : current.length < 3
          ? [...current, placeId]
          : current,
    );
    vibration();
  };

  const navigateTo = (station: typeof stations[number]) => {
    const provider = getPreferredNavigationProvider();
    if (typeof station.lat === "number" && typeof station.lng === "number") {
      const urls = openNavigation(station.lat, station.lng, station.name);
      const url = provider === "waze" ? urls.waze : provider === "apple" ? urls.apple : urls.google;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(buildGoogleMapsSearchUrl([station.name, station.address].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer");
  };

  const shareCurrent = async () => {
    try {
      const url = window.location.origin + appUrl("/postos") + "?q=" + encodeURIComponent(query);
      await shareText("Postos em " + query + " · consulta do Trajeto", url, "Trajeto · postos");
    } catch {}
  };

  const openSaved = () => {
    rememberIntent("saved");
    setLocation(appUrl("/postos") + "?salvos=1");
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_15%_0%,rgba(61,227,255,.08),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(199,255,60,.06),transparent_24%),#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.52rem] font-black uppercase tracking-[.18em] text-[#3DE3FF]">Encontrar</p>
            <h1 className="mobile-title mt-1 font-display text-[2rem] font-semibold tracking-[-.065em] sm:text-3xl">{showSavedOnly ? "Seus salvos" : "Postos perto de você"}</h1>
          </div>
          <span className={"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[0.5rem] font-black " + (online ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-[#C7FF3C]" : "border-[#FFB86B]/25 bg-[#FFB86B]/[.04] text-[#FFB86B]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form onSubmit={submit}>
              <label className="block text-[0.56rem] font-black uppercase tracking-[.14em] text-white/35" htmlFor="station-search">Cidade, bairro ou posto</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <Search className="size-4 shrink-0 text-[#3DE3FF]" />
                <input id="station-search" value={input} onChange={event => setInput(event.target.value)} autoComplete="street-address" enterKeyHint="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="Ex.: Águas Lindas de Goiás" />
                <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </form>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={useNearby} disabled={locating} className="min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.58rem] font-black text-[#0B1014] disabled:opacity-40">
                <Navigation className="mr-1 inline size-3.5" /> {locating ? "GPS…" : "Perto"}
              </button>
              <button type="button" onClick={() => {
                setShowMap(true);
                if (broadAguasLindasQuery) {
                  const technical = document.getElementById("anp-directory") as HTMLDetailsElement | null;
                  if (technical) technical.open = true;
                }
                requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(broadAguasLindasQuery ? "aguas-lindas-map" : "station-results-map")?.scrollIntoView({ behavior: "smooth", block: "start" })));
              }} className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 text-[0.58rem] font-black text-[#C9F7FF]">
                <MapIcon className="mr-1 inline size-3.5" /> Mapa
              </button>
              <button type="button" onClick={openSaved} className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-[0.58rem] font-black text-white/65">
                <Heart className="mr-1 inline size-3.5" /> Salvos {saved.length || ""}
              </button>
            </div>
            <div className="mobile-scroll-x mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {!staticRuntime && (
                <button type="button" onClick={() => setOnlyOpen(current => !current)} className={onlyOpen ? "min-h-9 shrink-0 rounded-full bg-[#3DE3FF] px-3 text-[0.52rem] font-black text-[#0B1014]" : "min-h-9 shrink-0 rounded-full border border-white/8 bg-white/[.025] px-3 text-[0.52rem] font-bold text-white/55"}>
                  <CircleCheck className="mr-1 inline size-3" /> {onlyOpen ? "Abertos" : "Abertos agora"}
                </button>
              )}
              {broadAguasLindasQuery && (
                <button type="button" onClick={() => { setDirectorySort("price"); setFuelFilter("gasolina-comum"); if (priceFilterAvailable) setPriceOnly(true); requestAnimationFrame(() => document.getElementById("complete-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className="min-h-9 shrink-0 rounded-full border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.05] px-3 text-[0.52rem] font-black text-[#D9FF91]">
                  <Fuel className="mr-1 inline size-3" /> Menor preço
                </button>
              )}
              <button type="button" onClick={saveMapOffline} disabled={!mapStations.length} className="min-h-9 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.52rem] font-bold text-white/50 disabled:opacity-30">
                <WifiOff className="mr-1 inline size-3" /> Guardar offline
              </button>
              <button type="button" onClick={() => void shareCurrent()} className="min-h-9 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.52rem] font-bold text-white/50"><Share2 className="mr-1 inline size-3" /> Enviar
              </button>
            </div>

            {recentSearches.length > 0 && (
              <div className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1">
                {recentSearches.slice(0, 4).map(item => (
                  <button key={item} type="button" onClick={() => {
                  setInput(item);
                  setQuery(item);
                  setOnlyOpen(false);
                  setNeighborhoodFilter("all");
                  setBrandFilter("all");
                  setAddressOnly(false);
                  setVerifiedOnly(false);
                  setMappedOnly(false);
                  setPriceOnly(false);
                  setFuelFilter("all");
                  setDistanceFilter("all");
                  setDirectorySort("name");
                  setShowMap(isBroadAguasLindasQuery(item));
                  setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(item));
                }} className="max-w-[12rem] shrink-0 truncate rounded-full border border-white/8 px-3 py-2 text-[0.57rem] font-bold text-white/40">{item}</button>
                ))}
              </div>
            )}
          </section>
        )}

        {!showSavedOnly && broadAguasLindasQuery && (
          <details id="anp-directory" className="mt-4 rounded-[1.35rem] border border-[#3DE3FF]/15 bg-[#0F171D] overflow-hidden">
            <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Fonte oficial</p>
                  <h2 className="mt-1 text-base font-black tracking-[-.02em]">Dados técnicos da ANP</h2>
                  <p className="mt-1 text-[0.56rem] leading-relaxed text-white/35">Cadastro, coordenadas, produtos e exportação. Fica recolhido para não competir com a decisão no celular.</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 py-1 text-[0.46rem] font-black text-[#9FEFFF]">{anpStations.length || "—"} postos</span>
              </div>
            </summary>
            <div className="border-t border-white/8 p-3 sm:p-5">

            {anpLiveQuery.isLoading && !staticRuntime && <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-xs text-white/45">Consultando a base oficial da ANP…</div>}
            {anpLiveQuery.isError && !staticRuntime && <div className="mt-4 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-4 text-xs leading-relaxed text-white/50">A consulta ao serviço da ANP falhou nesta tentativa. A base local continua disponível. <button type="button" onClick={() => void anpLiveQuery.refetch()} className="mt-2 min-h-10 rounded-xl border border-[#FFB86B]/20 px-3 font-black text-[#FFD09A]">Tentar novamente</button></div>}
            {staticRuntime && !anpRows.length && <div className="mt-4 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-4 text-xs leading-relaxed text-white/50">O snapshot oficial ainda não chegou ao GitHub Pages. A sincronização automática da ANP foi configurada e a base local continua disponível enquanto isso.</div>}

            {anpRows.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.03] p-3">
                  <div className="min-w-0">
                    <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#C7FF3C]">Mapa de Águas Lindas</p>
                    <p className="mt-1 text-[0.62rem] leading-relaxed text-white/50">{anpWithCoordinates} de {anpStations.length} postos da ANP possuem coordenadas{anpWithoutCoordinates > 0 ? ` · ${anpWithoutCoordinates} sem coordenadas oficiais nesta resposta` : ""}. {mapSecondaryCount > 0 ? mapSecondaryCount + " referências secundárias também foram agregadas ao mapa." : ""}</p>
                  </div>
                  <button type="button" onClick={() => setShowMap(current => !current)} disabled={mapStations.length === 0} className="min-h-11 shrink-0 rounded-xl bg-[#C7FF3C] px-4 text-[0.6rem] font-black text-[#0B1014] disabled:opacity-40">{showMap ? "Ocultar mapa" : `Ver ${mapStations.length} postos no mapa`}</button>
                </div>

                {showMap && mapStations.length > 0 && (
                  <section id="aguas-lindas-map" className="scroll-mt-24 mt-3 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#0B1014]" aria-label="Mapa de todos os postos de Águas Lindas">
                    <div className="h-[min(68vh,620px)]">
                      <StationMap
                        stations={mapStations}
                        showTraffic={online}
                        nearbyCenter={userCoords}
                        onSelectStation={handleMapStationSelect}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-3 py-2.5 text-[0.52rem] text-white/35">
                      <span>{mapStations.length} marcadores · {mapOfficialCount} ANP + {mapSecondaryCount} referências de mapa</span>
                      <span>{online ? "online · tráfego quando disponível" : "offline · coordenadas salvas no aparelho"}</span>
                      <span>{anpWithoutCoordinates > 0 ? String(anpWithoutCoordinates) + " cadastro(s) ANP sem coordenada · ficha continua disponível" : "cobertura coordenada ANP completa nesta consulta"}</span>
                    </div>
                  </section>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.5rem] font-bold text-white/40">
                    <span><strong className="text-white/70">{anpRows.length}</strong> linhas ANP</span>
                    <span><strong className="text-white/70">{anpStations.length}</strong> postos consolidados</span>
                    <span><strong className="text-white/70">{anpWithCoordinates}</strong> com coordenada</span>
                  </div>
                  <button
                    type="button"
                    onClick={exportAnpCsv}
                    className="min-h-9 shrink-0 rounded-lg border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-[0.5rem] font-black text-[#9FEFFF]"
                  >
                    Exportar CSV
                  </button>
                </div>

                <details className="mt-3 rounded-[1.15rem] border border-white/8 bg-[#0B1014]">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[0.58rem] font-black text-white/65">
                    <span>Ver registros técnicos da ANP</span>
                    <span className="text-[0.46rem] font-bold text-white/30">{Math.min(12, anpStations.length)} fichas · campos completos</span>
                  </summary>
                  <div className="space-y-2 border-t border-white/8 p-2.5">
                  {anpStations.slice(0, 12).map(station => (
                    <details key={station.cnpj} className="rounded-[1.15rem] border border-white/8 bg-[#0B1014]">
                      <summary className="cursor-pointer list-none px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white">{station.razaoSocial ?? "Razão social não informada"}</p>
                            <p className="mt-1 text-[0.56rem] text-white/35">CNPJ {station.cnpj} · Autorização {station.autorizacao ?? "não informada"}</p>
                            <p className="mt-1 text-[0.58rem] leading-relaxed text-white/45">{station.endereco ?? "Endereço não informado"}{station.bairro ? " · " + station.bairro : ""}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-[0.46rem] font-black text-white/40">{station.products.length} produto(s)</span>
                        </div>
                      </summary>
                      <div className="space-y-2 border-t border-white/8 px-3.5 py-3 text-[0.55rem] leading-relaxed text-white/45">
                        <p><strong className="text-white/65">Código SIMP:</strong> {station.codigoSimp ?? "não informado"} · <strong className="text-white/65">CEP:</strong> {station.cep ?? "não informado"} · <strong className="text-white/65">Município/UF:</strong> {station.municipio ?? "—"}/{station.uf ?? "—"}</p>
                        <p><strong className="text-white/65">Distribuidora/bandeira:</strong> {station.distribuidora ?? "bandeira branca/não informada"} · <strong className="text-white/65">Vinculação:</strong> {station.dataVinculacao ?? "não informada"}</p>
                        <p><strong className="text-white/65">Publicação:</strong> {station.dataPublicacao ?? "não informada"} · <strong className="text-white/65">Classe:</strong> {station.products.map(item => item.classe).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).join(" · ") || "não informada"}</p>
                        <p><strong className="text-white/65">Situação:</strong> {station.situacaoConstatada ?? "não informada"} · <strong className="text-white/65">SIGAF:</strong> {station.statusSigaf || "sem ocorrência informada"} </p>
                        <p><strong className="text-white/65">Origem:</strong> {station.origemInformacao ?? "não informada"} · <strong className="text-white/65">Obtido em:</strong> {station.dataObtencao ?? "não informado"}</p>
                        <div className="rounded-xl border border-white/8 bg-white/[.02] p-3">
                          <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-[#87DFF0]">Produtos, tancagem e bicos</p>
                          {station.products.map((item, index) => <p key={item.produto + "-" + index} className="mt-1">{item.produto ?? "Produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem ?? ""} · bicos {item.quantidadeBicos ?? "—"}{item.classe ? " · " + item.classe : ""}</p>)}
                        </div>
                        <p><strong className="text-white/65">Geografia:</strong> {station.latitude != null && station.longitude != null ? station.latitude.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) + ", " + station.longitude.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) : "sem coordenadas"}{station.validacao ? " · validação: " + station.validacao : ""}{station.estimativaAcuraciaM != null ? " · acurácia: " + station.estimativaAcuraciaM.toLocaleString("pt-BR") + " m" : ""}</p>
                        {station.latitude != null && station.longitude != null && <button type="button" onClick={() => window.open("https://www.google.com/maps/dir/?api=1&destination=" + station.latitude + "," + station.longitude, "_blank", "noopener,noreferrer")} className="min-h-10 rounded-xl border border-[#C7FF3C]/20 px-3 text-[0.58rem] font-black text-[#D9FF91]">Abrir coordenadas no Google Maps</button>}
                        {station.observacao && <p><strong className="text-white/65">Observação:</strong> {station.observacao}</p>}
                      </div>
                    </details>
                  ))}
                  </div>
                  {anpStations.length > 12 && <p className="px-2.5 pb-2 text-center text-[0.55rem] text-white/25">Mostrando os primeiros 12. O CSV contém todas as linhas retornadas pela ANP.</p>}
                </details>
              </>
            )}

            {!anpRows.length && mapStations.length > 0 && (
              <section id="aguas-lindas-map-offline" className="scroll-mt-24 mt-4 overflow-hidden rounded-[1.35rem] border border-[#FFB86B]/20 bg-[#0B1014]" aria-label="Mapa offline de referências dos postos">
                <div className="border-b border-white/8 px-3.5 py-3">
                  <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-[#FFCF96]">Mapa salvo no aparelho</p>
                  <p className="mt-1 text-[0.6rem] leading-relaxed text-white/45">A ANP não respondeu nesta sessão. As coordenadas de consultas anteriores continuam disponíveis e navegáveis sem conexão.</p>
                </div>
                <div className="h-[min(68vh,620px)]">
                  <StationMap stations={mapStations} showTraffic={false} nearbyCenter={userCoords} />
                </div>
                <div className="border-t border-white/8 px-3 py-2.5 text-[0.52rem] text-white/35">{mapStations.length} referências armazenadas · {offlineMapAge}.</div>
              </section>
            )}

            <p className="mt-3 text-[0.5rem] leading-relaxed text-white/25">Fonte: API de Revendedores da ANP. Cache de mapa: {offlineMapAge}. Última consulta oficial: {(anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) ? new Date((anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) as string).toLocaleString("pt-BR") : "ainda não registrada"}.</p>
            </div>
          </details>
        )}

        {broadAguasLindasQuery && !showSavedOnly && (
          <section id="complete-stations" className="scroll-mt-24 mt-5 rounded-[1.6rem] border border-[#C7FF3C]/20 bg-[#111A21] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="complete-stations-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Diretório completo</p>
                <h2 id="complete-stations-title" className="mt-1 text-xl font-black">Cada posto, uma ficha completa</h2>
                <p className="mt-2 text-[0.65rem] leading-relaxed text-white/45">
                  {directoryCards.length} fichas consolidadas por CNPJ. O catálogo separa {anpStations.length} registros ANP de referências secundárias, sem transformar descoberta de mapa em autorização ANP. Cada ficha tem rota para Google Maps, Waze e Apple Maps.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-[0.5rem] font-black text-[#D9FF91]">{directoryCards.length} fichas</span>
                <p className="mt-1 text-[0.45rem] font-bold text-white/25">{anpStations.length} registros ANP</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/8 bg-[#0B1014] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-white/30">Referência municipal de preços</p>
                  <p className="mt-1 text-[0.56rem] text-white/45">{AGUAS_LINDAS_PRICE_REFERENCE.period} · ANP · não é preço individual em tempo real</p>
                </div>
                <button type="button" onClick={() => void refreshStationData()} className="min-h-9 rounded-lg border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.03] px-2.5 text-[0.48rem] font-black text-[#9FEFFF]">Atualizar dados</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[0.52rem] text-white/45 sm:grid-cols-3">
                <span>Gasolina <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gasolineCommon.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Etanol <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.ethanol.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S10 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS10.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S500 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS500.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>GLP P13 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.glpP13.average.toFixed(2).replace(".", ",")}</strong></span>
                <span>GNV <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gnv.average.toFixed(2).replace(".", ",")}/m³</strong></span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/8 bg-[#0B1014] px-3 py-2.5 text-[0.5rem] font-bold text-white/40">
              <span><strong className="text-white/75">{directoryCards.length}</strong> fichas</span>
              <span><strong className="text-[#3DE3FF]">{directoryCards.filter(item => Boolean(item.anp)).length}</strong> conciliadas com ANP</span>
              <span><strong className="text-[#D9FF91]">{directoryConfidenceCount}</strong> com confiança ≥70%</span>
              {userCoords && <span><strong className="text-white/75">GPS</strong> ativo só nesta sessão</span>}
            </div>

            <div className="mt-3">
              <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <Search className="size-4 text-white/25" />
                <input value={directorySearch} onChange={event => setDirectorySearch(event.target.value)} placeholder="Buscar posto, bairro, CNPJ ou bandeira" className="min-w-0 flex-1 bg-transparent text-[0.62rem] text-white outline-none placeholder:text-white/25" aria-label="Filtrar diretório de postos" />
                {directorySearch && <button type="button" onClick={() => setDirectorySearch("")} className="grid size-7 place-items-center rounded-lg text-white/30" aria-label="Limpar busca"><X className="size-3.5" /></button>}
                {(directorySearch || fuelFilter !== "all" || directorySort !== "name" || directoryFilterCount > 0) && (
                  <button type="button" onClick={resetDirectoryView} className="shrink-0 rounded-lg px-2 py-1 text-[0.48rem] font-black text-[#D9FF91]">Limpar</button>
                )}
              </label>
              <div className="flex items-center gap-2">
                <div className="mobile-scroll-x flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Ordenar diretório">
                  {[
                    { id: "name" as const, label: "Nome" },
                    { id: "price" as const, label: "Menor preço" },
                    { id: "brand" as const, label: "Bandeira" },
                    { id: "distance" as const, label: "Mais perto", disabled: !userCoords },
                  ].map(option => {
                    const active = directorySort === option.id;
                    return <button key={option.id} type="button" disabled={option.disabled} aria-pressed={active} onClick={() => setDirectorySort(option.id)} className={"min-h-10 shrink-0 rounded-full border px-3 text-[0.55rem] font-black disabled:cursor-not-allowed disabled:opacity-30 " + (active ? "border-[#C7FF3C]/25 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/8 bg-white/[.025] text-white/50")}>{option.label}</button>;
                  })}
                </div>
                <button type="button" onClick={() => setFiltersOpen(true)} className={"min-h-10 shrink-0 rounded-full border px-3 text-[0.55rem] font-black " + (directoryFilterCount ? "border-[#3DE3FF]/25 bg-[#3DE3FF]/10 text-[#C9F7FF]" : "border-white/8 bg-white/[.025] text-white/55")}>
                  <SlidersHorizontal className="mr-1 inline size-3.5" /> Filtros{directoryFilterCount ? " " + directoryFilterCount : ""}
                </button>
              </div>
            </div>
            {(fuelFilter !== "all" || directoryFilterCount > 0) && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.035] px-3 py-2 text-[0.52rem] font-bold text-[#C9F7FF]" role="status" aria-live="polite">
                <span>
                  {fuelFilter !== "all" ? "Filtro: " + (fuelOptions.find(option => option.id === fuelFilter)?.label || "combustível") : "Filtros ativos"}
                  {" · " + directoryCardsForDisplay.length + " posto(s)"}
                  {priceOnly ? " · preço individual ANP" : ""}
                </span>
                <button type="button" onClick={resetDirectoryView} className="min-h-8 rounded-lg border border-white/10 px-2.5 text-[0.48rem] font-black text-white/70">Limpar</button>
              </div>
            )}

            <div className="sticky top-2 z-20 mt-3 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0B1014]/92 px-2.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,.28)] backdrop-blur-xl">
              <div className="min-w-0 px-1">
                <p className="truncate text-[0.5rem] font-black uppercase tracking-[.12em] text-white/30">Sua lista</p>
                <p className="mt-0.5 text-[0.68rem] font-black text-white">{directoryCardsForDisplay.length} posto(s)</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-1">
                <button type="button" onClick={() => { setShowMap(false); requestAnimationFrame(() => document.getElementById("complete-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={"min-h-9 rounded-xl px-3 text-[0.52rem] font-black " + (!showMap ? "bg-white/10 text-white" : "text-white/45")}>Lista</button>
                <button type="button" onClick={() => {
                  setShowMap(true);
                  const technical = document.getElementById("anp-directory") as HTMLDetailsElement | null;
                  if (technical) technical.open = true;
                  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("aguas-lindas-map")?.scrollIntoView({ behavior: "smooth", block: "start" })));
                }} className={"min-h-9 rounded-xl px-3 text-[0.52rem] font-black " + (showMap ? "bg-[#3DE3FF]/10 text-[#C9F7FF]" : "text-white/45")}>Mapa</button>
              </div>
            </div>
            <StationFiltersSheet
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              fuelOptions={fuelOptions}
              fuelFilter={fuelFilter}
              setFuelFilter={setFuelFilter}
              distanceFilter={distanceFilter}
              setDistanceFilter={setDistanceFilter}
              neighborhoodFilter={neighborhoodFilter}
              setNeighborhoodFilter={setNeighborhoodFilter}
              brandFilter={brandFilter}
              setBrandFilter={setBrandFilter}
              addressOnly={addressOnly}
              setAddressOnly={setAddressOnly}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              mappedOnly={mappedOnly}
              setMappedOnly={setMappedOnly}
              priceOnly={priceOnly}
              setPriceOnly={setPriceOnly}
              neighborhoods={directoryNeighborhoods}
              brands={directoryBrands}
              priceFilterAvailable={priceFilterAvailable}
              directoryPriceCount={directoryPriceCount}
              verifiedFilterAvailable={verifiedFilterAvailable}
              hasUserCoords={Boolean(userCoords)}
              onClear={() => { resetDirectoryView(); setFiltersOpen(false); }}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[0.5rem] text-white/30">
              <span>{directoryCardsForDisplay.length} de {directoryCards.length} fichas · {anpStations.length} ANP</span>
              <span>{userCoords ? "distância local · sem envio do GPS ao catálogo" : "sem exigir localização"}</span>
            </div>

            {directoryCardsForDisplay.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {directoryCardsForDisplay
                  .slice(0, directoryVisibleCount).map((item, index) => (
                <StationDirectoryCard
                  key={item.key}
                  index={index + 1}
                  local={item.local}
                  anp={item.anp}
                  saved={saved.some(savedStation => savedStation.placeId === "aguas-lindas:" + item.key)}
                  prices={pricesByCnpj.get(item.key) ?? []}
                  distanceKm={(() => {
                    if (!userCoords) return null;
                    const lat = Number(item.anp?.latitude ?? item.local?.anp?.latitude);
                    const lng = Number(item.anp?.longitude ?? item.local?.anp?.longitude);
                    return Number.isFinite(lat) && Number.isFinite(lng) ? haversineKm(userCoords.lat, userCoords.lng, lat, lng) : null;
                  })()}
                  onToggleSaved={item.local || item.anp ? () => toggleDirectorySaved(item.local, item.anp) : undefined}
                  />
                ))}
              </div>
            )}

            {directoryCardsForDisplay.length === 0 && (
              <div className="mt-4 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-4 text-center">
                <p className="text-sm font-black text-white">Nenhuma ficha corresponde ao filtro.</p>
                <p className="mt-1 text-[0.6rem] text-white/40">Ajuste a busca ou escolha outro combustível.</p>
                <button type="button" onClick={resetDirectoryView} className="mt-3 min-h-10 rounded-xl border border-[#C7FF3C]/20 px-3 text-[0.58rem] font-black text-[#D9FF91]">Limpar filtros</button>
              </div>
            )}

            {directoryVisibleCount < directoryCardsForDisplay.length && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(current => Math.min(current + 24, directoryCardsForDisplay.length))}
                  className="min-h-12 rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/65 transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar mais {Math.min(24, directoryCardsForDisplay.length - directoryVisibleCount)} postos
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(directoryCardsForDisplay.length)}
                  className="min-h-12 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] text-xs font-black text-[#D9FF91] transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar todos os {directoryCardsForDisplay.length}
                </button>
              </div>
            )}

            {directoryVisibleCount >= directoryCardsForDisplay.length && directoryCardsForDisplay.length > 16 && (
              <button
                type="button"
                onClick={() => setDirectoryVisibleCount(48)}
                className="mt-2 min-h-10 w-full text-[0.6rem] font-bold text-white/30"
              >
                Mostrar apenas os primeiros 48
              </button>
            )}

          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <details className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.57rem] leading-relaxed text-white/35">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[0.55rem] font-black text-white/55">
              <span>Fonte, qualidade e limites dos dados</span>
              <span className="text-[0.46rem] text-white/25">ANP + referências locais</span>
            </summary>
            <div className="mt-2 space-y-1.5">
              <p>O diretório separa cadastro oficial da ANP e referências públicas locais. Um cadastro ativo não confirma funcionamento neste momento, preço atual ou coordenada exata.</p>
              <p>A ANP disponibiliza cadastro de revendedores e dados de endereço, produtos, distribuidor, tancagem, bicos, situação e coordenadas quando disponíveis.</p>
              <p>Preço, horário, bandeira e situação operacional são apresentados somente quando existe fonte e data correspondentes.</p>
            </div>
          </details>
        )}

        {nearby && (
          <section className="mt-3 flex items-start gap-3 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />
            <div><p className="text-xs font-black">Busca por proximidade</p><p className="mt-1 text-[0.58rem] leading-relaxed text-white/40">A localização foi usada para ordenar a consulta; suas coordenadas não são exibidas publicamente pelo Trajeto.</p></div>
          </section>
        )}

        {stationPages.isLoading && !showSavedOnly && (
          <section className="mt-5 grid gap-2" role="status" aria-live="polite">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl border border-white/8 bg-[#121B22]" />)}
          </section>
        )}

        {stationPages.isError && !stations.length && !showSavedOnly && (
          <section className="mt-5 rounded-3xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-5">
            <p className="text-sm font-black">A consulta não respondeu.</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">O objetivo continua disponível no Google Maps enquanto o serviço do Trajeto não responde.</p>
            <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")} className="mt-4 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">Abrir no Google Maps</button>
          </section>
        )}

        {(!staticRuntime && (stations.length > 0 || showSavedOnly)) && (
          <>
            <section className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-white/25">{searchedAt ? "Consulta atual" : "Neste aparelho"}</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">{visibleStations.length} resultado(s)</h2>
                <p className="mt-1 text-[0.56rem] text-white/30">{searchedAt ? "Consultado em " + searchedAt : "Favoritos locais"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.46rem] font-bold text-white/45">{openVisibleCount} abertos</span>
                  <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.46rem] font-bold text-white/45">{withDistanceCount} com distância</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMap(current => !current)} disabled={!visibleStations.length} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-white/60" aria-label={showMap ? "Ocultar mapa" : "Mostrar mapa"}><MapIcon className="size-4" /></button>
                {compareIds.length > 0 && <button type="button" onClick={() => document.getElementById("station-compare")?.scrollIntoView({ behavior: "smooth" })} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.58rem] font-black text-[#0B1014]">{compareIds.length} comparar</button>}
              </div>
            </section>

            {showMap && !broadAguasLindasQuery && visibleStations.length > 0 && (
              <section id="station-results-map" className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-[#121B22]">
                <div className="h-[min(62vh,500px)]"><StationMap stations={visibleStations} nearbyCenter={userCoords} /></div>
              </section>
            )}

            <section className="mt-3 space-y-2" aria-label="Resultados de postos">
              {visibleStations.map((station, index) => {
                const isSaved = saved.some(item => item.placeId === station.placeId);
                const isCompared = compareIds.includes(station.placeId);
                return (
                  <article key={station.placeId} className={"rounded-[1.35rem] border bg-[#121B22] p-4 " + (isCompared ? "border-[#3DE3FF]/50" : "border-white/8")}>
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="truncate text-sm font-black">{station.name}</p><p className="mt-1 truncate text-[0.6rem] text-white/35">{inferredBrand(station.name)} · {station.distanceLabel || "distância indisponível"}</p></div>
                          {station.isOpen === true && <span className="shrink-0 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.48rem] font-black text-[#D9FF91]">aberto</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[0.64rem] leading-relaxed text-white/40">{station.address}</p>
                      </div>
                    </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => navigateTo(station)} className="col-span-2 min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.6rem] font-black text-[#0B1014]"><Navigation className="mr-1 inline size-3.5" />Navegar</button>
                      <button type="button" onClick={() => toggleSaved(station)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isSaved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/[.06] text-[#FFB7A9]" : "border-white/8 text-white/55")} aria-label={isSaved ? "Remover dos salvos" : "Salvar posto"}><Heart className="size-4" fill={isSaved ? "currentColor" : "none"} /></button>
                      <button type="button" onClick={() => toggleCompare(station.placeId)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isCompared ? "border-[#3DE3FF]/40 bg-[#3DE3FF]/[.08] text-[#3DE3FF]" : "border-white/8 text-white/55")} aria-label={isCompared ? "Remover da comparação" : "Comparar posto"}><SlidersHorizontal className="size-4" /></button>
                    </div>
                    {index === 0 && <p className="mt-2 text-center text-[0.5rem] font-bold text-white/20">Ações principais ficam sempre no alcance do polegar.</p>}
                  </article>
                );
              })}
            </section>

            {stationPages.hasNextPage && (
              <button type="button" onClick={() => void stationPages.fetchNextPage()} disabled={stationPages.isFetchingNextPage} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/60 disabled:opacity-40">
                {stationPages.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                {stationPages.isFetchingNextPage ? "Carregando mais postos…" : "Mostrar mais postos"}
              </button>
            )}

            {compared.length > 0 && (
              <StationComparePanel
                stations={compared.map(station => ({
                  ...station,
                  isOpen: station.isOpen ?? null,
                  distanceLabel: station.distanceLabel ?? null,
                  distanceMeters: station.distanceMeters ?? null,
                  phone: station.phone ?? null,
                  anpMatch: station.anpMatch ? {
                    status: station.anpMatch.status,
                    confidence: station.anpMatch.confidence,
                    brand: station.anpMatch.brand,
                  } : undefined,
                }))}
                onClear={() => setCompareIds([])}
              />
            )}

            <section className="mt-4 rounded-3xl border border-white/8 bg-white/[.025] p-4">
              <details>
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Como ler estes dados</span><BadgeInfo className="size-4 text-white/25" /></summary>
                <div className="mt-2 space-y-2 text-[0.6rem] leading-relaxed text-white/35">
                  <p>Endereço, horário, telefone e distância podem depender do provedor de mapas consultado naquele momento.</p>
                  <p>Referências de preço aparecem separadas e nunca são tratadas como preço em tempo real.</p>
                  <p>Um item salvo neste aparelho funciona como atalho local e não precisa de conta.</p>
                </div>
              </details>
            </section>
          </>
        )}

        {!stations.length && !stationPages.isLoading && (
          <section className="mt-5 rounded-3xl border border-white/8 bg-[#121B22] p-5 text-center">
            <Fuel className="mx-auto size-5 text-white/25" />
            <p className="mt-3 text-sm font-black">{showSavedOnly ? "Nenhum posto salvo." : "Pesquise uma região para começar."}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/35">O Trajeto mostra resultados encontrados na consulta atual e separa as referências oficiais quando disponíveis.</p>
          </section>
        )}

        <footer className="mt-10 pb-3 text-center text-[0.55rem] leading-relaxed text-white/25">
          O Trajeto organiza os resultados; a navegação é aberta no provedor escolhido.
        </footer>
      </div>
    </main>
  );
}
