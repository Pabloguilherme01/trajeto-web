/** Consulta pública com descoberta contínua, dados oficiais e preferências pessoais opcionais. */
import { StationMap } from "@/components/StationMap";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { openNavigation, vibration } from "@/lib/mobileTools";
import { getEconomyMode, getRecentSearches, rememberSearch } from "@/lib/mobilePreferences";
import { getCachedStations, cacheStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import MobileDataMode from "@/components/MobileDataMode";
import { AUTH_RETURN_KEY } from "@/lib/authReturn";
import { corridorPresets, type CorridorPreset } from "@/lib/corridorPresets";
import { filterAndSortStations, inferredBrand } from "@/lib/stationListControls";
import { nextVisibleStationCount, stationResultsPageSizes, type StationResultsPageSize, visibleStationResults } from "@/lib/stationResultsPager";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BadgeCheck, BadgeInfo, Check, ChevronRight, CircleCheck, Clock3, ExternalLink, Fuel, Globe2, Heart, ListFilter, Loader2, Map, Navigation, Phone, Search, Share2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";

const anpQualityUrl = "https://anpcomvcpostos.anp.gov.br/";
const googleMapsRoute = (placeId: string, name: string) => `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}&query=${encodeURIComponent(name)}`;
const wazeRoute = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
function initialQuery() {
  return new URLSearchParams(window.location.search).get("q") || corridorPresets[0].query;
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const locationParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : {};
  }, [location]);
  const [input, setInput] = useState(initialQuery);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [showMap, setShowMap] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState("all");
  const [hoursFilter, setHoursFilter] = useState<"all" | "open" | "closed" | "unknown">("all");
  const [sortBy, setSortBy] = useState<"distance" | "relevance" | "brand" | "hours">("distance");
  const [decisionPlaceId, setDecisionPlaceId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("station"));
  const [resultsPerView, setResultsPerView] = useState<StationResultsPageSize>(() => getEconomyMode() ? 5 : 10);
  const [visibleResultCount, setVisibleResultCount] = useState(() => getEconomyMode() ? 5 : 10);
  const { isAuthenticated } = useAuth();
  const track = useProductEvents();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const preferencesApplied = useRef(false);
  const automaticRetryUsed = useRef(false);
  const [automaticRetryPending, setAutomaticRetryPending] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [economyMode, setEconomyModeState] = useState(getEconomyMode);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [localFavorites, setLocalFavorites] = useState<MobileStation[]>(listMobileStationFavorites);
  const [cachedStationSnapshot, setCachedStationSnapshot] = useState(() => getCachedStations(initialQuery(), locationParams.lat, locationParams.lng));
  const [showSavedOnly, setShowSavedOnly] = useState(() => new URLSearchParams(window.location.search).get("salvos") === "1");


  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    { query, ...locationParams },
    { enabled: query.trim().length >= 3 && !showSavedOnly, retry: 1, getNextPageParam: lastPage => lastPage.nextCursor ?? undefined },
  );
  const savedPreferences = trpc.personal.stationSearchPreferences.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const savePreferences = trpc.personal.saveStationSearchPreferences.useMutation();
  const paginationWarning = stationPages.data?.pages.at(-1)?.paginationWarning ?? null;

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const current = initialQuery();
    setInput(current);
    setQuery(current);
  }, []);
  
  useEffect(() => {
    const title = query.trim() ? "Postos em " + query.trim() + " · Trajeto" : "Encontrar postos · Trajeto";
    const description = query.trim()
      ? "Encontre postos em " + query.trim() + ", compare distância e desvio e abra a navegação. Dados e fontes identificados pelo Trajeto."
      : "Encontre postos no caminho, compare distância e desvio e abra a navegação.";
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
    const shareUrl = `${window.location.origin}${appUrl("/postos")}?q=${encodeURIComponent(query.trim())}`;
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", shareUrl);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", shareUrl);
  }, [query]);

  useEffect(() => {
    setShowMap(false);
    setCompareIds([]);
    setVisibleResultCount(resultsPerView);
    automaticRetryUsed.current = false;
    setAutomaticRetryPending(false);
  }, [query]);

  useEffect(() => {
    if (!isAuthenticated) preferencesApplied.current = false;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!savedPreferences.data || preferencesApplied.current) return;
    setBrandFilter(savedPreferences.data.mappedBrand);
    setHoursFilter(savedPreferences.data.hoursStatus);
    setSortBy(savedPreferences.data.sortBy);
    const savedResultsPerView = savedPreferences.data.economicMode ? 5 : savedPreferences.data.resultsPerView;
    setResultsPerView(savedResultsPerView);
    setVisibleResultCount(savedResultsPerView);
    preferencesApplied.current = true;
  }, [savedPreferences.data]);

  useEffect(() => {
    if (!paginationWarning || automaticRetryUsed.current || stationPages.isFetchingNextPage) return;
    automaticRetryUsed.current = true;
    setAutomaticRetryPending(true);
    const timeout = window.setTimeout(() => {
      setAutomaticRetryPending(false);
      void stationPages.fetchNextPage();
    }, 2_000);
    return () => window.clearTimeout(timeout);
  }, [paginationWarning, stationPages.isFetchingNextPage, stationPages.fetchNextPage]);

  const navigateToQuery = (value: string, region?: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSearchError("Digite pelo menos 3 caracteres para pesquisar.");
      return;
    }
    setSearchError(null);
    track("station_search", trimmed);
    setInput(trimmed);
    setQuery(trimmed);
    rememberSearch(trimmed);
    setRecentSearches(getRecentSearches());
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (locationParams.lat != null && locationParams.lng != null) {
      params.set("lat", String(locationParams.lat));
      params.set("lng", String(locationParams.lng));
    }
    params.set("q", trimmed);
    setLocation(`${appUrl("/postos")}?${params.toString()}`);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); navigateToQuery(input); };
  const selectCorridor = (preset: CorridorPreset) => navigateToQuery(preset.query, preset.id);

  const liveList = useMemo(() => {
    const seen = new Set<string>();
    return (stationPages.data?.pages.flatMap(page => page.stations) ?? []).filter(station => !seen.has(station.placeId) && (seen.add(station.placeId), true));
  }, [stationPages.data]);
  const list = useMemo(() => showSavedOnly ? localFavorites as typeof liveList : (liveList.length > 0 ? liveList : (cachedStationSnapshot?.stations ?? []) as typeof liveList), [showSavedOnly, localFavorites, liveList, cachedStationSnapshot]);

  useEffect(() => {
    setCachedStationSnapshot(getCachedStations(query, locationParams.lat, locationParams.lng));
  }, [query, locationParams.lat, locationParams.lng]);

  useEffect(() => {
    if (liveList.length > 0) {
      cacheStations(query, liveList as unknown as MobileStation[], locationParams.lat, locationParams.lng);
      setCachedStationSnapshot(getCachedStations(query, locationParams.lat, locationParams.lng));
    }
  }, [liveList, query]);
  const firstPage = stationPages.data?.pages[0];
  const searchedAt = firstPage ? new Date(firstPage.queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  const availableBrands = useMemo(() => Array.from(new Set(list.map(station => inferredBrand(station.name)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [list]);
  const sortedStations = useMemo(() => filterAndSortStations(list, brandFilter, hoursFilter, sortBy), [list, brandFilter, hoursFilter, sortBy]);
  const displayedStations = useMemo(() => visibleStationResults(sortedStations, visibleResultCount), [sortedStations, visibleResultCount]);
  const hasMoreLoadedStations = displayedStations.length < sortedStations.length;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !stationPages.hasNextPage || stationPages.isFetchingNextPage || paginationWarning || hasMoreLoadedStations) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) stationPages.fetchNextPage();
    }, { rootMargin: "460px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreLoadedStations, paginationWarning, stationPages.hasNextPage, stationPages.isFetchingNextPage, stationPages.fetchNextPage]);

  useEffect(() => {
    const onScroll = () => {
      if (!stationPages.hasNextPage || stationPages.isFetchingNextPage || paginationWarning || hasMoreLoadedStations) return;
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 900) stationPages.fetchNextPage();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMoreLoadedStations, paginationWarning, stationPages.hasNextPage, stationPages.isFetchingNextPage, stationPages.fetchNextPage]);
  const placeIds = useMemo(() => list.map(station => station.placeId), [list]);
  const favoriteState = trpc.personal.favoriteState.useQuery({ placeIds }, { enabled: isAuthenticated && placeIds.length > 0, retry: 1 });
  const utils = trpc.useUtils();
  const addFavorite = trpc.personal.addFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.success("Parada salva na sua conta."); } });
  const removeFavorite = trpc.personal.removeFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.message("Parada removida dos favoritos."); } });
  const favorites = new Set(favoriteState.data ?? []);
  const localFavoriteIds = useMemo(() => new Set(localFavorites.map(station => station.placeId)), [localFavorites]);
  const compared = list.filter(station => compareIds.includes(station.placeId));
  const decisionStation = list.find(station => station.placeId === decisionPlaceId) ?? null;
  const stationDetails = trpc.stationDirectory.details.useQuery({ placeId: decisionPlaceId ?? "unselected" }, { enabled: Boolean(decisionPlaceId), retry: 1 });
  const selectedStation = stationDetails.data ?? decisionStation;

  const toggleFavorite = (station: typeof list[number]) => {
    if (!isAuthenticated) {
      const result = toggleMobileStationFavorite(station as unknown as MobileStation);
      setLocalFavorites(result.stations);
      vibration();
      toast.message(result.saved ? "Parada salva neste aparelho." : "Parada removida dos salvos locais.");
      return;
    }
    if (favorites.has(station.placeId)) removeFavorite.mutate({ placeId: station.placeId });
    else { track("favorite_saved", query); addFavorite.mutate({ placeId: station.placeId, stationName: station.name, stationAddress: station.address, lat: station.lat, lng: station.lng }); }
  };
  const toggleCompare = (placeId: string) => {
    track("station_compare", query);
    setCompareIds(current => current.includes(placeId) ? current.filter(id => id !== placeId) : current.length < 3 ? [...current, placeId] : current);
  };
  const saveCurrentPreferences = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem(AUTH_RETURN_KEY, location);
      toast.message("Entre para salvar os filtros desta consulta.");
      startLogin();
      return;
    }
    savePreferences.mutate({ mappedBrand: brandFilter, hoursStatus: hoursFilter, sortBy, anpNeighborhood: "all", anpBrand: "all", resultsPerView, economicMode: resultsPerView === 5 }, { onSuccess: () => toast.success("Preferências aplicadas às próximas consultas da sua conta."), onError: () => toast.error("Não foi possível salvar suas preferências agora.") });
  };
  const updateResultsPerView = (next: StationResultsPageSize) => {
    setResultsPerView(next);
    setVisibleResultCount(next);
    if (!isAuthenticated) return;
    savePreferences.mutate({ mappedBrand: brandFilter, hoursStatus: hoursFilter, sortBy, anpNeighborhood: "all", anpBrand: "all", resultsPerView: next, economicMode: next === 5 }, { onError: () => toast.error("A escolha de exibição continua nesta tela, mas não foi salva na conta.") });
  };
  const shareCurrentSearch = async () => {
    const url = `${window.location.origin}${appUrl("/postos")}?q=${encodeURIComponent(query)}`;
    const text = `Consulta Trajeto: postos em ${query}. Localização, distância e horários consultados no Google Maps; referências oficiais da ANP quando disponíveis.`;
    try {
      if (navigator.share) await navigator.share({ title: "Trajeto · consulta de postos", text, url });
      else { await navigator.clipboard.writeText(`${text}
${url}`); toast.success("Link da consulta copiado para compartilhar."); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível preparar o compartilhamento agora.");
    }
  };
  const navigateStation = (station: typeof list[number]) => {
    vibration();
    const urls = openNavigation(station.lat, station.lng, station.name);
    window.open(urls.google, "_blank", "noopener,noreferrer");
  };

  const shareStation = async (station: typeof list[number]) => {
    const url = `${window.location.origin}${appUrl("/postos")}?q=${encodeURIComponent(query)}&station=${encodeURIComponent(station.placeId)}`;
    const text = `Encontrei ${station.name} no Trajeto. ${station.distanceLabel ? `Distância: ${station.distanceLabel}. ` : ""}Veja os dados e a navegação:`;
    try {
      if (navigator.share) await navigator.share({ title: `Trajeto · ${station.name}`, text, url });
      else { await navigator.clipboard.writeText(`${text}
${url}`); toast.success("Link do posto copiado para compartilhar."); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível preparar o compartilhamento agora.");
    }
  };

  return <div className="min-h-screen bg-[#0B1014] text-[#EAF0F2]">
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1014]/90 backdrop-blur-xl"><div className="container flex h-[68px] items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><img className="size-9 rounded-xl bg-[#C7FF3C] p-1.5" src={appUrl("/favicon.svg")} alt="" /><span className="brand-wordmark text-[1.25rem] text-white">trajeto</span><span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8DA0AB] sm:block">Consulta pública</span></Link><div className="flex items-center gap-2"><Link href="/ajuda"><span className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#C9F7FF] transition hover:bg-white hover:text-[#0B1014]">Ajuda</span></Link><button onClick={() => setLocation("/")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#C7FF3C] transition hover:bg-white hover:text-[#0B1014]"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">Início</span></button></div></div></header>
    <main className="container pb-28 pt-7 lg:pt-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121B22]"><div className="grid lg:grid-cols-[0.86fr_1.14fr]"><div className="route-grid relative p-6 sm:p-8"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">Consulta de parada · Entorno</p><h1 className="mt-5 font-display text-[clamp(3.1rem,6vw,5.4rem)] font-semibold leading-[0.84] tracking-[-0.075em] text-white">Pare melhor.<br /><span className="text-[#C7FF3C]">Desvie menos.</span></h1><p className="mt-6 max-w-md text-sm leading-relaxed text-[#A5B5BC]">Encontre postos reais, compare distância e desvio e escolha a próxima parada sem cadastro.</p><a href={anpQualityUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#BDA5FF] transition hover:text-white"><BadgeCheck className="size-4" /> Ver qualidade na fonte oficial da ANP <ExternalLink className="size-3.5" /></a></div>
        <section className="p-5 sm:p-8"><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#7F919A]">Localização e destino</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Abra sua consulta.</h2><form onSubmit={submit} className="mt-6" noValidate><label className="text-xs font-bold text-[#A5B5BC]" htmlFor="station-query">Cidade, bairro ou posto</label><div className="mt-2 flex rounded-2xl border border-white/12 bg-[#0B1014] p-1.5 focus-within:border-[#3DE3FF]"><Search className="ml-3 mt-3 size-5 text-[#3DE3FF]" /><input id="station-query" minLength={3} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? "station-query-error" : undefined} value={input} onChange={event => { setInput(event.target.value); if (searchError) setSearchError(null); }} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-[#64747C]" placeholder="Ex.: Águas Lindas de Goiás" /><Button type="submit" className="size-11 rounded-xl bg-[#C7FF3C] p-0 text-[#0B1014] hover:bg-white" aria-label="Pesquisar postos"><ArrowRight className="size-5" /></Button></div>{searchError && <p id="station-query-error" role="alert" className="mt-2 text-xs font-semibold text-[#FFB5A1]">{searchError}</p>}</form><div className="mt-5"><MobileDataMode onChange={enabled => { setResultsPerView(enabled ? 5 : 10); setVisibleResultCount(enabled ? 5 : 10); }} /></div>
        {recentSearches.length > 0 && <div className="mt-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BDA5FF]">Pesquisas recentes</p><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{recentSearches.map(item => <button key={item} type="button" onClick={() => navigateToQuery(item)} className="min-h-10 shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-[#C9D7DC]">{item}</button>)}</div></div>}
        {localFavorites.length > 0 && <div className="mt-5 rounded-2xl border border-[#FF7D6A]/20 bg-[#FF7D6A]/6 p-3"><div className="flex items-center justify-between gap-3"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#FFC2B7]">Salvos neste aparelho</p><span className="text-[0.62rem] text-[#A5B5BC]">{localFavorites.length}/20</span></div><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{localFavorites.slice(0, 6).map(station => <button key={station.placeId} type="button" onClick={() => setDecisionPlaceId(station.placeId)} className="min-h-11 shrink-0 max-w-[220px] rounded-xl border border-white/10 bg-black/15 px-3 text-left text-xs font-bold text-white"><span className="block truncate">{station.name}</span><span className="mt-0.5 block truncate text-[0.65rem] font-medium text-[#A5B5BC]">{station.address}</span></button>)}</div></div>}
        <div className="mt-6"><div className="flex items-center justify-between"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Corredor Águas Lindas · DF</p><span className="text-[0.65rem] text-[#74868F]">Filtro rápido</span></div><div className="mt-3 flex flex-wrap gap-2">{corridorPresets.map(preset => <button key={preset.id} onClick={() => selectCorridor(preset)} className={`min-h-11 rounded-full border px-3 py-2 text-xs font-bold transition ${query === preset.query ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-white/[0.03] text-[#C6D1D6] hover:border-[#3DE3FF]"}`}>{preset.label}</button>)}</div></div><div className="mt-5 border-t border-white/10 pt-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BDA5FF]">Atalho de corredor</p><p className="mt-2 text-xs leading-relaxed text-[#A5B5BC]">Use os atalhos acima para abrir uma consulta concreta. A primeira resposta continua pública e sem cadastro.</p></div><p className="mt-6 border-l-2 border-[#C7FF3C] pl-3 text-xs leading-relaxed text-[#92A4AE]"><strong className="text-white">Consulta aberta.</strong> A conta é opcional e guarda filtros, favoritos, rotas e alertas.</p></section></div></section>
      {locationParams.lat != null && locationParams.lng != null && !showSavedOnly && <section role="status" aria-live="polite" className="mb-5 flex gap-3 rounded-2xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/8 p-4 text-sm leading-relaxed text-[#C9F7FF]"><Navigation className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" /><p><strong className="text-white">Busca perto da sua localização.</strong> Os postos e as distâncias são calculados usando a posição informada pelo navegador. O Trajeto não exibe suas coordenadas publicamente.</p></section>}
      {offline && <section role="status" aria-live="polite" className="mb-5 rounded-2xl border border-[#FFB86B]/35 bg-[#FFB86B]/10 p-4 text-sm leading-relaxed text-[#FFE0B3]"><strong className="text-white">Você está offline.</strong> Esta tela continua acessível com recursos já armazenados neste aparelho. Novas consultas e mapas externos precisam de internet.</section>}
      {cachedStationSnapshot && liveList.length === 0 && <section role="status" aria-live="polite" className="mt-5 flex gap-3 rounded-2xl border border-[#FFB86B]/35 bg-[#FFB86B]/10 p-4 text-sm leading-relaxed text-[#FFE0B3]"><BadgeInfo className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" /><p><strong className="text-white">Última consulta armazenada.</strong> Estes postos foram salvos neste aparelho em {new Date(cachedStationSnapshot.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Os dados podem estar desatualizados; conecte-se para atualizar.</p></section>}
      {stationPages.isLoading && <div className="mt-7 grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#121B22] text-[#C7FF3C]"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin" /><p className="mt-4 text-sm font-bold text-white">Localizando paradas no corredor…</p><p className="mt-2 text-xs text-[#91A3AD]">Buscando o primeiro lote de dados, horários e distâncias.</p></div></div>}
      {stationPages.isError && list.length === 0 && <div className="mt-7 rounded-3xl border border-[#FF7D6A]/35 bg-[#FF7D6A]/10 p-7"><Fuel className="size-6 text-[#FF7D6A]" /><h2 className="mt-4 font-display text-3xl font-semibold text-white">Não encontramos essa rota.</h2><p className="mt-3 text-sm leading-relaxed text-[#D7B6B0]">Revise o termo da busca, informe uma cidade mais específica ou tente novamente em instantes.</p></div>}
      {(stationPages.data || showSavedOnly) && <>
        <section className="mt-9 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">{showSavedOnly ? "Modo local · neste aparelho" : `Resultado da consulta · ${query}`}</p><h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.06em] text-white">{list.length ? `${list.length} ${showSavedOnly ? "paradas salvas." : "paradas recebidas."}` : "Nenhuma parada salva."}</h2></div><div className="flex flex-wrap gap-2">{showSavedOnly && <button type="button" onClick={() => { setShowSavedOnly(false); setLocation(`${appUrl("/postos")}?q=${encodeURIComponent(query)}`); }} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#B8C7CD]">Todas as consultas</button>}<span className="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#B8C7CD]"><ListFilter className="size-3.5 text-[#3DE3FF]" /> Rolagem contínua</span><button onClick={shareCurrentSearch} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#BDA5FF]/45 px-3 py-2 text-xs font-bold text-[#E1D7FF] transition hover:bg-[#BDA5FF] hover:text-[#0B1014]"><Share2 className="size-3.5" /> Compartilhar</button><button onClick={() => { if (!showMap) track("map_open", query); setShowMap(current => !current); }} className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-xs font-bold transition ${showMap ? "bg-[#8B5CF6] text-white" : "bg-[#C7FF3C] text-[#0B1014] hover:bg-white"}`}><Map className="size-3.5" /> {showMap ? "Ocultar mapa" : "Ver mapa"}</button></div></section>
        {stationPages.hasNextPage && <section className="mt-5 flex gap-3 rounded-2xl border border-[#C7FF3C]/30 bg-[#C7FF3C]/10 p-4 text-sm leading-relaxed text-[#D9E9D1]"><BadgeInfo className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" /><p><strong className="text-white">Há mais resultados nesta área.</strong> Quando você se aproximar do fim da lista, a Trajeto solicita o próximo lote ao Google Maps e preserva os postos já exibidos.</p></section>}
        {paginationWarning && <section role="status" aria-live="polite" className="mt-5 flex gap-3 rounded-2xl border border-[#FFB86B]/40 bg-[#FFB86B]/10 p-4 text-sm leading-relaxed text-[#FFE0B3]"><BadgeInfo className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" /><p><strong className="text-white">Resultados parciais preservados.</strong> {paginationWarning}</p></section>}
        <section className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><BadgeInfo className="mb-3 size-4 text-[#3DE3FF]" /><strong className="block text-white">Endereço e operação</strong>Endereço, horário, telefone e site conforme o Google Maps.</div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><ShieldCheck className="mb-3 size-4 text-[#C7FF3C]" /><strong className="block text-white">Fonte verificável</strong>Cadastro e bandeira do revendedor autorizado vêm da ANP quando há correspondência.</div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><Navigation className="mb-3 size-4 text-[#BDA5FF]" /><strong className="block text-white">Distância de carro</strong>Calculada pelo Google Maps em {searchedAt}; use-a para avaliar o desvio.</div></section>
        <section className="mt-3 rounded-2xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/7 p-4 text-xs leading-relaxed text-[#B8DDE5]"><p className="font-bold text-white">Como interpretar estes dados</p><p className="mt-1">Localização, contato, horário e distância refletem a consulta atual do Google Maps. Cadastro e bandeira ANP são oficiais. Preços, quando aparecerem no planejador, são referências semanais datadas da ANP — não cotação em tempo real.</p><Link href="/planejar" className="mt-3 inline-flex min-h-10 items-center font-bold text-[#C7FF3C]">Comparar economia e desvio no planejador <ArrowRight className="ml-1 size-3.5" /></Link></section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]"><SlidersHorizontal className="size-3.5" /> Ajustes opcionais</p><p className="mt-2 text-xs leading-relaxed text-[#A5B5BC]">Use estes ajustes somente depois de ver a primeira resposta. Eles refinam a lista e o mapa, mas não são necessários para decidir a próxima parada.</p></div><button onClick={saveCurrentPreferences} disabled={savePreferences.isPending} className="inline-flex items-center justify-center rounded-xl border border-[#C7FF3C]/45 px-3 py-2 text-xs font-bold text-[#DFFF9D] transition hover:bg-[#C7FF3C] hover:text-[#0B1014] disabled:opacity-50">{savePreferences.isPending ? "Salvando…" : "Salvar estes filtros"}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-[#A5B5BC]">Bandeira<select value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="all">Todas</option>{availableBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label><label className="text-xs font-bold text-[#A5B5BC]">Horário<select value={hoursFilter} onChange={event => setHoursFilter(event.target.value as typeof hoursFilter)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="all">Qualquer status</option><option value="open">Aberto agora</option><option value="closed">Fechado agora</option><option value="unknown">Horário não informado</option></select></label><label className="text-xs font-bold text-[#A5B5BC]">Ordenar por<select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="distance">Menor distância</option><option value="relevance">Relevância do Google</option><option value="brand">Bandeira</option><option value="hours">Abertos primeiro</option></select></label></div></section>
        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/8 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-white">Exibição da lista</p><p id="results-per-view-help" className="mt-1 text-xs leading-relaxed text-[#A8DDE8]">Escolha menos cartões por vez para navegar melhor em rede lenta. Os demais postos já carregados ficam disponíveis em “Mostrar mais”. {isAuthenticated ? "Sua escolha é salva na conta." : "Entre para guardar esta escolha na próxima consulta."}</p></div><label className="text-xs font-bold text-[#C9F7FF]">Resultados por vez<select aria-describedby="results-per-view-help" value={resultsPerView} onChange={event => updateResultsPerView(Number(event.target.value) as StationResultsPageSize)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#3DE3FF]/35 bg-[#0B1014] px-3 py-2 text-sm font-medium text-white outline-none focus:border-white sm:w-52">{stationResultsPageSizes.map(size => <option key={size} value={size}>{size}{size === 5 ? " · modo econômico" : ""}</option>)}</select></label></section>
        {showMap && <section className="mt-6 overflow-hidden rounded-3xl border border-white/10"><StationMap stations={displayedStations} /></section>}
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{displayedStations.map((station, index) => <article key={station.placeId} className="group relative flex min-h-80 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_14px_40px_rgba(0,0,0,.16)] transition hover:-translate-y-1 hover:border-[#3DE3FF]/60 sm:p-5"><span className="absolute right-5 top-4 font-display text-5xl font-semibold tracking-[-0.1em] text-white/[0.04]">{String(index + 1).padStart(2, "0")}</span><div className="flex items-start justify-between gap-4"><div className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-5" /></div>{station.isOpen === true && <span className="inline-flex items-center gap-1 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.62rem] font-bold text-[#D9FF91]"><CircleCheck className="size-3" /> Aberto agora</span>}{station.isOpen === false && <span className="rounded-full bg-[#FF7D6A]/15 px-2 py-1 text-[0.62rem] font-bold text-[#FFC2B7]">Fechado agora</span>}</div><p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Parada {String(index + 1).padStart(2, "0")}</p><h3 className="mt-2 text-xl font-extrabold leading-tight text-white">{station.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#91A3AD]">{station.address}</p><div className="mt-4 grid grid-cols-2 gap-2 border-y border-dashed border-white/10 py-3 text-[0.68rem] font-bold text-[#A9BAC2]"><span className="inline-flex items-center gap-1"><BadgeInfo className="size-3.5 text-[#BDA5FF]" /> {inferredBrand(station.name)}</span><span className="inline-flex items-center gap-1"><Navigation className="size-3.5 text-[#3DE3FF]" /> {station.distanceLabel || "Indisponível"}</span></div>{station.anpMatch?.status === "probable" && <p className="mt-3 rounded-xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 p-2.5 text-[0.66rem] leading-relaxed text-[#DFFF9D]"><ShieldCheck className="mr-1 inline size-3.5" /> Vínculo <strong>provável</strong> com cadastro ANP · {station.anpMatch.brand || "bandeira não informada"}. Confiança de correspondência: {Math.round(station.anpMatch.confidence * 100)}%.</p>}<div className="mt-auto space-y-3 pt-5 text-xs text-[#A5B5BC]">{station.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 text-[#3DE3FF]" />{station.phone}</p>}{station.openingHours[0] && <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />{station.openingHours[0]}</p>}<div className="flex flex-wrap gap-2">{station.website && <a href={station.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-2 font-bold text-white transition hover:bg-white hover:text-[#0B1014]"><Globe2 className="size-3" /> Site <ExternalLink className="size-3" /></a>}<button onClick={() => setDecisionPlaceId(station.placeId)} className="inline-flex items-center gap-1 rounded-lg bg-[#C7FF3C] px-2.5 py-2 font-bold text-[#0B1014] transition hover:bg-white"><Navigation className="size-3" /> Opções</button><button onClick={() => toggleFavorite(station)} disabled={addFavorite.isPending || removeFavorite.isPending} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 font-bold transition ${isAuthenticated ? (favorites.has(station.placeId) ? "border-[#FF7D6A]/50 bg-[#FF7D6A]/10 text-[#FFC2B7]" : "border-white/12 text-white hover:bg-white/10") : (localFavoriteIds.has(station.placeId) ? "border-[#FF7D6A]/50 bg-[#FF7D6A]/10 text-[#FFC2B7]" : "border-white/12 text-white hover:bg-white/10")}`}><Heart className={`size-3 ${(isAuthenticated ? favorites.has(station.placeId) : localFavoriteIds.has(station.placeId)) ? "fill-current" : ""}`} />{isAuthenticated ? (favorites.has(station.placeId) ? "Salvo" : "Salvar") : (localFavoriteIds.has(station.placeId) ? "Salvo no aparelho" : "Salvar local")}</button></div><p className="border-l border-[#BDA5FF]/50 pl-2 text-[0.64rem] leading-relaxed text-[#9EACB4]">Veja rota e encaminhamentos oficiais depois de confirmar a parada.</p><button onClick={() => toggleCompare(station.placeId)} disabled={!compareIds.includes(station.placeId) && compareIds.length === 3} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${compareIds.includes(station.placeId) ? "border-[#3DE3FF] bg-[#3DE3FF] text-[#0B1014]" : "border-white/12 text-[#DCE7EB] hover:border-[#3DE3FF] hover:bg-[#3DE3FF]/10"}`}><Check className="size-3.5" /> {compareIds.includes(station.placeId) ? "Na comparação" : "Comparar parada"}</button></div></article>)}</section>
        {hasMoreLoadedStations && <section className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center"><p className="text-sm text-[#B8C7CD]">Mostrando {displayedStations.length} de {sortedStations.length} postos já carregados.</p><button type="button" onClick={() => setVisibleResultCount(current => nextVisibleStationCount(current, resultsPerView, sortedStations.length))} className="min-h-11 rounded-xl border border-[#C7FF3C]/55 px-4 py-2 text-xs font-bold text-[#DFFF9D] transition hover:bg-[#C7FF3C] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Mostrar mais {Math.min(resultsPerView, sortedStations.length - displayedStations.length)} posto(s)</button></section>}
        {stationPages.isFetchingNextPage && <section aria-live="polite" aria-label="Carregando próximo lote de paradas" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <article key={index} className="min-h-80 rounded-3xl border border-[#3DE3FF]/20 bg-[#121B22] p-5"><Skeleton className="h-10 w-10 rounded-xl bg-[#3DE3FF]/15" /><Skeleton className="mt-7 h-3 w-24 bg-white/10" /><Skeleton className="mt-3 h-6 w-3/4 bg-white/10" /><Skeleton className="mt-4 h-4 w-full bg-white/10" /><Skeleton className="mt-2 h-4 w-5/6 bg-white/10" /><div className="mt-7 grid grid-cols-2 gap-2"><Skeleton className="h-9 bg-white/10" /><Skeleton className="h-9 bg-white/10" /></div></article>)}</section>}
        <div ref={loadMoreRef} aria-live="polite" aria-atomic="true" aria-busy={stationPages.isFetchingNextPage || automaticRetryPending} className="mt-6 rounded-2xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/8 p-4 text-center text-sm font-bold text-[#D8F6FF]">{stationPages.isFetchingNextPage ? <span className="inline-flex flex-col items-center gap-2 sm:flex-row"><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Preparando o próximo lote de postos…</span><span className="text-xs font-medium text-[#9EC8D2]">O Google Maps pode levar alguns segundos para liberar a continuação.</span></span> : paginationWarning && automaticRetryPending ? <span className="inline-flex flex-col items-center gap-2 sm:flex-row"><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Estamos tentando liberar o próximo lote automaticamente…</span><span className="text-xs font-medium text-[#9EC8D2]">Se não funcionar, você poderá tentar novamente.</span></span> : paginationWarning ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row"><span>O lote adicional ainda não está pronto. Seus resultados continuam disponíveis.</span><button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#FFB86B]/50 px-3 py-2 text-xs font-bold text-[#FFE0B3] transition hover:bg-[#FFB86B] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Tentar novamente</button></span> : stationPages.isFetchNextPageError ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row">Não foi possível atualizar este lote agora. <button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#FFB86B]/50 px-3 py-2 text-xs font-bold text-[#FFE0B3] transition hover:bg-[#FFB86B] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Tentar novamente</button></span> : stationPages.hasNextPage ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row">Role para continuar descobrindo postos nesta área.<button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#3DE3FF]/50 px-3 py-2 text-xs font-bold text-[#D8F6FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Carregar agora</button></span> : "Todos os lotes disponíveis para esta consulta foram exibidos."}</div>
        {compared.length > 0 && <section id="comparar" className="mt-9 overflow-hidden rounded-3xl border border-[#C7FF3C]/35 bg-[#121B22]"><div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Comparação ativa · {compared.length}/3</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Escolha com contexto.</h2></div><button onClick={() => setCompareIds([])} className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#A9BAC2] transition hover:bg-white hover:text-[#0B1014]"><X className="size-4" /> Limpar</button></div><div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">{compared.map((station, index) => <article key={station.placeId} className="p-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Opção {index + 1}</p><h3 className="mt-3 text-lg font-extrabold text-white">{station.name}</h3><p className="mt-2 min-h-10 text-sm text-[#91A3AD]">{station.address}</p><dl className="mt-4 space-y-3 border-y border-white/10 py-3 text-xs text-[#A5B5BC]"><div><dt className="font-bold text-white">Distância de carro</dt><dd>{station.distanceLabel || "Não disponível para esta busca"}</dd></div><div><dt className="font-bold text-white">Fonte e data</dt><dd>Google Maps · consulta em {searchedAt}</dd></div></dl><button onClick={() => setDecisionPlaceId(station.placeId)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C7FF3C] px-3 py-2 text-xs font-bold text-[#0B1014] transition hover:bg-white">Ver opções <ChevronRight className="size-3.5" /></button></article>)}</div></section>}
      </>}
    </main>
    <Dialog open={Boolean(decisionStation)} onOpenChange={open => { if (!open) setDecisionPlaceId(null); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#121B22] text-white"><DialogHeader><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Escolha sua parada</p><DialogTitle className="font-display text-3xl tracking-[-0.05em] text-white">{selectedStation?.name}</DialogTitle><DialogDescription className="leading-relaxed text-[#A5B5BC]">{decisionStation?.distanceLabel ? `Distância pela rota consultada: ${decisionStation.distanceLabel}.` : "Distância pela rota consultada indisponível."} Endereço e horário vêm da consulta atual do Google Maps.</DialogDescription></DialogHeader>{stationDetails.isLoading && <p className="rounded-xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/8 p-3 text-xs font-bold text-[#C9F7FF]">Carregando detalhes do posto…</p>}{decisionStation && selectedStation && <div className="space-y-3">{selectedStation.phone && <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[#C9D7DC]">Telefone: <strong className="text-white">{selectedStation.phone}</strong></p>}{selectedStation.openingHours[0] && <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[#C9D7DC]">Horário: <strong className="text-white">{selectedStation.openingHours[0]}</strong></p>}<div className="grid gap-2 sm:grid-cols-2"><a onClick={() => track("route_open", query)} href={googleMapsRoute(decisionStation.placeId, selectedStation.name)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between rounded-xl bg-[#C7FF3C] px-4 py-3 text-sm font-bold text-[#0B1014] transition hover:bg-white">Abrir no Google Maps <ExternalLink className="size-4" /></a><a onClick={() => track("route_open", query)} href={wazeRoute(decisionStation.lat, decisionStation.lng)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#3DE3FF]/45 px-4 py-3 text-sm font-bold text-[#C9F7FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014]">Abrir no Waze <ExternalLink className="size-4" /></a></div><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => shareStation(decisionStation)} className="min-h-11 rounded-xl border border-[#BDA5FF]/45 px-4 py-3 text-xs font-bold text-[#E1D7FF] transition hover:bg-[#BDA5FF] hover:text-[#0B1014]"><Share2 className="mr-2 inline size-4" />Compartilhar esta parada</button><a onClick={() => track("anp_quality_open", query)} href={anpQualityUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white transition hover:bg-white hover:text-[#0B1014]">Ver fonte ANP <ExternalLink className="ml-2 size-4" /></a></div></div>}</DialogContent></Dialog>
    {compareIds.length > 0 && <button onClick={() => document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between rounded-2xl border border-[#C7FF3C]/50 bg-[#C7FF3C] px-4 py-3 text-sm font-bold text-[#0B1014] shadow-[0_14px_28px_rgba(0,0,0,.35)] md:hidden"><span>{compareIds.length} {compareIds.length === 1 ? "parada selecionada" : "paradas selecionadas"}</span><span className="inline-flex items-center gap-1">Comparar <ChevronRight className="size-4" /></span></button>}
    <footer className="border-t border-white/8 bg-[#070B0E] py-7 text-[#7D9099]"><div className="container text-xs leading-relaxed">Localização, endereço, horário e distância: Google Maps. Cadastro autorizado, bairro e bandeira: ANP. Referências de preço, quando disponíveis, são oficiais e datadas.</div></footer>
  </div>;
}
