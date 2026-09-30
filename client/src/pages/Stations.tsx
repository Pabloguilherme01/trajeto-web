import { BadgeInfo, ChevronRight, CircleCheck, Fuel, Heart, Loader2, Map as MapIcon, MapPin, Navigation, Search, Share2, ShieldCheck, SlidersHorizontal, Sparkles, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { appUrl } from "@/lib/appUrl";
import { buildGoogleMapsSearchUrl, getPreferredNavigationProvider, openNavigation, setPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import { getCachedStations, cacheStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { corridorPresets } from "@/lib/corridorPresets";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE, AGUAS_LINDAS_ANP_CATALOG_REFERENCE, AGUAS_LINDAS_ANP_VERIFIED_COUNT, AGUAS_LINDAS_MAP_ONLY_DISCOVERIES, AGUAS_LINDAS_PRICE_REFERENCE, AGUAS_LINDAS_STATION_STATS, AGUAS_LINDAS_STATIONS_COUNT, AGUAS_LINDAS_STATIONS_LAST_SYNC, AGUAS_LINDAS_STATIONS_SOURCE, AGUAS_LINDAS_STATIONS_UPDATED_AT, getStationDataQualityLabel, searchAguasLindasStations, stationMapsSearchUrl } from "@/lib/aguasLindasStations";
import { fuelFilterPriceKey, inferredBrand, stationSupportsFuel, type StationFuelFilter } from "@/lib/stationListControls";
import { StationMap, type StationMapItem } from "@/components/StationMap";
import { StationDirectoryCard } from "@/components/StationDirectoryCard";
import { toast } from "sonner";
import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { cacheOfflineAnpSnapshot, cacheOfflineMapStations, getOfflineAnpSnapshot, getOfflineMapAgeLabel, getOfflineMapStations, hydrateOfflineAnpSnapshot, hydrateOfflineMapStations } from "@/lib/stationMapOffline";
import { loadAguasLindasAnpPrices, indexAnpPricesByCnpj } from "@/lib/anpPrices";
import type { AnpPriceSnapshot } from "@/lib/anpPrices";
import { stationCatalogStatusLabel } from "@/lib/stationEntity";

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

export default function Stations({ mapFirst = false }: { mapFirst?: boolean }) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [input, setInput] = useState(getInitialQuery);
  const [query, setQuery] = useState(getInitialQuery);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [nearby, setNearby] = useState(false);
  const [showMap, setShowMap] = useState(mapFirst);
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
  const [localVisibleCount, setLocalVisibleCount] = useState(12);
  const initialOfflineAnp = getOfflineAnpSnapshot();
  const initialOfflineMap = getOfflineMapStations();
  const [staticAnpRows, setStaticAnpRows] = useState<AnpFuelRow[]>(initialOfflineAnp.rows);
  const [staticAnpRetrievedAt, setStaticAnpRetrievedAt] = useState<string | null>(initialOfflineAnp.retrievedAt);
  const [offlineMap, setOfflineMap] = useState<StationMapItem[]>(initialOfflineMap.stations);
  const [priceSnapshot, setPriceSnapshot] = useState<AnpPriceSnapshot | null>(null);
  const [fuelFilter, setFuelFilter] = useState<StationFuelFilter>("all");

  useEffect(() => { if (mapFirst) setShowMap(true); }, [mapFirst]);

  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const lat = latParam === null ? Number.NaN : Number(latParam);
  const lng = lngParam === null ? Number.NaN : Number(lngParam);
  const hasCoordinates = latParam !== null && lngParam !== null &&
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const showSavedOnly = params.get("salvos") === "1";
  const urlQuery = params.get("q")?.trim() || "";
  const staticRuntime = isGitHubPagesRuntime();
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const broadAguasLindasQuery = isBroadAguasLindasQuery(query);
  const anpLiveQuery = trpc.stationDirectory.anp.useQuery(
    { municipio: "AGUASLINDASDEGOIAS", uf: "GO" },
    { enabled: broadAguasLindasQuery && !showSavedOnly && !staticRuntime, retry: 1, staleTime: 10 * 60_000 },
  );
  const liveAnpRows = anpLiveQuery.data?.rows ?? [];
  const anpRows = staticRuntime ? staticAnpRows : liveAnpRows.length > 0 ? liveAnpRows : staticAnpRows;
  const anpStations = useMemo(() => groupAnpFuelRows(anpRows), [anpRows]);
  const pricesByCnpj = useMemo(() => indexAnpPricesByCnpj(priceSnapshot?.data ?? []), [priceSnapshot]);
  const localDirectory = useMemo(() => {
    if (!staticRuntime || showSavedOnly) return [];
    const matches = searchAguasLindasStations(query);
    const filtered = matches.filter(station =>
      (neighborhoodFilter === "all" || station.neighborhood === neighborhoodFilter) &&
      (brandFilter === "all" || (station.brand ?? "Sem bandeira") === brandFilter) &&
      (!addressOnly || Boolean(station.address)) &&
      (!verifiedOnly || station.dataQuality === "anp-confirmed" || station.dataOrigin === "ANP") &&
      (!mappedOnly || Boolean(station.mapData))
    );
    return [...filtered].sort((a, b) =>
      (a.neighborhood ?? "").localeCompare(b.neighborhood ?? "", "pt-BR") ||
      a.displayName.localeCompare(b.displayName, "pt-BR")
    );
  }, [query, showSavedOnly, staticRuntime, neighborhoodFilter, brandFilter, addressOnly, verifiedOnly, mappedOnly]);
  const localBrands = useMemo(() => Array.from(new Set(searchAguasLindasStations("postos").map(station => station.brand ?? "Sem bandeira"))).sort((a,b) => a.localeCompare(b, "pt-BR")), []);
  const localNeighborhoods = useMemo(
    () => Array.from(new Set(searchAguasLindasStations("postos").map(station => station.neighborhood).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    []
  );

  const aguasLindasCatalog = useMemo(() => searchAguasLindasStations("postos"), []);
  const directoryCards = useMemo(() => {
    const localByCnpj = new Map(aguasLindasCatalog.map(station => [station.cnpj, station]));
    const cards: Array<{ key: string; local: typeof aguasLindasCatalog[number] | null; anp: typeof anpStations[number] | null }> = aguasLindasCatalog.map(local => ({
      key: local.cnpj,
      local,
      anp: anpStations.find(station => station.cnpj === local.cnpj) ?? null,
    }));
    for (const anp of anpStations) {
      if (localByCnpj.has(anp.cnpj)) continue;
      cards.push({ key: anp.cnpj, local: null, anp });
    }
    return cards;
  }, [aguasLindasCatalog, anpStations]);

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
      const matchesFuel = stationSupportsFuel(
        pricesByCnpj.get(item.key)?.map(price => price.productKey) ?? [],
        item.anp?.products?.map(product => product.produto || "") ?? [],
        fuelFilter,
      );
      return (!normalized || text.includes(normalized)) && matchesFuel;
    });

    return [...matches].sort((a, b) => {
      const stationLabel = (item: typeof directoryCards[number]) => item.local?.displayName || item.anp?.razaoSocial || "";
      if (directorySort === "distance" && userCoords) {
        const getCoords = (item: typeof directoryCards[number]) => {
          const lat = Number(item.anp?.latitude ?? item.local?.anp?.latitude);
          const lng = Number(item.anp?.longitude ?? item.local?.anp?.longitude);
          return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
        };
        const aCoords = getCoords(a);
        const bCoords = getCoords(b);
        const aDistance = aCoords ? haversineKm(userCoords.lat, userCoords.lng, aCoords.lat, aCoords.lng) : Number.POSITIVE_INFINITY;
        const bDistance = bCoords ? haversineKm(userCoords.lat, userCoords.lng, bCoords.lat, bCoords.lng) : Number.POSITIVE_INFINITY;
        return aDistance - bDistance || stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      if (directorySort === "price") {
        const productKey = fuelFilterPriceKey(fuelFilter);
        const aPrice = pricesByCnpj.get(a.key)?.find(price => price.productKey === productKey)?.salePrice ?? Number.POSITIVE_INFINITY;
        const bPrice = pricesByCnpj.get(b.key)?.find(price => price.productKey === productKey)?.salePrice ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice || stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      if (directorySort === "brand") {
        return (a.anp?.distribuidora || a.local?.brand || "Sem bandeira").localeCompare(b.anp?.distribuidora || b.local?.brand || "Sem bandeira", "pt-BR") ||
          stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
      }
      return stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
    });
  }, [directoryCards, directorySearch, directorySort, userCoords, fuelFilter, pricesByCnpj]);

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


  const visibleLocalDirectory = localDirectory.slice(0, localVisibleCount);
  const hasMoreLocalStations = visibleLocalDirectory.length < localDirectory.length;

  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    hasCoordinates ? { query, lat, lng } : { query },
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

    const live: StationMapItem[] = liveStations
      .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map(item => ({
        id: item.placeId,
        placeId: item.placeId,
        name: item.name,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        cnpj: null,
        brand: null,
        source: "Google" as const,
      }));

    const seen = new Set<string>();
    const merged: StationMapItem[] = [];
    for (const station of [...official, ...local, ...directory, ...live, ...offlineMap]) {
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
  }, [anpStations, aguasLindasCatalog, directoryCards, liveStations, offlineMap]);
  const anpWithCoordinates = anpStations.filter(station => Number.isFinite(station.latitude) && Number.isFinite(station.longitude)).length;
  const anpWithoutCoordinates = Math.max(0, anpStations.length - anpWithCoordinates);
  const mapOfficialCount = mapStations.filter(station => station.source === "ANP").length;
  const mapSecondaryCount = mapStations.filter(station => station.source !== "ANP").length;
  const offlineMapAge = getOfflineMapAgeLabel(getOfflineMapStations().savedAt);
  const cachedSnapshot = getCachedStations(query, hasCoordinates ? lat : undefined, hasCoordinates ? lng : undefined);
  const stations = showSavedOnly ? saved : liveStations.length > 0 ? liveStations : cachedSnapshot?.stations ?? [];
  const visibleStations = onlyOpen ? stations.filter(station => station.isOpen === true) : stations;
  const compared = visibleStations.filter(station => compareIds.includes(station.placeId));
  const recentSearches = getRecentSearches();
  const activeLocalFilterCount = Number(neighborhoodFilter !== "all") + Number(brandFilter !== "all") + Number(addressOnly) + Number(verifiedOnly) + Number(mappedOnly);

  const searchedAt = stationPages.data?.pages[0]?.queriedAt
    ? new Date(stationPages.data.pages[0].queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const cachedAt = cachedSnapshot?.savedAt
    ? new Date(cachedSnapshot.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const usingCache = !online && liveStations.length === 0 && stations.length > 0;

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
    const refreshSaved = () => setSaved(listMobileStationFavorites());
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", refreshSaved);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", refreshSaved);
    };
  }, []);

  useEffect(() => {
    if (liveStations.length > 0) {
      cacheStations(query, liveStations as unknown as MobileStation[], hasCoordinates ? lat : undefined, hasCoordinates ? lng : undefined);
    }
  }, [liveStations, query, hasCoordinates, lat, lng]);

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
    if (showSavedOnly || !urlQuery || urlQuery === query) return;
    setQuery(urlQuery);
    setInput(urlQuery);
    setShowMap(false);
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
  }, [urlQuery, showSavedOnly, query]);

  useEffect(() => {
    if (hasCoordinates) {
      setUserCoords({ lat, lng });
      setNearby(true);
      return;
    }
    setUserCoords(null);
    setNearby(false);
  }, [hasCoordinates, lat, lng]);

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
    setLocalVisibleCount(12);
    setDirectoryVisibleCount(48);
  }, [query, neighborhoodFilter, brandFilter, addressOnly, verifiedOnly, mappedOnly]);

  useEffect(() => {
    setDirectoryVisibleCount(48);
  }, [directorySearch, directorySort, fuelFilter]);

  useEffect(() => {
    document.title = query.trim() ? "Postos em " + query.trim() + " · Trajeto" : "Postos · Trajeto";
  }, [query]);

  const resetLocalFilters = () => {
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
    setLocalVisibleCount(12);
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
    setShowMap(false);
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
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
        setDirectorySort("distance");
        setShowMap(true);
        setNearby(true);
        setOnlyOpen(false);
        setNeighborhoodFilter("all");
        setBrandFilter("all");
        setAddressOnly(false);
        setVerifiedOnly(false);
        setMappedOnly(false);
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
    const normalized = mapStations
      .filter((station): station is StationMapItem & { id: string; lat: number; lng: number } =>
        (typeof station.id === "string" || typeof station.placeId === "string") &&
        typeof station.lat === "number" && Number.isFinite(station.lat) &&
        typeof station.lng === "number" && Number.isFinite(station.lng)
      )
      .map((station, index) => ({ ...station, id: station.id ?? station.placeId ?? "map-" + index }));
    const saved = cacheOfflineMapStations(normalized);
    if (saved) setOfflineMap(getOfflineMapStations().stations);
    toast.message(saved ? `Mapa salvo neste aparelho · ${mapStations.length} referências` : "Não foi possível gravar o mapa local.");
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

  const copyCnpj = async (cnpj: string) => {
    try {
      await navigator.clipboard.writeText(cnpj);
      vibration();
      toast.message("CNPJ copiado.");
    } catch {
      toast.error("Não foi possível copiar o CNPJ.");
    }
  };

  const copyAddress = async (station: typeof localDirectory[number]) => {
    if (!station.address) {
      toast.message("Este cadastro não possui endereço consolidado.");
      return;
    }
    try {
      await navigator.clipboard.writeText(`${station.address}, ${station.neighborhood ?? ""}, Águas Lindas de Goiás - GO`);
      toast.message("Endereço copiado.");
    } catch {
      toast.error("Não foi possível copiar o endereço.");
    }
  };


  const exportLocalCsv = () => {
    const headers = [
      "id","nome_comercial","razao_social","cnpj","bairro","endereco","bandeira","situacao","aliases",
      "qualidade_dado","origem_dado","observacao_cadastro","telefone_mapa","avaliacao_mapa","avaliacoes_mapa",
      "horario_mapa","bandeira_observada_mapa"
    ];
    const csvValue = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = localDirectory.map(station => [
      station.id,
      station.displayName,
      station.legalName,
      station.cnpj,
      station.neighborhood ?? "",
      station.address ?? "",
      station.brand ?? "",
      station.status,
      station.aliases.join(" | "),
      getStationDataQualityLabel(station),
      station.dataOrigin ?? "",
      station.sourceNote,
      station.mapData?.phone ?? "",
      station.mapData?.rating ?? "",
      station.mapData?.reviewCount ?? "",
      station.mapData?.hours ?? "",
      station.mapData?.observedBrand ?? "",
    ]);
    const csv = "\ufeff" + [headers, ...rows].map(row => row.map(csvValue).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trajeto-postos-aguas-lindas-2026-09-30.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.message(localDirectory.length + " cadastro(s) exportado(s).");
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
          <div>
            <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Postos</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">{showSavedOnly ? "Seus salvos." : "Encontre uma parada."}</h1>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.54rem] font-black " + (online ? "border-[#C7FF3C]/20 text-[#C7FF3C]" : "border-[#FFB86B]/25 text-[#FFB86B]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form onSubmit={submit}>
              <label className="block text-[0.56rem] font-black uppercase tracking-[.14em] text-white/65" htmlFor="station-search">Cidade, bairro ou posto</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <Search className="size-4 shrink-0 text-[#3DE3FF]" />
                <input id="station-search" value={input} onChange={event => setInput(event.target.value)} autoComplete="street-address" enterKeyHint="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/65" placeholder="Ex.: Águas Lindas de Goiás" />
                <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </form>

            <div className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={useNearby} disabled={locating} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#C7FF3C] px-3.5 text-[0.6rem] font-black text-[#0B1014] disabled:opacity-40">
                <Navigation className="size-3.5" /> {locating ? "GPS…" : "Perto de mim"}
              </button>
              {!staticRuntime && (
                <button type="button" onClick={() => setOnlyOpen(current => !current)} className={onlyOpen ? "min-h-11 shrink-0 rounded-full bg-[#3DE3FF] px-3.5 text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 py-2 text-[0.6rem] font-bold text-white/65"}>
                  <CircleCheck className="mr-1 inline size-3.5" /> Abertos agora
                </button>
              )}
              <button type="button" onClick={() => void shareCurrent()} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 text-[0.6rem] font-bold text-white/65"><Share2 className="mr-1 inline size-3.5" /> Enviar</button>
              <button type="button" onClick={openSaved} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 text-[0.6rem] font-bold text-white/65"><Heart className="mr-1 inline size-3.5" /> Salvos {saved.length || ""}</button>
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
                  setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(item));
                }} className="max-w-[12rem] shrink-0 truncate rounded-full border border-white/8 px-3 py-2 text-[0.57rem] font-bold text-white/65">{item}</button>
                ))}
              </div>
            )}
          </section>
        )}

        {mapFirst && !showSavedOnly && broadAguasLindasQuery && mapStations.length > 0 && (
          <section className="mt-5 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#121B22] shadow-[0_24px_70px_rgba(0,0,0,.28)]" aria-labelledby="map-first-title">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div>
                <p className="text-[0.52rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Mapa principal</p>
                <h2 id="map-first-title" className="mt-1 text-lg font-black">Postos de Águas Lindas</h2>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 text-[0.5rem] font-black text-white/45">{mapStations.length} referências</span>
            </div>
            <div className="h-[min(70vh,680px)]">
              <StationMap stations={mapStations} showTraffic={online} onSelectStation={handleMapStationSelect} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-3">
              <button type="button" onClick={useNearby} disabled={locating} className="min-h-11 rounded-xl bg-[#C7FF3C] text-xs font-black text-[#0B1014]">Mais perto</button>
              <button type="button" onClick={() => document.getElementById("complete-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-11 rounded-xl border border-white/8 text-xs font-black text-white/70">Ver fichas</button>
            </div>
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-[#3DE3FF]/20 bg-[#0F1A20] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="public-stations-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Modo público</p>
                <h2 id="public-stations-title" className="mt-1 text-lg font-black">Pesquisar postos sem esperar por servidor.</h2>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-white/65">Esta versão usa o catálogo local e snapshots ANP versionados. Conferência e navegação ao vivo abrem no provedor externo escolhido; favoritos e dados salvos continuam neste aparelho.</p>
              </div>
            </div>
            {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-3 text-[0.57rem] leading-relaxed text-white/65">
                <strong className="text-[#FFD09A]">Descobertas ainda não conciliadas:</strong> {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.length} referências de estabelecimentos apareceram em mapas. Elas são exibidas para auditoria, mas não são somadas automaticamente à base cadastral até haver identificação confiável por CNPJ/endereço.
                <div className="mt-2 grid gap-2">
                  {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.map(item => (
                    <div key={item.displayName + item.address} className="rounded-xl border border-white/8 bg-[#0B1014]/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.62rem] font-black text-white">{item.displayName}</p>
                          <p className="mt-1 text-[0.54rem] leading-relaxed text-white/65">{item.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#FFB86B]/20 px-2 py-1 text-[0.45rem] font-black text-[#FFD09A]">mapa</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[0.52rem] text-white/65 sm:grid-cols-4">
                        <span>Telefone: {item.phone ?? "não informado"}</span>
                        <span>Horário: {item.hours ?? "não informado"}</span>
                        <span>Avaliação: {item.rating ?? "—"}{item.reviews != null ? " · " + item.reviews + " avaliações" : ""}</span>
                        <span className="col-span-2 sm:col-span-1">{item.note}</span>
                      </div>
                      <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(item.displayName + ", " + item.address), "_blank", "noopener,noreferrer")} className="mt-3 min-h-10 rounded-xl bg-[#C7FF3C] px-3 text-[0.56rem] font-black text-[#0B1014]">Abrir no Google Maps</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Pesquisar no Google Maps</button>
              <button type="button" onClick={useNearby} disabled={locating || !online} className="min-h-12 rounded-xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/[.05] px-3 text-xs font-black text-[#C9F7FF]">Postos perto de mim</button>
            </div>
          </section>
        )}

        {!showSavedOnly && broadAguasLindasQuery && (
          <section className="mt-4 overflow-hidden rounded-[1.7rem] border border-white/8 bg-white/[.025] p-4 shadow-[0_18px_65px_rgba(0,0,0,.20)] backdrop-blur sm:p-5" aria-label="Painel rápido dos postos">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Águas Lindas · posto em 1 toque</p>
                  <span className="rounded-full border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-2 py-1 text-[0.45rem] font-black text-[#9FEFFF]">sem conta</span>
                  <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.45rem] font-black text-white/65">{online ? "online + cache" : "offline"}</span>
                </div>
                <h2 className="mt-1 text-xl font-black tracking-[-.03em]">Mapa, ficha e rota no mesmo lugar.</h2>
                <p className="mt-1 text-[0.63rem] leading-relaxed text-white/65">Abra o mapa, escolha um posto e saia direto para o navegador que você usa. Os dados locais ficam disponíveis no aparelho sem cadastro.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => { setShowMap(true); window.setTimeout(() => document.getElementById("aguas-lindas-map")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20); }} className="min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014] transition-transform duration-200 active:scale-[.98]"><MapIcon className="mr-1 inline size-3.5" />Abrir mapa</button>
              <button type="button" onClick={() => document.getElementById("complete-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-12 rounded-2xl border border-white/8 bg-white/[.035] px-3 text-[0.6rem] font-black text-white/75 transition-transform duration-200 active:scale-[.98]"><Fuel className="mr-1 inline size-3.5" />Ver fichas</button>
              <button type="button" onClick={useNearby} disabled={locating || typeof navigator === "undefined" || !navigator.geolocation} className="min-h-12 rounded-2xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-[0.6rem] font-black text-[#C9F7FF] disabled:opacity-35 transition-transform duration-200 active:scale-[.98]"><MapPin className="mr-1 inline size-3.5" />Mais perto</button>
              <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.02] px-3 text-[0.53rem] font-black text-white/65"><ShieldCheck className="size-3.5 text-[#C7FF3C]" />ANP + cache local</div>
            </div>
          </section>
        )}

        {!showSavedOnly && broadAguasLindasQuery && (
          <section className="mt-5 rounded-[1.6rem] border border-[#3DE3FF]/20 bg-[#0F171D] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="anp-directory-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Fonte oficial ANP</p>
                <h2 id="anp-directory-title" className="mt-1 text-xl font-black">Cadastro técnico dos postos</h2>
                <p className="mt-1 text-[0.63rem] leading-relaxed text-white/65">A API da ANP fornece autorização, CNPJ, endereço, distribuidora, produtos, tancagem, bicos, coordenadas, validação geográfica, situação constatada e status SIGAF.</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 py-1 text-[0.5rem] font-black text-[#9FEFFF]">{anpStations.length || "—"} postos</span>
            </div>

            {anpLiveQuery.isLoading && !staticRuntime && <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-xs text-white/65">Consultando a base oficial da ANP…</div>}
            {anpLiveQuery.isError && !staticRuntime && <div className="mt-4 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-4 text-xs leading-relaxed text-white/65">A consulta ao serviço da ANP falhou nesta tentativa. A base local continua disponível. <button type="button" onClick={() => void anpLiveQuery.refetch()} className="mt-2 min-h-10 rounded-xl border border-[#FFB86B]/20 px-3 font-black text-[#FFD09A]">Tentar novamente</button></div>}
            {staticRuntime && !anpRows.length && <div className="mt-4 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-4 text-xs leading-relaxed text-white/65">O snapshot oficial ainda não chegou ao GitHub Pages. A sincronização automática da ANP foi configurada e a base local continua disponível enquanto isso.</div>}

            {(anpRows.length > 0 || mapStations.length > 0) && (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.03] p-3">
                  <div className="min-w-0">
                    <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#C7FF3C]">Mapa de Águas Lindas</p>
                    <p className="mt-1 text-[0.62rem] leading-relaxed text-white/65">{anpWithCoordinates} de {anpStations.length} postos da ANP possuem coordenadas{anpWithoutCoordinates > 0 ? ` · ${anpWithoutCoordinates} sem coordenadas oficiais nesta resposta` : ""}. {mapSecondaryCount > 0 ? mapSecondaryCount + " referências secundárias também foram agregadas ao mapa." : ""}</p>
                  </div>
                  <button type="button" onClick={() => setShowMap(current => !current)} disabled={mapStations.length === 0} className="min-h-11 shrink-0 rounded-xl bg-[#C7FF3C] px-4 text-[0.6rem] font-black text-[#0B1014] disabled:opacity-40">{showMap ? "Ocultar mapa" : `Ver ${mapStations.length} postos no mapa`}</button>
                </div>

                {showMap && mapStations.length > 0 && (
                  <section id="aguas-lindas-map" className="scroll-mt-24 mt-3 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#0B1014]" aria-label="Mapa de todos os postos de Águas Lindas">
                    <div className="h-[min(68vh,620px)]">
                      <StationMap
                        stations={mapStations}
                        showTraffic={online}
                        onSelectStation={handleMapStationSelect}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-3 py-2.5 text-[0.52rem] text-white/65">
                      <span>{mapStations.length} marcadores · {mapOfficialCount} ANP + {mapSecondaryCount} referências de mapa</span>
                      <span>{online ? "online · tráfego quando disponível" : "offline · coordenadas salvas no aparelho"}</span>
                      <span>{anpWithoutCoordinates > 0 ? String(anpWithoutCoordinates) + " cadastro(s) ANP sem coordenada · ficha continua disponível" : "cobertura coordenada ANP completa nesta consulta"}</span>
                    </div>
                  </section>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">Linhas ANP</p><p className="mt-1 text-lg font-black">{anpRows.length}</p></div>
                  <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">CNPJs</p><p className="mt-1 text-lg font-black">{anpStations.length}</p></div>
                  <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">Com coordenadas</p><p className="mt-1 text-lg font-black">{anpStations.filter(item => item.latitude != null && item.longitude != null).length}</p></div>
                  <button type="button" onClick={exportAnpCsv} className="rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] p-3 text-left"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-[#87DFF0]">Dados completos</p><p className="mt-1 text-sm font-black text-[#C9F7FF]">Exportar CSV</p></button>
                </div>

                <div className="mt-3 space-y-2">
                  {anpStations.slice(0, 12).map(station => (
                    <details key={station.cnpj} className="rounded-[1.15rem] border border-white/8 bg-[#0B1014]">
                      <summary className="cursor-pointer list-none px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white">{station.razaoSocial ?? "Razão social não informada"}</p>
                            <p className="mt-1 text-[0.56rem] text-white/65">CNPJ {station.cnpj} · Autorização {station.autorizacao ?? "não informada"}</p>
                            <p className="mt-1 text-[0.58rem] leading-relaxed text-white/65">{station.endereco ?? "Endereço não informado"}{station.bairro ? " · " + station.bairro : ""}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-[0.46rem] font-black text-white/65">{station.products.length} produto(s)</span>
                        </div>
                      </summary>
                      <div className="space-y-2 border-t border-white/8 px-3.5 py-3 text-[0.55rem] leading-relaxed text-white/65">
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
                {anpStations.length > 12 && <p className="mt-3 text-center text-[0.55rem] text-white/65">Mostrando os primeiros 12 nesta visualização. O CSV contém todas as linhas retornadas pela ANP.</p>}
              </>
            )}

            {!anpRows.length && mapStations.length > 0 && (
              <section id="aguas-lindas-map-offline" className="scroll-mt-24 mt-4 overflow-hidden rounded-[1.35rem] border border-[#FFB86B]/20 bg-[#0B1014]" aria-label="Mapa offline de referências dos postos">
                <div className="border-b border-white/8 px-3.5 py-3">
                  <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-[#FFCF96]">Mapa salvo no aparelho</p>
                  <p className="mt-1 text-[0.6rem] leading-relaxed text-white/65">A ANP não respondeu nesta sessão. As coordenadas de consultas anteriores continuam disponíveis e navegáveis sem conexão.</p>
                </div>
                <div className="h-[min(68vh,620px)]">
                  <StationMap stations={mapStations} showTraffic={false} />
                </div>
                <div className="border-t border-white/8 px-3 py-2.5 text-[0.52rem] text-white/65">{mapStations.length} referências armazenadas · {offlineMapAge}.</div>
              </section>
            )}

            <p className="mt-3 text-[0.5rem] leading-relaxed text-white/65">Fonte: API de Revendedores da ANP. Cache de mapa: {offlineMapAge}. Última consulta oficial: {(anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) ? new Date((anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) as string).toLocaleString("pt-BR") : "ainda não registrada"}.</p>
          </section>
        )}

        {broadAguasLindasQuery && !showSavedOnly && (
          <section id="complete-stations" className="scroll-mt-24 mt-5 rounded-[1.6rem] border border-[#C7FF3C]/20 bg-[#111A21] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="complete-stations-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Diretório completo</p>
                <h2 id="complete-stations-title" className="mt-1 text-xl font-black">Cada posto, uma ficha completa</h2>
                <p className="mt-2 text-[0.65rem] leading-relaxed text-white/65">
                  {directoryCards.length} fichas consolidadas por CNPJ. O catálogo separa {anpStations.length} registros ANP de referências secundárias, sem transformar descoberta de mapa em autorização ANP. Cada ficha tem rota para Google Maps, Waze e Apple Maps.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-[0.5rem] font-black text-[#D9FF91]">{directoryCards.length} fichas</span>
                <p className="mt-1 text-[0.45rem] font-bold text-white/65">{anpStations.length} registros ANP</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/8 bg-[#0B1014] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-white/65">Referência municipal de preços</p>
                  <p className="mt-1 text-[0.56rem] text-white/65">{AGUAS_LINDAS_PRICE_REFERENCE.period} · ANP · não é preço individual em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveMapOffline} className="min-h-9 rounded-lg border border-white/8 bg-white/[.03] px-2.5 text-[0.48rem] font-black text-white/65">Salvar mapa offline</button>
                  <button type="button" onClick={() => void refreshStationData()} className="min-h-9 rounded-lg border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.03] px-2.5 text-[0.48rem] font-black text-[#9FEFFF]">Atualizar</button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[0.52rem] text-white/65 sm:grid-cols-3">
                <span>Gasolina <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gasolineCommon.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Etanol <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.ethanol.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S10 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS10.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S500 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS500.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>GLP P13 <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.glpP13.average.toFixed(2).replace(".", ",")}</strong></span>
                <span>GNV <strong className="text-white/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gnv.average.toFixed(2).replace(".", ",")}/m³</strong></span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">Base local</p><p className="mt-1 text-lg font-black">{aguasLindasCatalog.length}</p></div>
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">Cruzados ANP</p><p className="mt-1 text-lg font-black text-[#3DE3FF]">{directoryCards.filter(item => Boolean(item.anp)).length}</p></div>
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-white/65">Com rota por coordenada</p><p className="mt-1 text-lg font-black text-[#C7FF3C]">{directoryCards.filter(item => Number.isFinite(item.anp?.latitude) && Number.isFinite(item.anp?.longitude)).length}</p></div>
              <button type="button" onClick={() => document.getElementById("complete-stations-title")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] p-3 text-left"><p className="text-[0.46rem] font-black uppercase tracking-[.1em] text-[#87DFF0]">Offline</p><p className="mt-1 text-sm font-black text-[#C9F7FF]">{online ? "cache ativo" : "modo offline"}</p></button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <Search className="size-4 text-white/65" />
                <input value={directorySearch} onChange={event => setDirectorySearch(event.target.value)} placeholder="Buscar posto, bairro, CNPJ ou bandeira" className="min-w-0 flex-1 bg-transparent text-[0.62rem] text-white outline-none placeholder:text-white/65" aria-label="Filtrar diretório de postos" />
                {directorySearch && <button type="button" onClick={() => setDirectorySearch("")} className="grid size-7 place-items-center rounded-lg text-white/65" aria-label="Limpar busca"><X className="size-3.5" /></button>}
              </label>
              <select aria-label="Filtrar por combustível" value={fuelFilter} onChange={event => setFuelFilter(event.target.value as StationFuelFilter)} className="min-h-11 rounded-2xl border border-white/8 bg-[#0B1014] px-3 text-[0.56rem] font-black text-white/65">
                <option value="all">Combustível: todos</option>
                <option value="gasolina-comum">Gasolina comum</option>
                <option value="etanol">Etanol</option>
                <option value="diesel-s10">Diesel S10</option>
                <option value="diesel-s500">Diesel S500</option>
                <option value="glp-p13">GLP P13</option>
                <option value="gnv">GNV</option>
              </select>
              <select aria-label="Ordenar diretório de postos" value={directorySort} onChange={event => setDirectorySort(event.target.value as typeof directorySort)} className="min-h-11 rounded-2xl border border-white/8 bg-[#0B1014] px-3 text-[0.56rem] font-black text-white/65">
                <option value="name">Ordenar: nome</option>
                <option value="price">Ordenar: menor preço ANP</option>
                <option value="brand">Ordenar: bandeira</option>
                <option value="distance" disabled={!userCoords}>Ordenar: mais perto</option>
              </select>
              <button type="button" onClick={() => { setDirectorySearch(""); setFuelFilter("all"); setDirectorySort(userCoords ? "distance" : "name"); }} className="min-h-11 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-3 text-[0.56rem] font-black text-[#D9FF91]">{userCoords ? "Mais perto" : "Ver todos"}</button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[0.5rem] text-white/65">
              <span>{directoryCardsFiltered.length} de {directoryCards.length} fichas visíveis · {anpStations.length} ANP</span>
              <span>{userCoords ? "distância calculada neste aparelho · GPS não enviado para o catálogo público" : "lista sem exigir localização"}</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {directoryCardsFiltered
                .slice(0, directoryVisibleCount).map((item, index) => (
                <StationDirectoryCard
                  key={item.key}
                  index={index + 1}
                  local={item.local}
                  anp={item.anp}
                  saved={saved.some(savedStation => savedStation.placeId === "aguas-lindas:" + item.key)}
                  prices={pricesByCnpj.get(item.key) ?? []}
                  catalogStatus={stationCatalogStatusLabel(item.anp && item.local?.mapData ? "anp-map-reconciled" : item.anp ? "anp-confirmed" : item.local?.mapData ? "map-reference" : "unreconciled")}
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

            {directoryVisibleCount < directoryCardsFiltered.length && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(current => Math.min(current + 24, directoryCardsFiltered.length))}
                  className="min-h-12 rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/65 transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar mais {Math.min(24, directoryCardsFiltered.length - directoryVisibleCount)} postos
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(directoryCardsFiltered.length)}
                  className="min-h-12 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] text-xs font-black text-[#D9FF91] transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar todos os {directoryCardsFiltered.length}
                </button>
              </div>
            )}

            {directoryVisibleCount >= directoryCardsFiltered.length && directoryCardsFiltered.length > 16 && (
              <button
                type="button"
                onClick={() => setDirectoryVisibleCount(48)}
                className="mt-2 min-h-10 w-full text-[0.6rem] font-bold text-white/65"
              >
                Mostrar apenas os primeiros 48
              </button>
            )}

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.55rem] leading-relaxed text-white/65">
              <strong className="text-white/65">Rota:</strong> o Trajeto envia o destino ao provedor escolhido. Google Maps, Waze e Apple Maps calculam a rota, trânsito e instruções de navegação. O site não inventa distância ou tempo quando não possui um motor de roteamento próprio.
            </div>
          </section>
        )}

        {staticRuntime && !showSavedOnly && !broadAguasLindasQuery && (
          <section className="mt-5 rounded-[1.6rem] border border-[#C7FF3C]/20 bg-[#111A21] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="local-directory-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Diretório local</p>
                <h2 id="local-directory-title" className="mt-1 text-xl font-black">{localDirectory.length} cadastro(s) encontrados</h2>
                <p className="mt-2 text-[0.66rem] leading-relaxed text-white/65">Base de Águas Lindas atualizada em {new Date(AGUAS_LINDAS_STATIONS_UPDATED_AT + "T12:00:00").toLocaleDateString("pt-BR")}. Sincronização ANP de referência: {new Date(AGUAS_LINDAS_STATIONS_LAST_SYNC + "T12:00:00").toLocaleDateString("pt-BR")}. {AGUAS_LINDAS_STATIONS_SOURCE}</p>
            <div className="mt-3 rounded-xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#C9F7FF]">Base oficial ANP</p>
                <span className="text-[0.46rem] font-bold text-white/65">28/09/2026</span>
              </div>
              <p className="mt-1 text-[0.55rem] leading-relaxed text-white/65">Cadastro oficial de revendedores em operação. A ausência de preço na semana pesquisada não indica fechamento ou ausência de autorização.</p>
              <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos","_blank","noopener,noreferrer")} className="mt-2 min-h-10 rounded-lg border border-white/8 px-3 text-[0.52rem] font-black text-white/60">Abrir base oficial da ANP</button>
            </div>
            <div className="mt-3 rounded-xl border border-white/8 bg-[#0B1014] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">Referência de preços ANP</p>
                  <p className="mt-1 text-[0.58rem] text-white/65">{AGUAS_LINDAS_PRICE_REFERENCE.period} · médias municipais</p>
                </div>
                <span className="text-[0.5rem] font-black text-white/65">não é preço em tempo real</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[0.55rem] text-white/65 sm:grid-cols-3">
                <span>Gasolina: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gasolineCommon.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Etanol: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.ethanol.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S10: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS10.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S500: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS500.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>GLP P13: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.glpP13.average.toFixed(2).replace(".", ",")}</strong></span>
                <span>GNV: <strong className="text-white/75">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gnv.average.toFixed(2).replace(".", ",")}/m³</strong></span>
              </div>
              <p className="mt-2 text-[0.5rem] leading-relaxed text-white/65">{AGUAS_LINDAS_PRICE_REFERENCE.note}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3">
                <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">Cadastros</p>
                <p className="mt-1 text-lg font-black text-white">{AGUAS_LINDAS_STATION_STATS.total}</p>
                <p className="text-[0.52rem] text-white/65">CNPJs sem duplicação</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3">
                <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">Endereço</p>
                <p className="mt-1 text-lg font-black text-white">{AGUAS_LINDAS_STATION_STATS.withAddress}</p>
                <p className="text-[0.52rem] text-white/65">{AGUAS_LINDAS_STATION_STATS.withoutAddress} sem endereço consolidado</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3">
                <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">Mapas cruzados</p>
                <p className="mt-1 text-lg font-black text-[#3DE3FF]">{AGUAS_LINDAS_STATION_STATS.mapEnriched}</p>
                <p className="text-[0.52rem] text-white/65">referência secundária atual</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3">
                <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">ANP</p>
                <p className="mt-1 text-lg font-black text-[#3DE3FF]">{AGUAS_LINDAS_ANP_CATALOG_REFERENCE.count ?? "—"}</p>
                <p className="text-[0.52rem] text-white/65">snapshot municipal oficial + API disponível</p>
              </div>
            </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[0.46rem] font-bold text-white/65">{AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE.count} CNPJs ativos no CNAE 4731-8/00</span>
                <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.5rem] font-black text-white/65">{AGUAS_LINDAS_STATIONS_COUNT} base</span>
                <span className="text-[0.46rem] font-bold text-white/65">sincronização: {new Date(AGUAS_LINDAS_STATIONS_LAST_SYNC + "T12:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-[0.55rem] font-black uppercase tracking-[.12em] text-white/65">Filtros locais{activeLocalFilterCount ? " · " + activeLocalFilterCount + " ativo(s)" : ""}</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={exportLocalCsv} className="min-h-10 rounded-full border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-[0.58rem] font-black text-[#C9F7FF]">Exportar CSV</button>
                {activeLocalFilterCount > 0 && <button type="button" onClick={resetLocalFilters} className="min-h-10 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.58rem] font-black text-white/65">Limpar filtros</button>}
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Filtrar diretório por bairro</span>
                <select value={neighborhoodFilter} onChange={event => setNeighborhoodFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white outline-none">
                  <option value="all">Todos os bairros</option>
                  {localNeighborhoods.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
                </select>
              </label>
              <label className="min-w-0"><span className="sr-only">Filtrar diretório por bandeira</span><select value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white outline-none"><option value="all">Todas as bandeiras</option>{localBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white/70"><input type="checkbox" checked={addressOnly} onChange={event => setAddressOnly(event.target.checked)} className="size-4 accent-[#C7FF3C]" /> Com endereço</label>
              <label className={"flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold " + (verifiedFilterAvailable ? "text-white/70" : "text-white/65")}><input type="checkbox" checked={verifiedOnly} onChange={event => setVerifiedOnly(event.target.checked)} disabled={!verifiedFilterAvailable} className="size-4 accent-[#C7FF3C] disabled:opacity-40" /> Dados ANP {verifiedFilterAvailable ? "(confirmados)" : "(snapshot oficial disponível)"}</label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white/70"><input type="checkbox" checked={mappedOnly} onChange={event => setMappedOnly(event.target.checked)} className="size-4 accent-[#3DE3FF]" /> Com dados de mapas</label>
            </div>

            {localDirectory.length ? (
              <>
              <div className="mt-4 flex items-center justify-between gap-2" aria-live="polite">
                <p className="text-[0.58rem] font-black uppercase tracking-[.12em] text-white/65">{localDirectory.length} resultado(s) · {localDirectory.filter(item => item.address).length} com endereço</p>
                <span className="text-[0.55rem] text-white/65">ordenado por bairro</span>
              </div>
              <div className="mt-3 space-y-2">
                {visibleLocalDirectory.map(station => {
                  const statusText = getStationDataQualityLabel(station);
                  return (
                    <article key={station.cnpj} className="rounded-[1.25rem] border border-white/8 bg-[#0B1014] p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
                          <Fuel className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white">{station.displayName}</p>
                              <p className="mt-1 text-[0.58rem] font-semibold text-white/65">{station.legalName} · CNPJ {station.cnpj}</p>
                            <p className="mt-1 text-[0.5rem] leading-relaxed text-white/65">Identidade principal: CNPJ. Nome comercial, telefone, bandeira e horário podem variar entre fontes.</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-white/8 px-2 py-1 text-[0.46rem] font-bold text-white/65">{station.status === "cadastro_ativo" ? "Cadastro setorial ativo" : station.status}</span>
                              {station.mapData && <span className="rounded-full border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.03] px-2 py-1 text-[0.46rem] font-bold text-[#9FEFFF]">Mapa cruzado</span>}
                            </div>
                            </div>
                            <span className="shrink-0 rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] px-2 py-1 text-[0.46rem] font-black text-[#D9FF91]">{station.mapData?.operationalStatus === "closed" ? "Mapa: fechado" : statusText}</span>
                          </div>
                          {station.address ? (
                            <p className="mt-2 text-[0.62rem] leading-relaxed text-white/65">{station.address}</p>
                          ) : (
                            <p className="mt-2 text-[0.62rem] leading-relaxed text-white/65">Endereço físico não consolidado nesta coleta.</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => window.open(stationMapsSearchUrl(station), "_blank", "noopener,noreferrer")} className="min-h-11 flex-1 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]">Abrir no Google Maps</button>
                        {station.address && <button type="button" onClick={() => void copyAddress(station)} className="min-h-11 rounded-xl border border-white/8 px-3 text-[0.6rem] font-black text-white/65">Copiar endereço</button>}
                        <button type="button" onClick={() => void copyCnpj(station.cnpj)} className="min-h-11 rounded-xl border border-white/8 px-3 text-[0.6rem] font-black text-white/65">Copiar CNPJ</button>
                        <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web", "_blank", "noopener,noreferrer")} className="min-h-11 w-full rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-[0.6rem] font-black text-[#C9F7FF]">Verificar situação na ANP</button>
                      </div>
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/[.02] p-3">
                        <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-white/65">Como interpretar</p>
                        <p className="mt-1 text-[0.55rem] leading-relaxed text-white/65">Cadastro identifica o estabelecimento. Preço, horário, bandeira e situação operacional podem mudar e precisam de uma fonte e uma data de coleta próprias.</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[0.5rem] text-white/65">
                        <span>{station.neighborhood ?? "Bairro não consolidado"}</span>
                        <span>{station.brand ?? "Bandeira não consolidada"}</span>
                      </div>
                      <details className="mt-3 rounded-xl border border-white/8 bg-white/[.02]">
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-[0.58rem] font-black text-white/65">Ver dados completos deste cadastro</summary>
                        <div className="space-y-2 border-t border-white/8 px-3 py-3 text-[0.55rem] leading-relaxed text-white/65">
                          <p><strong className="text-white/65">Situação:</strong> {station.status === "cadastro_ativo" ? "cadastro setorial ativo" : station.status}</p>
                          <p><strong className="text-white/65">Aliases:</strong> {station.aliases.length ? station.aliases.join(" · ") : "não informados"}</p>
                          <p><strong className="text-white/65">Observação da coleta:</strong> {station.sourceNote}</p>
                          <p><strong className="text-white/65">Qualidade:</strong> {statusText} · {station.dataOrigin === "ANP" ? "fonte ANP" : station.dataOrigin === "cross-check" ? "dados cruzados com referência secundária" : "catálogo local"}</p>
                          {station.mapData && (
                            <div className="rounded-lg border border-[#3DE3FF]/10 bg-[#3DE3FF]/[.025] p-2.5">
                              <p className="font-black uppercase tracking-[.1em] text-[0.47rem] text-[#87DFF0]">Referência atual de mapas</p>
                              <p className="mt-1">{station.mapData.phone ? "Telefone: " + station.mapData.phone + " · " : ""}{station.mapData.rating != null ? "Nota: " + station.mapData.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " · " : ""}{station.mapData.reviewCount != null ? station.mapData.reviewCount.toLocaleString("pt-BR") + " avaliações" : ""}</p>
                              <p className="mt-1">{station.mapData.hours ? "Horário informado: " + station.mapData.hours + (station.mapData.observedBrand ? " · bandeira observada: " + station.mapData.observedBrand : "") : station.mapData.observedBrand ? "Bandeira observada: " + station.mapData.observedBrand : "Sem horário consolidado."}</p>
                              {station.mapData.operationalStatus && <p className={"mt-1 font-bold " + (station.mapData.operationalStatus === "closed" ? "text-[#FFB86B]" : "text-[#9FEFFF]")}>{station.mapData.operationalStatus === "closed" ? "Mapa indica fechamento permanente. Confirmar na fonte oficial antes de concluir que o cadastro foi encerrado." : "Status operacional observado em mapa: " + (station.mapData.operationalStatus === "open" ? "aberto" : "não confirmado")}</p>}
                              <p className="mt-1 text-white/65">Fonte secundária de mapas, observada em {station.mapData.observedAt ?? "data não informada"}; não substitui cadastro ANP.</p>
                            </div>
                          )}
                        </div>
                      </details>
                    </article>
                  );
                })}
              {hasMoreLocalStations && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setLocalVisibleCount(current => Math.min(current + 12, localDirectory.length))} className="min-h-12 w-full rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/65">
                  Mostrar mais {Math.min(12, localDirectory.length - visibleLocalDirectory.length)} postos
                </button>
                <button type="button" onClick={() => setLocalVisibleCount(localDirectory.length)} className="min-h-12 w-full rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] text-xs font-black text-[#D9FF91]">
                  Mostrar todos os {localDirectory.length} cadastros
                </button>
              </div>
              )}
              {visibleLocalDirectory.length > 12 && (
                <button
                  type="button"
                  onClick={() => setLocalVisibleCount(12)}
                  className="mt-2 min-h-10 w-full text-[0.6rem] font-bold text-white/65"
                >
                  Mostrar apenas os primeiros 12
                </button>
              )}
              </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.02] p-4" role="status" aria-live="polite">
                <p className="text-xs font-black text-white/70">Nenhum cadastro corresponde aos filtros atuais.</p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-white/65">Tente remover bairro, bandeira ou a exigência de endereço para ampliar os resultados.</p>
                {activeLocalFilterCount > 0 && <button type="button" onClick={resetLocalFilters} className="mt-3 min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]">Limpar filtros</button>}
              </div>
            )}
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.57rem] leading-relaxed text-white/65">
            Fonte e natureza do dado: cadastro empresarial público e referências públicas locais. A ANP mantém o cadastro oficial de revendedores autorizados; preços e situação operacional podem mudar e devem ser verificados antes da viagem.
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.58rem] leading-relaxed text-white/65">
            <p><strong className="text-white/65">Confiabilidade:</strong> cadastro ativo é uma informação cadastral; não confirma funcionamento neste momento, preço atual ou coordenada exata.</p>
            <p className="mt-1">A ANP disponibiliza cadastro oficial e também uma API de revendedores com endereço, produtos, distribuidor, tancagem, bicos, situação de interdição e coordenadas quando disponíveis.</p>
          </section>
        )}

        {nearby && (
          <section className="mt-3 flex items-start gap-3 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />
            <div><p className="text-xs font-black">Busca por proximidade</p><p className="mt-1 text-[0.58rem] leading-relaxed text-white/65">A localização foi usada para ordenar a consulta; suas coordenadas não são exibidas publicamente pelo Trajeto.</p></div>
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
            <p className="mt-1 text-xs leading-relaxed text-white/65">O objetivo continua disponível no Google Maps enquanto o serviço do Trajeto não responde.</p>
            <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")} className="mt-4 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">Abrir no Google Maps</button>
          </section>
        )}

        {(!staticRuntime && (stations.length > 0 || showSavedOnly)) && (
          <>
            <section className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-white/65">{usingCache ? "Cache local" : searchedAt ? "Consulta atual" : "Neste aparelho"}</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">{visibleStations.length} resultado(s)</h2>
                <p className="mt-1 text-[0.56rem] text-white/65">{usingCache ? "Salvos em " + cachedAt : searchedAt ? "Atualizado em " + searchedAt : "Favoritos locais"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMap(current => !current)} disabled={!visibleStations.length} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-white/60" aria-label={showMap ? "Ocultar mapa" : "Mostrar mapa"}><MapIcon className="size-4" /></button>
                {compareIds.length > 0 && <button type="button" onClick={() => document.getElementById("station-compare")?.scrollIntoView({ behavior: "smooth" })} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.58rem] font-black text-[#0B1014]">{compareIds.length} comparar</button>}
              </div>
            </section>

            {showMap && !broadAguasLindasQuery && visibleStations.length > 0 && (
              <section className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-[#121B22]">
                <div className="h-[min(62vh,500px)]"><StationMap stations={visibleStations} /></div>
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
                          <div className="min-w-0"><p className="truncate text-sm font-black">{station.name}</p><p className="mt-1 truncate text-[0.6rem] text-white/65">{inferredBrand(station.name)} · {station.distanceLabel || "distância indisponível"}</p></div>
                          {station.isOpen === true && <span className="shrink-0 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.48rem] font-black text-[#D9FF91]">aberto</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[0.64rem] leading-relaxed text-white/65">{station.address}</p>
                      </div>
                    </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => navigateTo(station)} className="col-span-2 min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.6rem] font-black text-[#0B1014]"><Navigation className="mr-1 inline size-3.5" />Navegar</button>
                      <button type="button" onClick={() => toggleSaved(station)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isSaved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/[.06] text-[#FFB7A9]" : "border-white/8 text-white/65")} aria-label={isSaved ? "Remover dos salvos" : "Salvar posto"}><Heart className="size-4" fill={isSaved ? "currentColor" : "none"} /></button>
                      <button type="button" onClick={() => toggleCompare(station.placeId)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isCompared ? "border-[#3DE3FF]/40 bg-[#3DE3FF]/[.08] text-[#3DE3FF]" : "border-white/8 text-white/65")} aria-label={isCompared ? "Remover da comparação" : "Comparar posto"}><SlidersHorizontal className="size-4" /></button>
                    </div>
                    {index === 0 && <p className="mt-2 text-center text-[0.5rem] font-bold text-white/65">Ações principais ficam sempre no alcance do polegar.</p>}
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
              <section id="station-compare" className="mt-5 rounded-[1.5rem] border border-[#3DE3FF]/20 bg-[#121B22] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[0.55rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Comparação</p><h3 className="mt-1 text-xl font-black">{compared.length} parada(s)</h3></div>
                  <button type="button" onClick={() => setCompareIds([])} className="grid size-9 place-items-center rounded-lg border border-white/8 text-white/65" aria-label="Limpar comparação"><X className="size-4" /></button>
                </div>
                <div className="mt-3 space-y-2">
                  {compared.map(item => <button key={item.placeId} type="button" onClick={() => navigateTo(item)} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[#0B1014] px-3 text-left"><span className="min-w-0 truncate text-xs font-black">{item.name}<span className="ml-2 text-[0.55rem] font-normal text-white/65">{item.distanceLabel || "sem distância"}</span></span><ChevronRight className="size-4 shrink-0 text-[#3DE3FF]" /></button>)}
                </div>
              </section>
            )}

            <section className="mt-4 rounded-3xl border border-white/8 bg-white/[.025] p-4">
              <details>
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Como ler estes dados</span><BadgeInfo className="size-4 text-white/65" /></summary>
                <div className="mt-2 space-y-2 text-[0.6rem] leading-relaxed text-white/65">
                  <p>Endereço, horário, telefone e distância dependem da consulta atual do provedor de mapas.</p>
                  <p>Referências de preço aparecem separadas e nunca são tratadas como preço em tempo real.</p>
                  <p>Um item salvo neste aparelho funciona como atalho local e não precisa de conta.</p>
                </div>
              </details>
            </section>
          </>
        )}

        {!stations.length && !stationPages.isLoading && (
          <section className="mt-5 rounded-3xl border border-white/8 bg-[#121B22] p-5 text-center">
            <Fuel className="mx-auto size-5 text-white/65" />
            <p className="mt-3 text-sm font-black">{showSavedOnly ? "Nenhum posto salvo." : "Pesquise uma região para começar."}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">O Trajeto mostra resultados encontrados na consulta atual e separa as referências oficiais quando disponíveis.</p>
          </section>
        )}

        <footer className="mt-10 pb-3 text-center text-[0.55rem] leading-relaxed text-white/65">
          O Trajeto organiza os resultados; a navegação é aberta no provedor escolhido.
        </footer>
      </div>
    </main>
  );
}
