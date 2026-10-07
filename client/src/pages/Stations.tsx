import { BadgeInfo, ChevronRight, CircleCheck, Fuel, Heart, Loader2, Map as MapIcon, MapPin, Navigation, Search, Share2, ShieldCheck, SlidersHorizontal, Sparkles, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { matchesCatalogText } from "@/lib/catalogSearch";
import { appUrl } from "@/lib/appUrl";
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl, buildOrganicMapsSearchUrl, getPreferredNavigationProvider, openExternalUrl, openNavigation, setPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import { getCachedStations, cacheStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { corridorPresets } from "@/lib/corridorPresets";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE, AGUAS_LINDAS_ANP_CATALOG_REFERENCE, AGUAS_LINDAS_ANP_VERIFIED_COUNT, AGUAS_LINDAS_MAP_ONLY_DISCOVERIES, AGUAS_LINDAS_PRICE_REFERENCE, AGUAS_LINDAS_STATION_STATS, AGUAS_LINDAS_STATIONS_COUNT, AGUAS_LINDAS_STATIONS_LAST_SYNC, AGUAS_LINDAS_STATIONS_SOURCE, AGUAS_LINDAS_STATIONS_UPDATED_AT, getStationDataQualityLabel, searchAguasLindasStations, stationMapsSearchUrl } from "@/lib/aguasLindasStations";
import { fuelFilterPriceKey, inferredBrand, normalizeStationCnpj, sameStationIdentity, stationCoordinatePoint, stationSupportsFuel, type StationFuelFilter } from "@/lib/stationListControls";
import { StationMap, type StationMapItem } from "@/components/StationMap";
import { StationDirectoryCard } from "@/components/StationDirectoryCard";
import QuickFilterChips from "@/components/QuickFilterChips";
import { toast } from "sonner";
import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { cacheOfflineAnpSnapshot, cacheOfflineMapStations, getOfflineAnpSnapshot, getOfflineMapAgeLabel, getOfflineMapStations, hydrateOfflineAnpSnapshot, hydrateOfflineMapStations } from "@/lib/stationMapOffline";
import { loadAguasLindasAnpPrices, indexAnpPricesByCnpj } from "@/lib/anpPrices";
import type { AnpPriceSnapshot } from "@/lib/anpPrices";
import { stationCatalogStatusLabel } from "@/lib/stationEntity";
import { coarsenCoordinatePoint } from "@/lib/locationPrivacy";

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
    /^aguas lindas(?: de goias)?(?:,? go)?$/.test(normalized) ||
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
  const [nearbyAutoAttempted, setNearbyAutoAttempted] = useState(false);
  const verifiedFilterAvailable = AGUAS_LINDAS_ANP_VERIFIED_COUNT > 0;
  const [directorySearch, setDirectorySearch] = useState("");
  const [directorySort, setDirectorySort] = useState<"name" | "distance" | "brand" | "price">("name");
  const [directoryVisibleCount, setDirectoryVisibleCount] = useState(24);
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
  const nearbyRequested = params.get("perto") === "1";
  const showSavedOnly = params.get("salvos") === "1";
  useEffect(() => {
    if (!hasCoordinates || typeof window === "undefined") return;
    const clean = new URLSearchParams(window.location.search);
    clean.delete("lat");
    clean.delete("lng");
    clean.set("perto", "1");
    const nextUrl = appUrl("/postos") + "?" + clean.toString();
    window.history.replaceState(window.history.state, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [hasCoordinates]);
  const urlQuery = params.get("q")?.trim() || corridorPresets[0]?.query || "postos";
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
  const pricesByCnpj = useMemo(() => {
    const records = (priceSnapshot?.data ?? []).map(record => ({ ...record, cnpj: normalizeStationCnpj(record.cnpj) }));
    return indexAnpPricesByCnpj(records);
  }, [priceSnapshot]);
  const hasIndividualPrices = pricesByCnpj.size > 0;
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
  const aguasLindasCatalog = useMemo(() => searchAguasLindasStations("postos"), []);
  const localBrands = useMemo(
    () => Array.from(new Set(aguasLindasCatalog.map(station => station.brand ?? "Sem bandeira"))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [aguasLindasCatalog]
  );
  const localNeighborhoods = useMemo(
    () => Array.from(new Set(aguasLindasCatalog.map(station => station.neighborhood).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [aguasLindasCatalog]
  );

  const anpByCnpj = useMemo(() => new Map(anpStations.map(station => [normalizeStationCnpj(station.cnpj), station])), [anpStations]);
  const directoryCards = useMemo(() => {
    const cards: Array<{ key: string; local: typeof aguasLindasCatalog[number] | null; anp: typeof anpStations[number] | null }> = aguasLindasCatalog.map(local => {
      const key = normalizeStationCnpj(local.cnpj) || local.cnpj;
      return {
        key,
        local,
        anp: anpByCnpj.get(key) ?? null,
      };
    });
    for (const anp of anpStations) {
      const key = normalizeStationCnpj(anp.cnpj) || anp.cnpj;
      const alreadyRepresented = cards.some(item => sameStationIdentity(
        {
          cnpj: item.anp?.cnpj || item.local?.cnpj,
          address: [item.anp?.endereco || item.local?.address, item.anp?.bairro || item.local?.neighborhood].filter(Boolean).join(" "),
          lat: Number(item.anp?.latitude ?? item.local?.anp?.latitude),
          lng: Number(item.anp?.longitude ?? item.local?.anp?.longitude),
        },
        {
          cnpj: anp.cnpj,
          address: [anp.endereco, anp.bairro].filter(Boolean).join(" "),
          lat: Number(anp.latitude),
          lng: Number(anp.longitude),
        },
      ));
      if (alreadyRepresented) continue;
      cards.push({ key, local: null, anp });
    }
    return cards;
  }, [aguasLindasCatalog, anpStations, anpByCnpj]);

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
        item.local?.aliases?.join(" "),
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
      return (!normalized || matchesCatalogText(directorySearch, [text])) &&
        (!staticRuntime || broadAguasLindasQuery || matchesCatalogText(query, [text])) && matchesFuel;
    });

    return [...matches].sort((a, b) => {
      const stationLabel = (item: typeof directoryCards[number]) => item.local?.displayName || item.anp?.razaoSocial || "";
      if (directorySort === "distance" && userCoords) {
        const getCoords = (item: typeof directoryCards[number]) =>
          stationCoordinatePoint(item.anp?.latitude ?? item.local?.anp?.latitude, item.anp?.longitude ?? item.local?.anp?.longitude);
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
  }, [directoryCards, directorySearch, directorySort, userCoords, fuelFilter, pricesByCnpj, query, staticRuntime, broadAguasLindasQuery]);

  const toggleDirectorySaved = (local: typeof aguasLindasCatalog[number] | null, anp: typeof anpStations[number] | null) => {
    const point = stationCoordinatePoint(anp?.latitude ?? local?.anp?.latitude, anp?.longitude ?? local?.anp?.longitude);
    if (!point) {
      toast.message("Este cadastro ainda não possui coordenada consolidada para o atalho local.");
      return;
    }
    const station = {
      placeId: "aguas-lindas:" + (normalizeStationCnpj(anp?.cnpj || local?.cnpj) || local?.id || "posto"),
      name: local?.displayName || anp?.razaoSocial || "Posto",
      address: [
        anp?.endereco || local?.address,
        anp?.bairro || local?.neighborhood,
        anp?.municipio || "Águas Lindas de Goiás",
        anp?.uf || "GO",
      ].filter(Boolean).join(", "),
      lat: point.lat,
      lng: point.lng,
      phone: local?.mapData?.phone ?? null,
      website: null,
      openingHours: local?.mapData?.hours ? [local.mapData.hours] : [],
      isOpen: local?.mapData?.operationalStatus === "open" ? true : local?.mapData?.operationalStatus === "closed" ? false : null,
    } satisfies MobileStation;
    const result = toggleMobileStationFavorite(station);
    if (result.error) { toast.message("Não foi possível guardar o favorito. Confira o espaço e as permissões do navegador."); return; }
    setSaved(result.stations);
    vibration();
    toast.message(result.saved ? "Posto salvo neste aparelho." : "Posto removido dos salvos.");
  };


  const visibleLocalDirectory = localDirectory.slice(0, localVisibleCount);
  const hasMoreLocalStations = visibleLocalDirectory.length < localDirectory.length;

  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    { query },
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
    const official: StationMapItem[] = anpStations.flatMap(station => {
      const point = stationCoordinatePoint(station.latitude, station.longitude);
      return point ? [{
        id: "anp-" + station.cnpj,
        name: station.razaoSocial || "Posto " + station.cnpj,
        address: [station.endereco, station.bairro, station.municipio, station.uf].filter(Boolean).join(" · "),
        ...point,
        cnpj: station.cnpj,
        brand: station.distribuidora,
        source: "ANP" as const,
      }] : [];
    });

    const local: StationMapItem[] = aguasLindasCatalog.map(station => {
      const point = stationCoordinatePoint(station.anp?.latitude, station.anp?.longitude);
      return {
        id: "local-" + station.cnpj,
        name: station.displayName || station.legalName,
        address: [station.address, station.neighborhood, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(" · "),
        ...(point ?? {}),
        cnpj: station.cnpj,
        brand: station.brand || station.mapData?.observedBrand,
        source: "local" as const,
      };
    });

    const directory: StationMapItem[] = directoryCards.map(item => {
      const point = stationCoordinatePoint(item.anp?.latitude ?? item.local?.anp?.latitude, item.anp?.longitude ?? item.local?.anp?.longitude);
      return {
        id: "directory-" + item.key,
        name: item.local?.displayName || item.anp?.razaoSocial || "Posto",
        address: [
          item.anp?.endereco || item.local?.address,
          item.anp?.complemento,
          item.anp?.bairro || item.local?.neighborhood,
          item.anp?.municipio || "Águas Lindas de Goiás",
          item.anp?.uf || "GO",
        ].filter(Boolean).join(" · "),
        ...(point ?? {}),
        cnpj: item.anp?.cnpj || item.local?.cnpj || null,
        brand: item.anp?.distribuidora || item.local?.brand || item.local?.mapData?.observedBrand || null,
        source: "local" as const,
      };
    });

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
        ? "cnpj:" + normalizeStationCnpj(station.cnpj)
        : station.placeId
          ? "place:" + station.placeId
          : "address:" + normalize(station.address || station.name);
      if (seen.has(key)) continue;
      const duplicate = merged.some(existing => sameStationIdentity(
        { cnpj: existing.cnpj, address: existing.address, lat: existing.lat, lng: existing.lng },
        { cnpj: station.cnpj, address: station.address, lat: station.lat, lng: station.lng },
      ));
      if (duplicate) continue;
      seen.add(key);
      merged.push(station);
    }
    return merged;
  }, [anpStations, aguasLindasCatalog, directoryCards, liveStations, offlineMap]);
  const anpWithCoordinates = anpStations.filter(station => Boolean(stationCoordinatePoint(station.latitude, station.longitude))).length;
  const anpWithoutCoordinates = Math.max(0, anpStations.length - anpWithCoordinates);
  const mapPositionedCount = useMemo(
    () => mapStations.reduce((count, station) => count + Number(Boolean(stationCoordinatePoint(station.lat, station.lng))), 0),
    [mapStations]
  );
  const mapOfficialCount = useMemo(
    () => mapStations.reduce((count, station) => count + Number(station.source === "ANP"), 0),
    [mapStations]
  );
  const mapSecondaryCount = mapStations.length - mapOfficialCount;
  const directoryStats = useMemo(
    () => directoryCards.reduce(
      (stats, item) => {
        if (item.anp) stats.crossed += 1;
        if (stationCoordinatePoint(item.anp?.latitude ?? item.local?.anp?.latitude, item.anp?.longitude ?? item.local?.anp?.longitude)) stats.routable += 1;
        return stats;
      },
      { crossed: 0, routable: 0 }
    ),
    [directoryCards]
  );
  const offlineMapAge = getOfflineMapAgeLabel(getOfflineMapStations().savedAt);
  const cachedSnapshot = getCachedStations(query);
  const stationBase = showSavedOnly ? saved : liveStations.length > 0 ? liveStations : cachedSnapshot?.stations ?? [];
  const stations = userCoords && nearby
    ? [...stationBase].sort((a, b) => {
        const aDistance = haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const bDistance = haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return aDistance - bDistance;
      })
    : stationBase;
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
    if (!staticRuntime || showSavedOnly) return;
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
      cacheStations(query, liveStations as unknown as MobileStation[]);
    }
  }, [liveStations, query]);

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
    if (showSavedOnly || urlQuery === query) return;
    setQuery(urlQuery);
    setInput(urlQuery);
    setShowMap(mapFirst);
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
  }, [urlQuery, showSavedOnly, query, mapFirst]);

  useEffect(() => {
    if (!hasCoordinates) return;
    setUserCoords(null);
    setNearby(false);
    setNearbyAutoAttempted(false);
  }, [hasCoordinates]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#posto-")) return;
    const target = decodeURIComponent(hash.slice("#posto-".length));
    if (!target) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById("posto-" + encodeURIComponent(target));
      if (!element) return;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      element.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [directoryCards.length, directorySearch, location]);

  useEffect(() => {
    setLocalVisibleCount(12);
    setDirectoryVisibleCount(24);
  }, [query, neighborhoodFilter, brandFilter, addressOnly, verifiedOnly, mappedOnly]);

  useEffect(() => {
    setDirectoryVisibleCount(24);
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

  const applyStationSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return false;
    rememberIntent("stations");
    rememberSearch(trimmed);
    vibration();
    setInput(trimmed);
    setQuery(trimmed);
    setDirectorySearch("");
    setShowMap(false);
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setMappedOnly(false);
    setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(trimmed));
    return true;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applyStationSearch(input)) {
      toast.error("Digite uma cidade, bairro, endereço ou nome de posto.");
    }
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
        const coords = coarsenCoordinatePoint(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          3,
        );
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
        setLocation(appUrl("/postos") + "?q=postos&perto=1");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    if (!nearbyRequested || nearbyAutoAttempted || userCoords || locating) return;
    setNearbyAutoAttempted(true);
    useNearby();
  }, [nearbyRequested, nearbyAutoAttempted, userCoords, locating]);

  const savePointsOffline = () => {
    if (!mapStations.length) {
      toast.message("Ainda não há coordenadas suficientes para salvar os pontos.");
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
    toast.message(saved ? `Pontos salvos neste aparelho · ${normalized.length} pontos` : "Não foi possível gravar os pontos locais.");
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
    if (result.error) { toast.message("Não foi possível guardar o favorito. Confira o espaço e as permissões do navegador."); return; }
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
      const url =
        provider === "organic"
          ? urls.organic ?? urls.google
          : provider === "waze"
            ? urls.waze
            : provider === "apple"
              ? urls.apple
              : urls.google;
      openExternalUrl(url);
      return;
    }
    const search = [station.name, station.address].filter(Boolean).join(", ");
    openExternalUrl(
      provider === "organic"
        ? buildOrganicMapsSearchUrl(search)
        : buildGoogleMapsSearchUrl(search)
    );
  };

  const shareCurrent = async () => {
    try {
      const url = window.location.origin + appUrl("/postos") + "?q=" + encodeURIComponent(query);
      await shareText("Postos em " + query + " · consulta do Trajeto", url, "Trajeto · postos");
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) toast.error("Não foi possível compartilhar. Tente novamente.");
    }
  };

  const openSaved = () => {
    rememberIntent("saved");
    setLocation(appUrl("/postos") + "?salvos=1");
  };

  return (
    <main className="visual-shell min-h-[100dvh] bg-background pb-28 text-foreground md:pb-12">
      <div className="container min-w-0 max-w-5xl overflow-x-clip pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.17em] text-accent">Postos</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">{showSavedOnly ? "Seus salvos." : "Encontre uma parada."}</h1>
          </div>
          <span className={"status-pill " + (online ? "border-primary/20 text-primary" : "border-warning/25 text-warning")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!showSavedOnly && (
          <section className="premium-card mt-5 rounded-[1.6rem] border border-border/15 bg-card p-4 sm:p-5">
            <form onSubmit={submit} role="search">
              <label className="block text-xs font-black uppercase tracking-[.14em] text-muted-foreground" htmlFor="station-search">Buscar postos</label>
              <div className="premium-panel mt-2 flex min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-background px-3">
                <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <input
                  id="station-search"
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  autoComplete="street-address"
                  enterKeyHint="search"
                  aria-describedby="station-search-hint"
                  className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  placeholder="Nome, bairro, endereço ou BR-070"
                />
                {input && (
                  <button type="button" onClick={() => setInput("")} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted/[.04] hover:text-foreground" aria-label="Limpar campo de busca">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
                <button type="submit" className="task-action task-action-primary min-h-11 shrink-0 px-3" aria-label="Buscar postos">
                  <span className="hidden sm:inline">Buscar</span><ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p id="station-search-hint" className="mt-2 text-xs leading-relaxed text-muted-foreground">Pesquise por nome, bairro, endereço ou corredor. Os filtros abaixo refinam a lista sem apagar sua busca.</p>
            </form>
            <QuickFilterChips
              label="Bairros e eixos rápidos"
              options={[
                { label: "Águas Lindas", value: "Águas Lindas de Goiás, GO" },
                { label: "BR-070", value: "BR-070" },
                { label: "Jardim Brasília", value: "Jardim Brasília" },
                { label: "Parque da Barragem", value: "Parque da Barragem" },
                { label: "Centro", value: "Centro, Águas Lindas de Goiás" },
                { label: "Rodoviária", value: "Rodoviária" },
              ]}
              value={input}
              onPick={value => void applyStationSearch(value)}
              className="mt-3"
            />

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Ações rápidas de postos">
              <button type="button" onClick={useNearby} disabled={locating} className="task-action task-action-primary shrink-0 disabled:opacity-40">
                <Navigation className="size-3.5" /> {locating ? "GPS…" : "Perto de mim"}
              </button>
              {!staticRuntime && (
                <button type="button" onClick={() => setOnlyOpen(current => !current)} aria-pressed={onlyOpen} className={onlyOpen ? "task-action shrink-0 border border-accent/40 bg-accent/15 text-accent" : "task-action task-action-secondary shrink-0"}>
                  <CircleCheck className="mr-1 inline size-3.5" /> Abertos agora
                </button>
              )}
              <button type="button" onClick={() => void shareCurrent()} className="task-action task-action-secondary shrink-0"><Share2 className="mr-1 inline size-3.5" /> Compartilhar</button>
              <button type="button" onClick={() => setShowMap(value => !value)} aria-pressed={showMap} aria-label={showMap ? "Ocultar mapa" : "Abrir mapa"} className="task-action task-action-secondary"><MapIcon className="mr-1 inline size-3.5" />Mapa</button>
              <button type="button" onClick={openSaved} className="task-action task-action-secondary shrink-0"><Heart className="mr-1 inline size-3.5" /> Salvos {saved.length || ""}</button>
            </div>

            {recentSearches.length > 0 && (
              <div className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1">
                {recentSearches.slice(0, 4).map(item => (
                  <button key={item} type="button" onClick={() => {
                  setInput(item);
                  setQuery(item);
                  setDirectorySearch("");
                  setOnlyOpen(false);
                  setNeighborhoodFilter("all");
                  setBrandFilter("all");
                  setAddressOnly(false);
                  setVerifiedOnly(false);
                  setMappedOnly(false);
                  setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(item));
                }} className="max-w-[12rem] min-h-11 shrink-0 truncate rounded-full border border-border/10 px-3 py-2 text-xs font-bold text-muted-foreground">{item}</button>
                ))}
              </div>
            )}
          </section>
        )}

        {mapFirst && showMap && !showSavedOnly && (staticRuntime || broadAguasLindasQuery) && mapStations.length > 0 && (
          <section id="aguas-lindas-map" className="premium-card scroll-mt-24 mt-5 overflow-hidden rounded-[1.7rem] border border-border/15 bg-card" aria-labelledby="map-first-title">
            <div className="flex items-center justify-between gap-3 border-b border-border/10 px-4 py-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-primary">Mapa principal</p>
                <h2 id="map-first-title" className="mt-1 text-lg font-black">Postos de Águas Lindas</h2>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full border border-border/10 bg-muted/[.03] px-2.5 py-1 text-xs font-black text-muted-foreground">{mapStations.length} referências</span>
              </div>
            </div>
            <p className="px-4 py-2 text-xs text-muted-foreground">{mapPositionedCount} posicionados · {mapStations.length - mapPositionedCount} sem coordenada</p>
            <div className="relative">
              <StationMap stations={mapStations} showTraffic={online} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border/10 p-3">
              <button type="button" onClick={useNearby} disabled={locating} className="min-h-11 rounded-xl bg-primary text-xs font-black text-background">Mais perto</button>
              <button type="button" onClick={() => document.getElementById("complete-stations")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-h-11 rounded-xl border border-border/10 text-xs font-black text-foreground/70">Ver fichas</button>
            </div>
          </section>
        )}

                {!showSavedOnly && !mapFirst && showMap && (staticRuntime || broadAguasLindasQuery) && mapStations.length > 0 && (
                  <section id="aguas-lindas-map" className="scroll-mt-24 mt-3 overflow-hidden rounded-[1.35rem] border border-border/10 bg-background" aria-label="Mapa de todos os postos de Águas Lindas">
                    <div className="relative">
                      <StationMap stations={mapStations} showTraffic={online} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/10 px-3 py-2.5 text-xs text-muted-foreground">
                      <span>{mapPositionedCount} posicionados · {mapStations.length - mapPositionedCount} sem coordenada · {mapOfficialCount} ANP + {mapSecondaryCount} referências de mapa</span>
                      <span>{online ? "online · tráfego quando disponível" : "offline · coordenadas salvas no aparelho"}</span>
                      <span>{anpWithoutCoordinates > 0 ? String(anpWithoutCoordinates) + " cadastro(s) ANP sem coordenada · ficha continua disponível" : "cobertura coordenada ANP completa nesta consulta"}</span>
                    </div>
                  </section>
                )}


        {(broadAguasLindasQuery || staticRuntime) && !showSavedOnly && (
          <section id="complete-stations" className="premium-card scroll-mt-24 mt-5 rounded-[1.6rem] border border-primary/20 bg-card p-4 sm:p-5" aria-labelledby="complete-stations-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-primary">Diretório completo</p>
                <h2 id="complete-stations-title" className="mt-1 text-xl font-black">Escolha onde abastecer</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Busque pelo nome ou bairro, compare os preços disponíveis e escolha sua rota. Horários e preços devem ser confirmados antes de sair.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex rounded-full border border-primary/15 bg-primary/[.04] px-2 py-1 text-xs font-black text-primary">{directoryCards.length} fichas</span>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{anpStations.length} registros ANP</p>
              </div>
            </div>

            <details className="mt-3 rounded-xl border border-border/15 px-3">
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-foreground/70">Preços médios da cidade e dados do catálogo</summary>
            <div className="mt-3 rounded-2xl border border-border/10 bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.12em] text-muted-foreground">Referência municipal de preços</p>
                  <p className="mt-1 text-xs text-muted-foreground">{AGUAS_LINDAS_PRICE_REFERENCE.period} · ANP · não é preço individual em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={savePointsOffline} className="min-h-11 rounded-lg border border-border/10 bg-muted/[.03] px-2.5 text-xs font-black text-muted-foreground">Salvar pontos offline</button>
                  <button type="button" onClick={() => void refreshStationData()} className="min-h-11 rounded-lg border border-accent/15 bg-accent/[.03] px-2.5 text-xs font-black text-accent">Atualizar</button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>Gasolina <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gasolineCommon.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Etanol <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.ethanol.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S10 <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS10.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>Diesel S500 <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.dieselS500.average.toFixed(2).replace(".", ",")}/L</strong></span>
                <span>GLP P13 <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.glpP13.average.toFixed(2).replace(".", ",")}</strong></span>
                <span>GNV <strong className="text-foreground/70">R$ {AGUAS_LINDAS_PRICE_REFERENCE.gnv.average.toFixed(2).replace(".", ",")}/m³</strong></span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Base local</p><p className="mt-1 text-lg font-black">{aguasLindasCatalog.length}</p></div>
              <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Cruzados ANP</p><p className="mt-1 text-lg font-black text-accent">{directoryStats.crossed}</p></div>
              <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Com rota por coordenada</p><p className="mt-1 text-lg font-black text-primary">{directoryStats.routable}</p></div>
              <div className="rounded-xl border border-accent/20 bg-accent/[.04] p-3 text-left"><p className="text-xs font-black uppercase tracking-[.1em] text-accent">Offline</p><p className="mt-1 text-sm font-black text-accent">{online ? "cache ativo" : "modo offline"}</p></div>
            </div>

            </details>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <label className="premium-panel flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-border/15 bg-background px-3">
                <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <input type="text" value={directorySearch} onChange={event => setDirectorySearch(event.target.value)} enterKeyHint="search" placeholder="Filtrar por nome, bairro, CNPJ ou bandeira" className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" aria-label="Filtrar diretório de postos" />
                {directorySearch && <button type="button" onClick={() => setDirectorySearch("")} className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted/[.04] hover:text-foreground" aria-label="Limpar filtro do diretório"><X className="size-3.5" aria-hidden="true" /></button>}
              </label>
              <select aria-label="Filtrar por combustível" value={fuelFilter} onChange={event => setFuelFilter(event.target.value as StationFuelFilter)} className="min-h-11 min-w-0 w-full rounded-2xl border border-border/10 bg-background px-3 text-base font-black text-muted-foreground">
                <option value="all">Combustível: todos</option>
                <option value="gasolina-comum">Gasolina comum</option>
                <option value="etanol">Etanol</option>
                <option value="diesel-s10">Diesel S10</option>
                <option value="diesel-s500">Diesel S500</option>
                <option value="glp-p13">GLP P13</option>
                <option value="gnv">GNV</option>
              </select>
              <select aria-label="Ordenar diretório de postos" value={directorySort} onChange={event => setDirectorySort(event.target.value as typeof directorySort)} className="min-h-11 min-w-0 w-full rounded-2xl border border-border/10 bg-background px-3 text-base font-black text-muted-foreground">
                <option value="name">Ordenar: nome</option>
                <option value="price" disabled={!hasIndividualPrices}>Ordenar: menor preço ANP</option>
                <option value="brand">Ordenar: bandeira</option>
                <option value="distance" disabled={!userCoords}>Ordenar: mais perto</option>
              </select>
              <button type="button" onClick={() => { setDirectorySearch(""); setFuelFilter("all"); setDirectorySort(userCoords ? "distance" : "name"); setQuery("postos"); setInput("Águas Lindas de Goiás, GO"); setLocation(appUrl("/postos") + "?q=postos"); }} className="min-h-11 rounded-2xl border border-primary/15 bg-primary/[.04] px-3 text-xs font-black text-primary">{userCoords ? "Mais perto" : "Ver todos"}</button>
            </div>
            <QuickFilterChips
              label="Filtros rápidos do diretório"
              options={[
                { label: "Shell", value: "shell" },
                { label: "Ipiranga", value: "ipiranga" },
                { label: "BR", value: "petrobras" },
                { label: "ZM", value: "zm" },
                { label: "Jardim Brasília", value: "jardim brasilia" },
                { label: "BR-070", value: "br-070" },
              ]}
              value={directorySearch}
              onPick={value => setDirectorySearch(value)}
              className="mt-2"
            />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Combustíveis rápidos">
              {[
                ["all", "Todos"],
                ["gasolina-comum", "Gasolina"],
                ["etanol", "Etanol"],
                ["diesel-s10", "Diesel S10"],
                ["gnv", "GNV"],
              ].map(([value, label]) => <button key={value} type="button" aria-pressed={fuelFilter === value} onClick={() => setFuelFilter(value as StationFuelFilter)} className={"min-h-11 shrink-0 rounded-full border px-3 text-xs font-black " + (fuelFilter === value ? "border-primary/45 bg-primary/12 text-primary" : "border-border/15 bg-muted/[.03] text-foreground/70")}>{label}</button>)}
            </div>
            {!hasIndividualPrices && <p className="mt-2 text-xs leading-relaxed text-warning">Preço individual ANP indisponível nesta coleta · ordenação por preço desativada.</p>}
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground" role="status" aria-live="polite">
              <span>{directoryCardsFiltered.length} de {directoryCards.length} fichas visíveis · {anpStations.length} ANP</span>
              <span>{userCoords ? "distância calculada neste aparelho · GPS não enviado para o catálogo público" : "lista sem exigir localização"}</span>
            </div>

            {!directoryCardsFiltered.length && <div className="mt-4 rounded-2xl border border-border/15 bg-muted/[.03] p-4" role="status">
              <p className="font-bold">Nenhum posto encontrado com esses filtros.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outro nome, bairro ou combustível.</p>
              <button type="button" onClick={() => { setDirectorySearch(""); setFuelFilter("all"); setInput("Águas Lindas de Goiás, GO"); setQuery("postos"); setLocation(appUrl("/postos") + "?q=postos"); }} className="mt-3 min-h-11 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">Ver todos os postos</button>
            </div>}
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
                    const point = stationCoordinatePoint(item.anp?.latitude ?? item.local?.anp?.latitude, item.anp?.longitude ?? item.local?.anp?.longitude);
                    return point ? haversineKm(userCoords.lat, userCoords.lng, point.lat, point.lng) : null;
                  })()}
                  onToggleSaved={stationCoordinatePoint(item.anp?.latitude ?? item.local?.anp?.latitude, item.anp?.longitude ?? item.local?.anp?.longitude) ? () => toggleDirectorySaved(item.local, item.anp) : undefined}
                />
              ))}
            </div>

            {directoryVisibleCount < directoryCardsFiltered.length && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(current => Math.min(current + 24, directoryCardsFiltered.length))}
                  className="min-h-12 rounded-2xl border border-border/10 bg-muted/[.025] text-xs font-black text-muted-foreground transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar mais {Math.min(24, directoryCardsFiltered.length - directoryVisibleCount)} postos
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryVisibleCount(directoryCardsFiltered.length)}
                  className="min-h-12 rounded-2xl border border-primary/15 bg-primary/[.04] text-xs font-black text-primary transition-transform duration-200 active:scale-[.99]"
                >
                  Mostrar todos os {directoryCardsFiltered.length}
                </button>
              </div>
            )}

            {directoryVisibleCount >= directoryCardsFiltered.length && directoryCardsFiltered.length > 16 && (
              <button
                type="button"
                onClick={() => setDirectoryVisibleCount(24)}
                className="mt-2 min-h-11 w-full text-sm font-bold text-muted-foreground"
              >
                Mostrar apenas os primeiros 24
              </button>
            )}

            <div className="mt-4 rounded-2xl border border-border/10 bg-muted/[.02] p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-muted-foreground">Rota:</strong> o Trajeto envia o destino ao provedor escolhido. Google Maps, Waze e Apple Maps calculam a rota, trânsito e instruções de navegação. O site não inventa distância ou tempo quando não possui um motor de roteamento próprio.
            </div>
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <details className="mt-5 rounded-[1.6rem] border border-accent/20 bg-card p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="public-stations-title">
            <summary className="min-h-11 cursor-pointer text-sm font-bold text-foreground/80">Fontes e referências adicionais</summary>
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-accent">Modo público</p>
                <h2 id="public-stations-title" className="mt-1 text-lg font-black">Como os dados são conferidos.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Os cadastros locais e da ANP ficam disponíveis no aparelho. Referências de mapas não confirmam autorização, horário ou preço atual.</p>
              </div>
            </div>
            {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.length > 0 && (
              <div className="mt-3 rounded-xl border border-warning/20 bg-warning/[.04] p-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-warning">Descobertas ainda não conciliadas:</strong> {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.length} referências de estabelecimentos apareceram em mapas. Elas são exibidas para auditoria, mas não são somadas automaticamente à base cadastral até haver identificação confiável por CNPJ/endereço.
                <div className="mt-2 grid gap-2">
                  {AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.map(item => (
                    <div key={item.displayName + item.address} className="rounded-xl border border-border/10 bg-background/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-foreground">{item.displayName}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-warning/20 px-2 py-1 text-xs font-black text-warning">mapa</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                        <span>Telefone: {item.phone ?? "não informado"}</span>
                        <span>Horário: {item.hours ?? "não informado"}</span>
                        <span>Avaliação: {item.rating ?? "—"}{item.reviews != null ? " · " + item.reviews + " avaliações" : ""}</span>
                        <span className="col-span-2 sm:col-span-1">{item.note}</span>
                      </div>
                      <button type="button" onClick={() => openExternalUrl(buildGoogleMapsSearchUrl(item.displayName + ", " + item.address))} className="mt-3 min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-background">Abrir no Google Maps</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => openExternalUrl(buildGoogleMapsSearchUrl(query))} className="min-h-12 rounded-xl bg-primary px-3 text-xs font-black text-background">Pesquisar no Google Maps</button>
              <button type="button" onClick={useNearby} disabled={locating || typeof navigator === "undefined" || !navigator.geolocation} className="min-h-12 rounded-xl border border-accent/25 bg-accent/[.05] px-3 text-xs font-black text-accent disabled:opacity-50">Postos perto de mim</button>
            </div>
            {!online && (
              <p className="mt-2 text-xs leading-relaxed text-primary">
                “Perto de mim” continua funcionando offline com o GPS do aparelho e o catálogo local. Sua posição não é enviada ao diretório.
              </p>
            )}
          </details>
        )}

        {!showSavedOnly && broadAguasLindasQuery && (
          <section className="mt-5 rounded-[1.6rem] border border-accent/20 bg-card p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="anp-directory-title">
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-bold text-foreground">
                Sobre os dados · fontes e exportação
                <span className="text-xs font-normal text-muted-foreground">ANP</span>
              </summary>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.15em] text-accent">Fonte oficial ANP</p>
                <h2 id="anp-directory-title" className="mt-1 text-xl font-black">Cadastro técnico dos postos</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">A API da ANP fornece autorização, CNPJ, endereço, distribuidora, produtos, tancagem, bicos, coordenadas, validação geográfica, situação constatada e status SIGAF.</p>
              </div>
              <span className="shrink-0 rounded-full border border-accent/20 bg-accent/[.04] px-2 py-1 text-xs font-black text-accent">{anpStations.length || "—"} postos</span>
            </div>

            {anpLiveQuery.isLoading && !staticRuntime && <div className="mt-4 rounded-xl border border-border/10 bg-muted/[.02] p-4 text-xs text-muted-foreground">Consultando a base oficial da ANP…</div>}
            {anpLiveQuery.isError && !staticRuntime && <div className="mt-4 rounded-xl border border-warning/20 bg-warning/[.04] p-4 text-xs leading-relaxed text-muted-foreground">A consulta ao serviço da ANP falhou nesta tentativa. A base local continua disponível. <button type="button" onClick={() => void anpLiveQuery.refetch()} className="mt-2 min-h-11 rounded-xl border border-warning/20 px-3 font-black text-warning">Tentar novamente</button></div>}
            {staticRuntime && !anpRows.length && <div className="mt-4 rounded-xl border border-warning/20 bg-warning/[.04] p-4 text-xs leading-relaxed text-muted-foreground">Os dados oficiais não estão disponíveis nesta consulta. Use as fichas locais abaixo e tente atualizar quando estiver conectado.</div>}

            {(anpRows.length > 0 || mapStations.length > 0) && (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/[.03] p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[.12em] text-primary">Mapa de Águas Lindas</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{anpWithCoordinates} de {anpStations.length} postos da ANP possuem coordenadas{anpWithoutCoordinates > 0 ? ` · ${anpWithoutCoordinates} sem coordenadas oficiais nesta resposta` : ""}. {mapSecondaryCount > 0 ? mapSecondaryCount + " referências secundárias também foram agregadas ao mapa." : ""}</p>
                  </div>
                </div>


                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Linhas ANP</p><p className="mt-1 text-lg font-black">{anpRows.length}</p></div>
                  <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">CNPJs</p><p className="mt-1 text-lg font-black">{anpStations.length}</p></div>
                  <div className="rounded-xl border border-border/10 bg-background p-3"><p className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Com coordenadas</p><p className="mt-1 text-lg font-black">{anpStations.filter(item => item.latitude != null && item.longitude != null).length}</p></div>
                  <button type="button" onClick={exportAnpCsv} className="rounded-xl border border-accent/20 bg-accent/[.04] p-3 text-left"><p className="text-xs font-black uppercase tracking-[.1em] text-accent">Dados completos</p><p className="mt-1 text-sm font-black text-accent">Exportar CSV</p></button>
                </div>

                <div className="mt-3 space-y-2">
                  {anpStations.slice(0, 12).map(station => (
                    <details key={station.cnpj} className="rounded-[1.15rem] border border-border/10 bg-background">
                      <summary className="cursor-pointer list-none px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground">{station.razaoSocial ?? "Razão social não informada"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">CNPJ {station.cnpj} · Autorização {station.autorizacao ?? "não informada"}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{station.endereco ?? "Endereço não informado"}{station.bairro ? " · " + station.bairro : ""}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-border/10 px-2 py-1 text-xs font-black text-muted-foreground">{station.products.length} produto(s)</span>
                        </div>
                      </summary>
                      <div className="space-y-2 border-t border-border/10 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                        <p><strong className="text-muted-foreground">Código SIMP:</strong> {station.codigoSimp ?? "não informado"} · <strong className="text-muted-foreground">CEP:</strong> {station.cep ?? "não informado"} · <strong className="text-muted-foreground">Município/UF:</strong> {station.municipio ?? "—"}/{station.uf ?? "—"}</p>
                        <p><strong className="text-muted-foreground">Distribuidora/bandeira:</strong> {station.distribuidora ?? "bandeira branca/não informada"} · <strong className="text-muted-foreground">Vinculação:</strong> {station.dataVinculacao ?? "não informada"}</p>
                        <p><strong className="text-muted-foreground">Publicação:</strong> {station.dataPublicacao ?? "não informada"} · <strong className="text-muted-foreground">Classe:</strong> {station.products.map(item => item.classe).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).join(" · ") || "não informada"}</p>
                        <p><strong className="text-muted-foreground">Situação:</strong> {station.situacaoConstatada ?? "não informada"} · <strong className="text-muted-foreground">SIGAF:</strong> {station.statusSigaf || "sem ocorrência informada"} </p>
                        <p><strong className="text-muted-foreground">Origem:</strong> {station.origemInformacao ?? "não informada"} · <strong className="text-muted-foreground">Obtido em:</strong> {station.dataObtencao ?? "não informado"}</p>
                        <div className="rounded-xl border border-border/10 bg-muted/[.02] p-3">
                          <p className="text-xs font-black uppercase tracking-[.12em] text-accent">Produtos, tancagem e bicos</p>
                          {station.products.map((item, index) => <p key={item.produto + "-" + index} className="mt-1">{item.produto ?? "Produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem ?? ""} · bicos {item.quantidadeBicos ?? "—"}{item.classe ? " · " + item.classe : ""}</p>)}
                        </div>
                        <p><strong className="text-muted-foreground">Geografia:</strong> {station.latitude != null && station.longitude != null ? station.latitude.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) + ", " + station.longitude.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) : "sem coordenadas"}{station.validacao ? " · validação: " + station.validacao : ""}{station.estimativaAcuraciaM != null ? " · acurácia: " + station.estimativaAcuraciaM.toLocaleString("pt-BR") + " m" : ""}</p>
                        {station.latitude != null && station.longitude != null && <button type="button" onClick={() => openExternalUrl(buildGoogleMapsDirectionsUrl("", station.latitude + "," + station.longitude, "driving", true))} className="min-h-11 rounded-xl border border-primary/20 px-3 text-xs font-black text-primary">Abrir coordenadas no Google Maps</button>}
                        {station.observacao && <p><strong className="text-muted-foreground">Observação:</strong> {station.observacao}</p>}
                      </div>
                    </details>
                  ))}
                </div>
                {anpStations.length > 12 && <p className="mt-3 text-center text-xs text-muted-foreground">Mostrando os primeiros 12 nesta visualização. O CSV contém todas as linhas retornadas pela ANP.</p>}
              </>
            )}

            {!anpRows.length && mapStations.length > 0 && (
              <section id="aguas-lindas-map-offline" className="scroll-mt-24 mt-4 overflow-hidden rounded-[1.35rem] border border-warning/20 bg-background" aria-label="Mapa offline de referências dos postos">
                <div className="border-b border-border/10 px-3.5 py-3">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-warning">Mapa salvo no aparelho</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">A ANP não respondeu nesta sessão. As coordenadas de consultas anteriores continuam disponíveis sem conexão. A navegação em aplicativos externos pode exigir internet.</p>
                </div>
                <div className="relative">
                  <StationMap stations={mapStations} showTraffic={false} />
                </div>
                <div className="border-t border-border/10 px-3 py-2.5 text-xs text-muted-foreground">{mapStations.length} referências armazenadas · {offlineMapAge}.</div>
              </section>
            )}

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Fonte: API de Revendedores da ANP. Cache de mapa: {offlineMapAge}. Última consulta oficial: {(anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) ? new Date((anpLiveQuery.data?.retrievedAt || staticAnpRetrievedAt) as string).toLocaleString("pt-BR") : "ainda não registrada"}.</p>
            </details>
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-border/10 bg-muted/[.02] p-3 text-xs leading-relaxed text-muted-foreground">
            Fonte e natureza do dado: cadastro empresarial público e referências públicas locais. A ANP mantém o cadastro oficial de revendedores autorizados; preços e situação operacional podem mudar e devem ser verificados antes da viagem.
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-border/10 bg-muted/[.02] p-3 text-xs leading-relaxed text-muted-foreground">
            <p><strong className="text-muted-foreground">Confiabilidade:</strong> cadastro ativo é uma informação cadastral; não confirma funcionamento neste momento, preço atual ou coordenada exata.</p>
            <p className="mt-1">A ANP disponibiliza cadastro oficial e também uma API de revendedores com endereço, produtos, distribuidor, tancagem, bicos, situação de interdição e coordenadas quando disponíveis.</p>
          </section>
        )}

        {nearby && (
          <section className="mt-3 flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent/[.04] p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
            <div><p className="text-xs font-black">Busca por proximidade</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A localização foi usada para ordenar a consulta; suas coordenadas não são exibidas publicamente pelo Trajeto.</p></div>
          </section>
        )}

        {stationPages.isLoading && !showSavedOnly && (
          <section className="mt-5 grid gap-2" role="status" aria-live="polite">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl border border-border/10 bg-card" />)}
          </section>
        )}

        {stationPages.isError && !stations.length && !showSavedOnly && (
          <section className="mt-5 rounded-3xl border border-warning/20 bg-warning/[.04] p-5">
            <p className="text-sm font-black">A consulta não respondeu.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O objetivo continua disponível no Google Maps enquanto o serviço do Trajeto não responde.</p>
            <button type="button" onClick={() => openExternalUrl(buildGoogleMapsSearchUrl(query))} className="mt-4 min-h-11 rounded-xl bg-primary px-4 text-xs font-black text-background">Abrir no Google Maps</button>
          </section>
        )}

        {(showSavedOnly || (!staticRuntime && stations.length > 0)) && (
          <>
            <section className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-muted-foreground">{usingCache ? "Cache local" : searchedAt ? "Consulta atual" : "Neste aparelho"}</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">{visibleStations.length} resultado(s)</h2>
                <p className="mt-1 text-xs text-muted-foreground">{usingCache ? "Salvos em " + cachedAt : searchedAt ? "Atualizado em " + searchedAt : "Favoritos locais"}</p>
              </div>
              <div className="flex gap-2">
                {showSavedOnly && <button type="button" onClick={() => setShowMap(current => !current)} disabled={!visibleStations.length} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border/10 bg-muted/[.03] text-muted-foreground" aria-label={showMap ? "Ocultar mapa" : "Abrir mapa"}><MapIcon className="size-4" /></button>}
                {compareIds.length > 0 && <button type="button" onClick={() => document.getElementById("station-compare")?.scrollIntoView({ behavior: "smooth" })} className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-background">{compareIds.length} comparar</button>}
              </div>
            </section>

            {showMap && (showSavedOnly || !broadAguasLindasQuery) && visibleStations.length > 0 && (
              <section className="mt-3 overflow-hidden rounded-3xl border border-border/10 bg-card">
                <div className="relative"><StationMap stations={visibleStations} /></div>
              </section>
            )}

            <section className="mt-3 space-y-2" aria-label="Resultados de postos">
              {visibleStations.map((station, index) => {
                const isSaved = saved.some(item => item.placeId === station.placeId);
                const isCompared = compareIds.includes(station.placeId);
                return (
                  <article key={station.placeId} className={"rounded-[1.35rem] border bg-card p-4 " + (isCompared ? "border-accent/50" : "border-border/10")}>
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-background"><Fuel className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="break-words text-base font-black">{station.name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{inferredBrand(station.name)} · {station.distanceLabel || "distância indisponível"}</p></div>
                          {station.isOpen === true && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-black text-primary">aberto</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{station.address}</p>
                      </div>
                    </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => navigateTo(station)} className="col-span-2 min-h-11 rounded-xl bg-primary px-2 text-sm font-black text-background"><Navigation className="mr-1 inline size-3.5" />Navegar</button>
                      <button type="button" onClick={() => toggleSaved(station)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isSaved ? "border-destructive/30 bg-destructive/[.06] text-destructive" : "border-border/10 text-muted-foreground")} aria-label={isSaved ? "Remover dos salvos" : "Salvar posto"}><Heart className="size-4" fill={isSaved ? "currentColor" : "none"} /></button>
                      <button type="button" onClick={() => toggleCompare(station.placeId)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isCompared ? "border-accent/40 bg-accent/[.08] text-accent" : "border-border/10 text-muted-foreground")} aria-label={isCompared ? "Remover da comparação" : "Comparar posto"}><SlidersHorizontal className="size-4" /></button>
                    </div>
                    {index === 0 && <p className="mt-2 text-center text-xs font-bold text-muted-foreground">Ações principais ficam sempre no alcance do polegar.</p>}
                  </article>
                );
              })}
            </section>

            {stationPages.hasNextPage && (
              <button type="button" onClick={() => void stationPages.fetchNextPage()} disabled={stationPages.isFetchingNextPage} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border/10 bg-muted/[.025] text-xs font-black text-muted-foreground disabled:opacity-40">
                {stationPages.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                {stationPages.isFetchingNextPage ? "Carregando mais postos…" : "Mostrar mais postos"}
              </button>
            )}

            {compared.length > 0 && (
              <section id="station-compare" className="mt-5 rounded-[1.5rem] border border-accent/20 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-[.15em] text-accent">Comparação</p><h3 className="mt-1 text-xl font-black">{compared.length} parada(s)</h3></div>
                  <button type="button" onClick={() => setCompareIds([])} className="grid size-9 place-items-center rounded-lg border border-border/10 text-muted-foreground" aria-label="Limpar comparação"><X className="size-4" /></button>
                </div>
                <div className="mt-3 space-y-2">
                  {compared.map(item => <button key={item.placeId} type="button" onClick={() => navigateTo(item)} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-background px-3 text-left"><span className="min-w-0 truncate text-xs font-black">{item.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{item.distanceLabel || "sem distância"}</span></span><ChevronRight className="size-4 shrink-0 text-accent" /></button>)}
                </div>
              </section>
            )}

            <section className="mt-4 rounded-3xl border border-border/10 bg-muted/[.025] p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Como ler estes dados</span><BadgeInfo className="size-4 text-muted-foreground" /></summary>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>Endereço, horário, telefone e distância dependem da consulta atual do provedor de mapas.</p>
                  <p>Referências de preço aparecem separadas e nunca são tratadas como preço em tempo real.</p>
                  <p>Um item salvo neste aparelho funciona como atalho local e não precisa de conta.</p>
                </div>
              </details>
            </section>
          </>
        )}

        {!stations.length && !stationPages.isLoading && (
          <section className="mt-5 rounded-3xl border border-border/10 bg-card p-5 text-center">
            <Fuel className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-black">{showSavedOnly ? "Nenhum posto salvo." : "Pesquise uma região para começar."}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O Trajeto mostra resultados encontrados na consulta atual e separa as referências oficiais quando disponíveis.</p>
          </section>
        )}

        <footer className="mt-10 pb-3 text-center text-xs leading-relaxed text-muted-foreground">
          O Trajeto organiza os resultados; a navegação é aberta no provedor escolhido.
        </footer>
      </div>
    </main>
  );
}
