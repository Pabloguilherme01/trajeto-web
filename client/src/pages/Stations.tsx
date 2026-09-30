import { Fuel, Heart, Map as MapIcon, Navigation, Search, Share2, SlidersHorizontal, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { appUrl } from "@/lib/appUrl";
import { buildGoogleMapsSearchUrl, buildWazeNavigationUrl, buildAppleMapsDirectionsUrl, getPreferredNavigationProvider, openNavigation, shareText, vibration } from "@/lib/mobileTools";
import { getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";
import { groupAnpFuelRows } from "@shared/anpRevendedores";
import { loadAguasLindasAnpPrices, indexAnpPricesByCnpj, type AnpPriceSnapshot } from "@/lib/anpPrices";
import { buildDirectoryCards, getDirectoryCoordinates, type FuelFilter } from "@/lib/stationDirectoryModel";
import { getDistanceKm, type Coordinates } from "@/lib/stationDirectorySearch";
import { useStationDirectory, type StationDirectoryDistanceFilter, type StationDirectoryFilters, type StationDirectorySort } from "@/hooks/useStationDirectory";
import StationFiltersSheet from "@/components/StationFiltersSheet";
import StationDirectoryCard from "@/components/StationDirectoryCard";
import StationCompareSheet from "@/components/StationCompareSheet";
import { StationMap, type StationMapItem } from "@/components/StationMap";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { getOfflineMapStations, cacheOfflineMapStations } from "@/lib/stationMapOffline";
import { toast } from "sonner";
import type { AnpStation } from "@shared/anpRevendedores";

function readQuery() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("busca") || "";
}

function readCoordinates(value: string): Coordinates | null {
  const params = new URLSearchParams(value.split("?")[1] ?? "");
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

function formatDate(value?: string | null) {
  if (!value) return "sem data";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState(readQuery);
  const [input, setInput] = useState(readQuery);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(() => readCoordinates(typeof window !== "undefined" ? window.location.search : ""));
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "map");
  const [saved, setSaved] = useState<MobileStation[]>(listMobileStationFavorites);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [priceSnapshot, setPriceSnapshot] = useState<AnpPriceSnapshot | null>(null);
  const [priceState, setPriceState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [filters, setFilters] = useState<StationDirectoryFilters>({
    fuelFilter: "all",
    sort: "name",
    distance: "all",
    neighborhood: "all",
    brand: "all",
    addressOnly: false,
    verifiedOnly: false,
    mappedOnly: false,
    priceOnly: false,
  });

  const params = useMemo(() => new URLSearchParams(location.split("?")[1] ?? ""), [location]);
  const pathname = location.split("?")[0];
  const savedOnly = pathname.endsWith("/salvos") || params.get("salvos") === "1";
  const nearbyMode = Boolean(readCoordinates(location));

  const anpQuery = trpc.stationDirectory.anp.useQuery(
    { municipio: "AGUASLINDASDEGOIAS", uf: "GO" },
    { enabled: !isGitHubPagesRuntime(), retry: 1, staleTime: 15 * 60_000 },
  );

  useEffect(() => {
    setSearch(params.get("busca") || "");
    setInput(params.get("busca") || (params.get("lat") ? "postos próximos" : ""));
    setUserCoords(readCoordinates(location));
    setShowMap(params.get("view") === "map");
  }, [params, location]);

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
    let cancelled = false;
    setPriceState("loading");
    void loadAguasLindasAnpPrices()
      .then(snapshot => {
        if (cancelled) return;
        setPriceSnapshot(snapshot);
        setPriceState(snapshot ? "success" : "error");
      })
      .catch(() => {
        if (!cancelled) setPriceState("error");
      });
    return () => { cancelled = true; };
  }, []);

  const anpStations = useMemo<AnpStation[]>(() => {
    const live = anpQuery.data?.rows ?? [];
    return live.length > 0 ? groupAnpFuelRows(live) : [];
  }, [anpQuery.data?.rows]);

  const directoryCards = useMemo(
    () => buildDirectoryCards(AGUAS_LINDAS_STATIONS, anpStations),
    [anpStations],
  );

  const pricesByCnpj = useMemo(
    () => indexAnpPricesByCnpj(priceSnapshot?.data ?? []),
    [priceSnapshot],
  );

  const directory = useStationDirectory({
    cards: directoryCards,
    pricesByCnpj,
    search,
    userCoords,
    filters: {
      ...filters,
      sort: nearbyMode ? "distance" : filters.sort,
      distance: filters.distance,
    },
  });

  const filterCount =
    Number(filters.fuelFilter !== "all") +
    Number(filters.distance !== "all") +
    Number(filters.neighborhood !== "all") +
    Number(filters.brand !== "all") +
    Number(filters.addressOnly) +
    Number(filters.verifiedOnly) +
    Number(filters.mappedOnly) +
    Number(filters.priceOnly);

  const compareItems = directory.results.filter(item => compareKeys.includes(item.key)).slice(0, 3);

  const mapStations = useMemo<StationMapItem[]>(() => {
    const source = (showMap ? directory.results : directory.results.slice(0, 24)).map(item => {
      const coords = getDirectoryCoordinates(item);
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
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        cnpj: item.anp?.cnpj || item.local?.cnpj || null,
        brand: item.anp?.distribuidora || item.local?.brand || null,
        source: item.anp ? "ANP" as const : "local" as const,
      } satisfies StationMapItem;
    });

    const offline = getOfflineMapStations().stations;
    const seen = new Set<string>();
    return [...source, ...offline].filter(item => {
      const key = item.cnpj ? "cnpj:" + item.cnpj : item.id || item.placeId || item.name + "|" + item.address;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [directory.results, showMap]);

  const resetFilters = () => {
    setFilters({
      fuelFilter: "all",
      sort: nearbyMode ? "distance" : "name",
      distance: "all",
      neighborhood: "all",
      brand: "all",
      addressOnly: false,
      verifiedOnly: false,
      mappedOnly: false,
      priceOnly: false,
    });
  };

  useEffect(() => {
    setVisibleCount(24);
  }, [search, filters]);

  useEffect(() => {
    document.title = savedOnly ? "Postos salvos · Trajeto" : search ? "Postos · " + search + " · Trajeto" : "Postos · Trajeto";
  }, [search, savedOnly]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (value && value.length < 2) return;
    rememberIntent("stations");
    if (value) rememberSearch(value);
    vibration();
    setSearch(value);
    setUserCoords(null);
    setFilters(current => ({ ...current, sort: "name", distance: "all" }));
    setLocation(appUrl("/postos") + (value ? "?q=postos&busca=" + encodeURIComponent(value) : "?q=postos"));
  };

  const useNearby = () => {
    if (!navigator.geolocation || locating) {
      toast.error("Este navegador não disponibilizou a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocating(false);
        setUserCoords(coords);
        setSearch("");
        setInput("postos próximos");
        setFilters(current => ({ ...current, sort: "distance", distance: "all" }));
        rememberIntent("nearby");
        vibration(18);
        setLocation(appUrl("/postos") + "?q=postos&lat=" + coords.lat + "&lng=" + coords.lng);
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const toggleCompare = (key: string) => {
    setCompareKeys(current => {
      if (current.includes(key)) return current.filter(item => item !== key);
      if (current.length >= 3) {
        toast.message("A comparação aceita no máximo 3 postos.");
        return current;
      }
      return [...current, key];
    });
    vibration();
  };

  const toggleSaved = (item: (typeof directoryCards)[number]) => {
    const coords = getDirectoryCoordinates(item);
    if (!coords) {
      toast.message("Este posto ainda não possui coordenada consolidada para salvar.");
      return;
    }
    const station: MobileStation = {
      placeId: "aguas-lindas:" + item.key,
      name: item.local?.displayName || item.anp?.razaoSocial || "Posto",
      address: [
        item.anp?.endereco || item.local?.address,
        item.anp?.bairro || item.local?.neighborhood,
        item.anp?.municipio || "Águas Lindas de Goiás",
        item.anp?.uf || "GO",
      ].filter(Boolean).join(", "),
      lat: coords.lat,
      lng: coords.lng,
      phone: item.local?.mapData?.phone ?? null,
      website: null,
      openingHours: item.local?.mapData?.hours ? [item.local.mapData.hours] : [],
      isOpen: item.local?.mapData?.operationalStatus === "open" ? true : item.local?.mapData?.operationalStatus === "closed" ? false : null,
    };
    const result = toggleMobileStationFavorite(station);
    setSaved(result.stations);
    vibration();
    toast.message(result.saved ? "Posto salvo neste aparelho." : "Posto removido dos salvos.");
  };

  const saveMapOffline = () => {
    const normalized = mapStations.filter(
      (station): station is StationMapItem & { id: string; lat: number; lng: number } =>
        typeof station.id === "string" && typeof station.lat === "number" && Number.isFinite(station.lat) &&
        typeof station.lng === "number" && Number.isFinite(station.lng) &&
        station.source !== "Google",
    );
    if (!normalized.length) {
      toast.message("Ainda não há coordenadas oficiais/locais suficientes para o mapa offline.");
      return;
    }
    cacheOfflineMapStations(normalized);
    toast.message("Mapa local salvo neste aparelho.");
  };

  const navigateItem = (key: string) => {
    const item = directoryCards.find(card => card.key === key);
    if (!item) return;
    const coords = getDirectoryCoordinates(item);
    const address = [
      item.anp?.endereco || item.local?.address,
      item.anp?.bairro || item.local?.neighborhood,
      "Águas Lindas de Goiás",
      "GO",
    ].filter(Boolean).join(", ");
    if (coords) {
      const urls = openNavigation(coords.lat, coords.lng, item.local?.displayName || item.anp?.razaoSocial || "Posto");
      const provider = getPreferredNavigationProvider();
      const url = provider === "waze" ? urls.waze : provider === "apple" ? urls.apple : urls.google;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.open(buildGoogleMapsSearchUrl([item.local?.displayName || item.anp?.razaoSocial, address].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer");
    }
  };

  const shareDirectory = async () => {
    try {
      await shareText(
        search ? "Postos · " + search + " · Trajeto" : "Postos de Águas Lindas · Trajeto",
        window.location.origin + appUrl("/postos") + (search ? "?q=postos&busca=" + encodeURIComponent(search) : "?q=postos"),
        "Trajeto · postos",
      );
    } catch {}
  };

  const recentSearches = getRecentSearches();

  if (savedOnly) {
    const savedItems = saved
      .map(station => directoryCards.find(item => item.key === station.placeId.replace("aguas-lindas:", "")))
      .filter((item): item is (typeof directoryCards)[number] => Boolean(item));

    return (
      <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
        <div className="container max-w-3xl pt-4 sm:pt-8">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Salvos</p>
              <h1 className="mt-1 font-display text-3xl font-black tracking-[-.06em]">Meus postos</h1>
            </div>
            <Heart className="size-5 text-[#FFB7A9]" fill={saved.length ? "currentColor" : "none"} />
          </header>
          <section className="mt-5 grid gap-3">
            {savedItems.length === 0 ? (
              <div className="rounded-[1.4rem] border border-white/8 bg-[#121B22] p-5">
                <p className="text-base font-black">Nenhum posto salvo</p>
                <p className="mt-1 text-sm leading-relaxed text-white/40">Salve postos no aparelho para acessá-los rapidamente, inclusive sem conexão.</p>
                <button type="button" onClick={() => setLocation(appUrl("/postos?q=postos"))} className="mt-4 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">Encontrar postos</button>
              </div>
            ) : savedItems.map((item, index) => (
              <StationDirectoryCard
                key={item.key}
                index={index + 1}
                local={item.local}
                anp={item.anp}
                saved
                prices={pricesByCnpj.get(item.key) ?? []}
                distanceKm={getDistanceKm(userCoords, getDirectoryCoordinates(item))}
                onToggleSaved={() => toggleSaved(item)}
              />
            ))}
          </section>
        </div>
      </main>
    );
  }

  const resultCount = directory.results.length;

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
      <div className="container max-w-4xl pt-4 sm:pt-7">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Encontrar</p>
            <h1 className="mt-1 truncate font-display text-[clamp(2rem,8vw,3rem)] font-black tracking-[-.065em]">
              {nearbyMode ? "Postos perto de você" : search ? "Resultados" : "Postos"}
            </h1>
          </div>
          <span className={"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[0.5rem] font-black " + (online ? "border-[#C7FF3C]/20 text-[#C7FF3C]" : "border-[#FFB86B]/25 text-[#FFCF96]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        <section className="mt-4 rounded-[1.45rem] border border-white/8 bg-[#121B22] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,.2)]">
          <form onSubmit={submit}>
            <label htmlFor="stations-search" className="sr-only">Buscar posto, bairro ou endereço</label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
              <Search className="size-4 shrink-0 text-[#3DE3FF]" />
              <input id="stations-search" value={input} onChange={event => setInput(event.target.value)} autoComplete="street-address" enterKeyHint="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/22" placeholder="Buscar posto, bairro ou endereço" />
              {input && <button type="button" onClick={() => { setInput(""); setSearch(""); setLocation(appUrl("/postos?q=postos")); }} className="grid size-8 place-items-center rounded-lg text-white/30" aria-label="Limpar busca"><X className="size-4" /></button>}
              <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar"><Search className="size-4" /></button>
            </div>
          </form>

          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <button type="button" onClick={useNearby} disabled={locating} className="min-h-11 rounded-xl bg-[#C7FF3C] text-[0.58rem] font-black text-[#0B1014] disabled:opacity-40">
              {locating ? "Localizando…" : <><Navigation className="mr-1 inline size-3.5" /> Perto</>}
            </button>
            <button type="button" onClick={() => { rememberIntent("route"); setLocation(appUrl("/planejar")); }} className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] text-[0.58rem] font-black text-[#C9F7FF]">
              <Navigation className="mr-1 inline size-3.5" /> No caminho
            </button>
            <button type="button" onClick={() => setShowMap(current => !current)} disabled={!mapStations.length} className={"min-h-11 rounded-xl border text-[0.58rem] font-black " + (showMap ? "border-[#3DE3FF]/30 bg-[#3DE3FF]/10 text-[#C9F7FF]" : "border-white/8 bg-white/[.03] text-white/60")}>
              <MapIcon className="mr-1 inline size-3.5" /> Mapa
            </button>
          </div>

          <div className="mobile-scroll-x mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" onClick={() => setFiltersOpen(true)} className={"min-h-9 shrink-0 rounded-full border px-3 text-[0.52rem] font-black " + (filterCount ? "border-[#3DE3FF]/25 bg-[#3DE3FF]/10 text-[#C9F7FF]" : "border-white/8 bg-white/[.025] text-white/50")}>
              <SlidersHorizontal className="mr-1 inline size-3.5" /> Filtros{filterCount ? " " + filterCount : ""}
            </button>
            <button type="button" onClick={() => setFilters(current => ({ ...current, priceOnly: true, sort: "price", fuelFilter: "gasolina-comum" }))} className="min-h-9 shrink-0 rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-3 text-[0.52rem] font-black text-[#D9FF91]"><Fuel className="mr-1 inline size-3" /> Menor preço</button>
            <button type="button" onClick={saveMapOffline} className="min-h-9 shrink-0 rounded-full border border-white/8 bg-white/[.025] px-3 text-[0.52rem] font-bold text-white/45"><WifiOff className="mr-1 inline size-3" /> Offline</button>
            <button type="button" onClick={() => void shareDirectory()} className="min-h-9 shrink-0 rounded-full border border-white/8 bg-white/[.025] px-3 text-[0.52rem] font-bold text-white/45"><Share2 className="mr-1 inline size-3" /> Enviar</button>
          </div>
        </section>

        {recentSearches.length > 0 && !search && (
          <div className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Buscas recentes">
            {recentSearches.slice(0, 6).map(item => (
              <button key={item} type="button" onClick={() => { setInput(item); setSearch(item); rememberSearch(item); setLocation(appUrl("/postos") + "?q=postos&busca=" + encodeURIComponent(item)); }} className="min-h-9 max-w-[12rem] shrink-0 truncate rounded-full border border-white/8 bg-white/[.02] px-3 text-[0.52rem] font-bold text-white/45">
                {item}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.48rem] font-black uppercase tracking-[.15em] text-white/25">Catálogo local</p>
            <h2 className="mt-1 text-lg font-black tracking-[-.03em]">{resultCount} posto(s)</h2>
            <p className="mt-1 text-[0.52rem] text-white/30">
              {directory.verifiedCount} com cadastro ANP · {directory.priceCount} com preço individual · {directory.mappedCount} com coordenada
            </p>
          </div>
          {compareKeys.length > 0 && (
            <button type="button" onClick={() => setCompareOpen(true)} className="min-h-10 shrink-0 rounded-xl bg-[#C7FF3C] px-3 text-[0.55rem] font-black text-[#0B1014]">
              {compareKeys.length} comparar
            </button>
          )}
        </div>

        {priceState === "loading" && (
          <p className="mt-2 text-[0.5rem] font-bold text-white/25" role="status" aria-live="polite">Atualizando preços ANP em segundo plano…</p>
        )}
        {priceState === "error" && (
          <p className="mt-2 rounded-xl border border-[#FFB86B]/15 bg-[#FFB86B]/[.03] px-3 py-2 text-[0.52rem] text-[#FFD59B]">Preço individual ANP não está disponível nesta atualização. O catálogo continua utilizável.</p>
        )}

        {showMap && mapStations.length > 0 && (
          <section className="mt-3 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#121B22]" aria-label="Mapa de postos">
            <div className="h-[min(64vh,560px)]">
              <StationMap stations={mapStations} nearbyCenter={userCoords} />
            </div>
          </section>
        )}

        <StationFiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          fuelOptions={[
            { id: "all" as FuelFilter, label: "Todos" },
            { id: "gasolina-comum" as FuelFilter, label: "Gasolina" },
            { id: "etanol" as FuelFilter, label: "Etanol" },
            { id: "diesel-s10" as FuelFilter, label: "Diesel S10" },
            { id: "diesel-s500" as FuelFilter, label: "Diesel S500" },
            { id: "glp-p13" as FuelFilter, label: "GLP P13" },
            { id: "gnv" as FuelFilter, label: "GNV" },
          ]}
          fuelFilter={filters.fuelFilter}
          setFuelFilter={value => setFilters(current => ({ ...current, fuelFilter: value }))}
          distanceFilter={filters.distance}
          setDistanceFilter={value => setFilters(current => ({ ...current, distance: value as StationDirectoryDistanceFilter }))}
          neighborhoodFilter={filters.neighborhood}
          setNeighborhoodFilter={value => setFilters(current => ({ ...current, neighborhood: value }))}
          brandFilter={filters.brand}
          setBrandFilter={value => setFilters(current => ({ ...current, brand: value }))}
          addressOnly={filters.addressOnly}
          setAddressOnly={value => setFilters(current => ({ ...current, addressOnly: value }))}
          verifiedOnly={filters.verifiedOnly}
          setVerifiedOnly={value => setFilters(current => ({ ...current, verifiedOnly: value }))}
          mappedOnly={filters.mappedOnly}
          setMappedOnly={value => setFilters(current => ({ ...current, mappedOnly: value }))}
          priceOnly={filters.priceOnly}
          setPriceOnly={value => setFilters(current => ({ ...current, priceOnly: value }))}
          neighborhoods={directory.neighborhoods}
          brands={directory.brands}
          priceFilterAvailable={directory.priceCount > 0}
          directoryPriceCount={directory.priceCount}
          verifiedFilterAvailable={directory.verifiedCount > 0}
          hasUserCoords={Boolean(userCoords)}
          onClear={() => { resetFilters(); setFiltersOpen(false); }}
        />

        {resultCount === 0 ? (
          <section className="mt-5 rounded-[1.4rem] border border-white/8 bg-[#121B22] p-5" role="status" aria-live="polite">
            <p className="text-base font-black">{search ? "Nenhum posto encontrado" : "Nenhum posto disponível"}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/40">Ajuste a busca ou limpe os filtros. Dados ausentes continuam ausentes; o Trajeto não inventa preço ou localização.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setInput(""); setSearch(""); resetFilters(); setLocation(appUrl("/postos?q=postos")); }} className="min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-[0.58rem] font-black text-[#0B1014]">Limpar</button>
              <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(search || "postos em Águas Lindas de Goiás"), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 px-4 text-[0.58rem] font-black text-white/60">Abrir mapa externo</button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-3 grid gap-2 lg:grid-cols-2" aria-label="Lista de postos">
              {directory.results.slice(0, visibleCount).map((item, index) => {
                const distance = directory.distanceByKey.get(item.key) ?? null;
                const compared = compareKeys.includes(item.key);
                const savedItem = saved.some(station => station.placeId === "aguas-lindas:" + item.key);
                return (
                  <StationDirectoryCard
                    key={item.key}
                    index={index + 1}
                    local={item.local}
                    anp={item.anp}
                    saved={savedItem}
                    prices={pricesByCnpj.get(item.key) ?? []}
                    distanceKm={distance}
                    onToggleSaved={() => toggleSaved(item)}
                    compared={compared}
                    onToggleCompare={() => toggleCompare(item.key)}
                  />
                );
              })}
            </section>

            {visibleCount < resultCount && (
              <button type="button" onClick={() => setVisibleCount(current => Math.min(current + 24, resultCount))} className="mt-3 min-h-12 w-full rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/60">
                Mostrar mais {Math.min(24, resultCount - visibleCount)}
              </button>
            )}
          </>
        )}

        <details className="mt-4 rounded-2xl border border-white/8 bg-white/[.02]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[0.54rem] font-black text-white/55">
            <span>Dados e procedência</span>
            <span className="text-[0.46rem] text-white/25">ANP + catálogo local</span>
          </summary>
          <div className="border-t border-white/8 p-3 text-[0.55rem] leading-relaxed text-white/35">
            <p>O catálogo local é a base para busca e uso offline. Dados ANP são conciliados por CNPJ quando disponíveis. Google é reservado para mapa, referências e navegação.</p>
            <p className="mt-2">Preço individual mostra produto + data + origem. Um cadastro ANP não significa automaticamente preço de bomba atual ou funcionamento confirmado.</p>
            <p className="mt-2">Último snapshot ANP consultável: {anpQuery.data?.retrievedAt ? formatDate(anpQuery.data.retrievedAt) : "não informado"}.</p>
          </div>
        </details>

        {!online && (
          <div className="mt-4 rounded-2xl border border-[#FFB86B]/15 bg-[#FFB86B]/[.03] p-3 text-[0.55rem] text-white/40">
            Offline: catálogo, filtros, favoritos, comparação e dados já armazenados continuam utilizáveis. Mapa Google, Waze e Apple Maps dependem de conexão.
          </div>
        )}
      </div>

      <StationCompareSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        items={compareItems}
        pricesByCnpj={pricesByCnpj}
        userCoords={userCoords}
      />

      {compareKeys.length > 0 && !compareOpen && (
        <div className="fixed inset-x-0 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-50 px-3 md:bottom-4">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-[#10191F]/95 p-2.5 shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl">
            <div className="min-w-0 flex-1"><p className="text-[0.5rem] font-black uppercase tracking-[.14em] text-white/30">Comparar</p><p className="truncate text-[0.62rem] font-black">{compareKeys.length} posto(s) selecionado(s)</p></div>
            <button type="button" onClick={() => setCompareOpen(true)} className="min-h-10 rounded-xl bg-[#C7FF3C] px-3 text-[0.55rem] font-black text-[#0B1014]">Ver</button>
            <button type="button" onClick={() => setCompareKeys([])} className="grid size-10 place-items-center rounded-xl border border-white/8 text-white/40" aria-label="Limpar comparação"><X className="size-4" /></button>
          </div>
        </div>
      )}
    </main>
  );
}
