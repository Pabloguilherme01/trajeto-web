/** Consulta pública com descoberta contínua, dados oficiais e preferências pessoais opcionais. */
import { StationMap } from "@/components/StationMap";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProductEvents } from "@/hooks/useProductEvents";
import { AUTH_RETURN_KEY } from "@/lib/authReturn";
import { corridorPresets, type CorridorPreset } from "@/lib/corridorPresets";
import { filterAndSortStations, inferredBrand } from "@/lib/stationListControls";
import { buildStationExportCsv, stationExportCsvFilename } from "@/lib/stationExportCsv";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BadgeCheck, BadgeInfo, Check, ChevronRight, CircleCheck, Clock3, Download, ExternalLink, Fuel, Globe2, Heart, ListFilter, Loader2, Map, Navigation, Phone, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";

const anpQualityUrl = "https://anpcomvcpostos.anp.gov.br/";
const fipeUrl = "https://www.fipe.org.br/pt-br/indices/veiculos";
const googleMapsRoute = (placeId: string, name: string) => `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}&query=${encodeURIComponent(name)}`;
const wazeRoute = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
const appleMapsRoute = (lat: number, lng: number) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

function initialQuery() {
  return new URLSearchParams(window.location.search).get("q") || corridorPresets[0].query;
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [showMap, setShowMap] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState("all");
  const [hoursFilter, setHoursFilter] = useState<"all" | "open" | "closed" | "unknown">("all");
  const [sortBy, setSortBy] = useState<"distance" | "relevance" | "brand" | "hours">("distance");
  const [anpNeighborhood, setAnpNeighborhood] = useState("all");
  const [anpBrand, setAnpBrand] = useState("all");
  const [decisionPlaceId, setDecisionPlaceId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const track = useProductEvents();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const preferencesApplied = useRef(false);
  const automaticRetryUsed = useRef(false);
  const [automaticRetryPending, setAutomaticRetryPending] = useState(false);

  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    { query },
    { enabled: query.trim().length >= 3, retry: 1, getNextPageParam: lastPage => lastPage.nextCursor ?? undefined },
  );
  const authorized = trpc.stationDirectory.authorizedSearch.useQuery(
    { query, neighborhood: anpNeighborhood === "all" ? undefined : anpNeighborhood, brand: anpBrand === "all" ? undefined : anpBrand },
    { enabled: query.trim().length >= 3, retry: 1 },
  );
  const savedPreferences = trpc.personal.stationSearchPreferences.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const savePreferences = trpc.personal.saveStationSearchPreferences.useMutation({ onSuccess: () => toast.success("Preferências aplicadas às próximas consultas da sua conta.") });
  const paginationWarning = stationPages.data?.pages.at(-1)?.paginationWarning ?? null;

  useEffect(() => {
    const current = initialQuery();
    setInput(current);
    setQuery(current);
  }, []);

  useEffect(() => {
    setShowMap(false);
    setCompareIds([]);
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
    setAnpNeighborhood(savedPreferences.data.anpNeighborhood);
    setAnpBrand(savedPreferences.data.anpBrand);
    preferencesApplied.current = true;
  }, [savedPreferences.data]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !stationPages.hasNextPage || stationPages.isFetchingNextPage || paginationWarning) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) stationPages.fetchNextPage();
    }, { rootMargin: "460px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [paginationWarning, stationPages.hasNextPage, stationPages.isFetchingNextPage, stationPages.fetchNextPage]);

  useEffect(() => {
    const onScroll = () => {
      if (!stationPages.hasNextPage || stationPages.isFetchingNextPage || paginationWarning) return;
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 900) stationPages.fetchNextPage();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [paginationWarning, stationPages.hasNextPage, stationPages.isFetchingNextPage, stationPages.fetchNextPage]);

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
    if (!trimmed) return;
    track("station_search", trimmed);
    setInput(trimmed);
    setQuery(trimmed);
    setLocation(`/postos${region ? `?region=${region}&` : "?"}q=${encodeURIComponent(trimmed)}`);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); navigateToQuery(input); };
  const selectCorridor = (preset: CorridorPreset) => navigateToQuery(preset.query, preset.id);

  const list = useMemo(() => {
    const seen = new Set<string>();
    return (stationPages.data?.pages.flatMap(page => page.stations) ?? []).filter(station => !seen.has(station.placeId) && (seen.add(station.placeId), true));
  }, [stationPages.data]);
  const firstPage = stationPages.data?.pages[0];
  const searchedAt = firstPage ? new Date(firstPage.queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  const availableBrands = useMemo(() => Array.from(new Set(list.map(station => inferredBrand(station.name)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [list]);
  const sortedStations = useMemo(() => filterAndSortStations(list, brandFilter, hoursFilter, sortBy), [list, brandFilter, hoursFilter, sortBy]);
  const placeIds = useMemo(() => list.map(station => station.placeId), [list]);
  const favoriteState = trpc.personal.favoriteState.useQuery({ placeIds }, { enabled: isAuthenticated && placeIds.length > 0, retry: 1 });
  const utils = trpc.useUtils();
  const addFavorite = trpc.personal.addFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.success("Parada salva na sua conta."); } });
  const removeFavorite = trpc.personal.removeFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.message("Parada removida dos favoritos."); } });
  const favorites = new Set(favoriteState.data ?? []);
  const compared = list.filter(station => compareIds.includes(station.placeId));
  const decisionStation = list.find(station => station.placeId === decisionPlaceId) ?? null;
  const stationDetails = trpc.stationDirectory.details.useQuery({ placeId: decisionPlaceId ?? "unselected" }, { enabled: Boolean(decisionPlaceId), retry: 1 });
  const selectedStation = stationDetails.data ?? decisionStation;
  const authorizedStations = authorized.data?.stations ?? [];

  const toggleFavorite = (station: typeof list[number]) => {
    if (!isAuthenticated) {
      track("favorite_intent", query);
      sessionStorage.setItem(AUTH_RETURN_KEY, location);
      toast.message("Entre para guardar esta parada e reencontrá-la depois.");
      startLogin();
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
    savePreferences.mutate({ mappedBrand: brandFilter, hoursStatus: hoursFilter, sortBy, anpNeighborhood, anpBrand });
  };
  const exportLoadedStations = () => {
    if (!sortedStations.length) return;
    const csv = buildStationExportCsv(sortedStations, { query, sortBy, brandFilter, hoursFilter });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = stationExportCsvFilename(query);
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`${sortedStations.length} paradas carregadas foram preparadas para exportação.`);
  };

  return <div className="min-h-screen bg-[#0B1014] text-[#EAF0F2]">
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1014]/90 backdrop-blur-xl"><div className="container flex h-[68px] items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><img className="size-9 rounded-xl bg-[#C7FF3C] p-1.5" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><span className="brand-wordmark text-[1.25rem] text-white">trajeto</span><span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8DA0AB] sm:block">Consulta pública</span></Link><button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#C7FF3C] transition hover:bg-white hover:text-[#0B1014]"><ArrowLeft className="size-4" /> Início</button></div></header>
    <main className="container pb-28 pt-7 lg:pt-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121B22]"><div className="grid lg:grid-cols-[0.86fr_1.14fr]"><div className="route-grid relative p-6 sm:p-8"><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">Consulta de parada · Entorno</p><h1 className="mt-5 font-display text-[clamp(3.1rem,6vw,5.4rem)] font-semibold leading-[0.84] tracking-[-0.075em] text-white">Pare melhor.<br /><span className="text-[#C7FF3C]">Desvie menos.</span></h1><p className="mt-6 max-w-md text-sm leading-relaxed text-[#A5B5BC]">Consulte pontos reais de abastecimento, compare até três opções e mantenha seus filtros quando entrar na conta.</p><a href={anpQualityUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#BDA5FF] transition hover:text-white"><BadgeCheck className="size-4" /> Ver qualidade na fonte oficial da ANP <ExternalLink className="size-3.5" /></a></div>
        <section className="p-5 sm:p-8"><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#7F919A]">Localização e destino</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Abra sua consulta.</h2><form onSubmit={submit} className="mt-6"><label className="text-xs font-bold text-[#A5B5BC]" htmlFor="station-query">Cidade, bairro ou posto</label><div className="mt-2 flex rounded-2xl border border-white/12 bg-[#0B1014] p-1.5 focus-within:border-[#3DE3FF]"><Search className="ml-3 mt-3 size-5 text-[#3DE3FF]" /><input id="station-query" value={input} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-[#64747C]" placeholder="Ex.: Águas Lindas de Goiás" /><Button type="submit" className="size-11 rounded-xl bg-[#C7FF3C] p-0 text-[#0B1014] hover:bg-white" aria-label="Pesquisar postos"><ArrowRight className="size-5" /></Button></div></form><div className="mt-6"><div className="flex items-center justify-between"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Corredor Águas Lindas · DF</p><span className="text-[0.65rem] text-[#74868F]">Filtro rápido</span></div><div className="mt-3 flex flex-wrap gap-2">{corridorPresets.map(preset => <button key={preset.id} onClick={() => selectCorridor(preset)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${query === preset.query ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-white/[0.03] text-[#C6D1D6] hover:border-[#3DE3FF]"}`}>{preset.label}</button>)}</div></div><p className="mt-6 border-l-2 border-[#C7FF3C] pl-3 text-xs leading-relaxed text-[#92A4AE]"><strong className="text-white">Consulta aberta.</strong> A conta é opcional e guarda filtros, favoritos, rotas e solicitações.</p></section></div></section>
      {stationPages.isLoading && <div className="mt-7 grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#121B22] text-[#C7FF3C]"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin" /><p className="mt-4 text-sm font-bold text-white">Localizando paradas no corredor…</p><p className="mt-2 text-xs text-[#91A3AD]">Buscando o primeiro lote de dados, horários e distâncias.</p></div></div>}
      {stationPages.isError && <div className="mt-7 rounded-3xl border border-[#FF7D6A]/35 bg-[#FF7D6A]/10 p-7"><Fuel className="size-6 text-[#FF7D6A]" /><h2 className="mt-4 font-display text-3xl font-semibold text-white">Não encontramos essa rota.</h2><p className="mt-3 text-sm leading-relaxed text-[#D7B6B0]">Revise o termo da busca, informe uma cidade mais específica ou tente novamente em instantes.</p></div>}
      {stationPages.data && <>
        <section className="mt-9 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Resultado da consulta · {query}</p><h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.06em] text-white">{list.length ? `${list.length} paradas recebidas.` : "Nenhuma parada mapeada."}</h2>{authorized.data && <p className="mt-2 text-sm text-[#B8C7CD]">{authorized.data.total ? <><strong className="text-[#C7FF3C]">{authorized.data.total} postos autorizados</strong> no cadastro oficial da ANP.</> : "Sem cadastro autorizado para o termo informado."}</p>}</div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#B8C7CD]"><ListFilter className="size-3.5 text-[#3DE3FF]" /> Rolagem contínua</span><button onClick={exportLoadedStations} disabled={!sortedStations.length} className="inline-flex items-center gap-1 rounded-full border border-[#3DE3FF]/45 px-3 py-2 text-xs font-bold text-[#C9F7FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-3.5" /> Exportar CSV</button><button onClick={() => { if (!showMap) track("map_open", query); setShowMap(current => !current); }} className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold transition ${showMap ? "bg-[#8B5CF6] text-white" : "bg-[#C7FF3C] text-[#0B1014] hover:bg-white"}`}><Map className="size-3.5" /> {showMap ? "Ocultar mapa" : "Ver mapa"}</button></div></section>
        {stationPages.hasNextPage && <section className="mt-5 flex gap-3 rounded-2xl border border-[#C7FF3C]/30 bg-[#C7FF3C]/10 p-4 text-sm leading-relaxed text-[#D9E9D1]"><BadgeInfo className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" /><p><strong className="text-white">Há mais resultados nesta área.</strong> Quando você se aproximar do fim da lista, a Trajeto solicita o próximo lote ao Google Maps e preserva os postos já exibidos.</p></section>}
        {paginationWarning && <section role="status" aria-live="polite" className="mt-5 flex gap-3 rounded-2xl border border-[#FFB86B]/40 bg-[#FFB86B]/10 p-4 text-sm leading-relaxed text-[#FFE0B3]"><BadgeInfo className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" /><p><strong className="text-white">Resultados parciais preservados.</strong> {paginationWarning}</p></section>}
        <section className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><BadgeInfo className="mb-3 size-4 text-[#3DE3FF]" /><strong className="block text-white">Dados do posto</strong>Endereço, horário, telefone e site conforme o Google Maps.</div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><ShieldCheck className="mb-3 size-4 text-[#C7FF3C]" /><strong className="block text-white">Cadastro oficial</strong>Bairro e bandeira do revendedor autorizado vêm da ANP.</div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-relaxed text-[#A8B8BF]"><Navigation className="mb-3 size-4 text-[#BDA5FF]" /><strong className="block text-white">Distância real</strong>Calculada pelo Google Maps em {searchedAt}.</div></section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]"><SlidersHorizontal className="size-3.5" /> Organize a lista e o mapa</p><p className="mt-2 text-xs leading-relaxed text-[#A5B5BC]">Os filtros e a ordem abaixo também são aplicados aos marcadores do mapa. Relevância preserva a ordem original devolvida pelo Google Maps.</p></div><button onClick={saveCurrentPreferences} disabled={savePreferences.isPending} className="inline-flex items-center justify-center rounded-xl border border-[#C7FF3C]/45 px-3 py-2 text-xs font-bold text-[#DFFF9D] transition hover:bg-[#C7FF3C] hover:text-[#0B1014] disabled:opacity-50">{savePreferences.isPending ? "Salvando…" : "Salvar estes filtros"}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-[#A5B5BC]">Bandeira<select value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="all">Todas</option>{availableBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label><label className="text-xs font-bold text-[#A5B5BC]">Horário<select value={hoursFilter} onChange={event => setHoursFilter(event.target.value as typeof hoursFilter)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="all">Qualquer status</option><option value="open">Aberto agora</option><option value="closed">Fechado agora</option><option value="unknown">Horário não informado</option></select></label><label className="text-xs font-bold text-[#A5B5BC]">Ordenar por<select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#3DE3FF]"><option value="distance">Menor distância</option><option value="relevance">Relevância do Google</option><option value="brand">Bandeira</option><option value="hours">Abertos primeiro</option></select></label></div></section>
        {showMap && <section className="mt-6 overflow-hidden rounded-3xl border border-white/10"><StationMap stations={sortedStations} /></section>}
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sortedStations.map((station, index) => <article key={station.placeId} className="group relative flex min-h-80 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121B22] p-5 transition hover:-translate-y-1 hover:border-[#3DE3FF]/60"><span className="absolute right-5 top-4 font-display text-5xl font-semibold tracking-[-0.1em] text-white/[0.04]">{String(index + 1).padStart(2, "0")}</span><div className="flex items-start justify-between gap-4"><div className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-5" /></div>{station.isOpen === true && <span className="inline-flex items-center gap-1 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.62rem] font-bold text-[#D9FF91]"><CircleCheck className="size-3" /> Aberto agora</span>}{station.isOpen === false && <span className="rounded-full bg-[#FF7D6A]/15 px-2 py-1 text-[0.62rem] font-bold text-[#FFC2B7]">Fechado agora</span>}</div><p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Parada {String(index + 1).padStart(2, "0")}</p><h3 className="mt-2 text-xl font-extrabold leading-tight text-white">{station.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#91A3AD]">{station.address}</p><div className="mt-4 grid grid-cols-2 gap-2 border-y border-dashed border-white/10 py-3 text-[0.68rem] font-bold text-[#A9BAC2]"><span className="inline-flex items-center gap-1"><BadgeInfo className="size-3.5 text-[#BDA5FF]" /> {inferredBrand(station.name)}</span><span className="inline-flex items-center gap-1"><Navigation className="size-3.5 text-[#3DE3FF]" /> {station.distanceLabel || "Indisponível"}</span></div>{station.anpMatch?.status === "probable" && <p className="mt-3 rounded-xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 p-2.5 text-[0.66rem] leading-relaxed text-[#DFFF9D]"><ShieldCheck className="mr-1 inline size-3.5" /> Vínculo <strong>provável</strong> com cadastro ANP · {station.anpMatch.brand || "bandeira não informada"}. Confiança de correspondência: {Math.round(station.anpMatch.confidence * 100)}%.</p>}<div className="mt-auto space-y-3 pt-5 text-xs text-[#A5B5BC]">{station.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 text-[#3DE3FF]" />{station.phone}</p>}{station.openingHours[0] && <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />{station.openingHours[0]}</p>}<div className="flex flex-wrap gap-2">{station.website && <a href={station.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-2 font-bold text-white transition hover:bg-white hover:text-[#0B1014]"><Globe2 className="size-3" /> Site <ExternalLink className="size-3" /></a>}<button onClick={() => setDecisionPlaceId(station.placeId)} className="inline-flex items-center gap-1 rounded-lg bg-[#C7FF3C] px-2.5 py-2 font-bold text-[#0B1014] transition hover:bg-white"><Navigation className="size-3" /> Opções</button><button onClick={() => toggleFavorite(station)} disabled={addFavorite.isPending || removeFavorite.isPending} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 font-bold transition ${favorites.has(station.placeId) ? "border-[#FF7D6A]/50 bg-[#FF7D6A]/10 text-[#FFC2B7]" : "border-white/12 text-white hover:bg-white/10"}`}><Heart className={`size-3 ${favorites.has(station.placeId) ? "fill-current" : ""}`} />{favorites.has(station.placeId) ? "Salvo" : "Salvar"}</button></div><p className="border-l border-[#BDA5FF]/50 pl-2 text-[0.64rem] leading-relaxed text-[#9EACB4]">Veja rota e encaminhamentos oficiais depois de confirmar a parada.</p><button onClick={() => toggleCompare(station.placeId)} disabled={!compareIds.includes(station.placeId) && compareIds.length === 3} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${compareIds.includes(station.placeId) ? "border-[#3DE3FF] bg-[#3DE3FF] text-[#0B1014]" : "border-white/12 text-[#DCE7EB] hover:border-[#3DE3FF] hover:bg-[#3DE3FF]/10"}`}><Check className="size-3.5" /> {compareIds.includes(station.placeId) ? "Na comparação" : "Comparar parada"}</button></div></article>)}</section>
        {stationPages.isFetchingNextPage && <section aria-live="polite" aria-label="Carregando próximo lote de paradas" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <article key={index} className="min-h-80 rounded-3xl border border-[#3DE3FF]/20 bg-[#121B22] p-5"><Skeleton className="h-10 w-10 rounded-xl bg-[#3DE3FF]/15" /><Skeleton className="mt-7 h-3 w-24 bg-white/10" /><Skeleton className="mt-3 h-6 w-3/4 bg-white/10" /><Skeleton className="mt-4 h-4 w-full bg-white/10" /><Skeleton className="mt-2 h-4 w-5/6 bg-white/10" /><div className="mt-7 grid grid-cols-2 gap-2"><Skeleton className="h-9 bg-white/10" /><Skeleton className="h-9 bg-white/10" /></div></article>)}</section>}
        <div ref={loadMoreRef} role="status" aria-live="polite" aria-atomic="true" aria-busy={stationPages.isFetchingNextPage || automaticRetryPending} className="mt-6 rounded-2xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/8 p-4 text-center text-sm font-bold text-[#D8F6FF]">{stationPages.isFetchingNextPage ? <span className="inline-flex flex-col items-center gap-2 sm:flex-row"><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Preparando o próximo lote de postos…</span><span className="text-xs font-medium text-[#9EC8D2]">O Google Maps pode levar alguns segundos para liberar a continuação.</span></span> : paginationWarning && automaticRetryPending ? <span className="inline-flex flex-col items-center gap-2 sm:flex-row"><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Estamos tentando liberar o próximo lote automaticamente…</span><span className="text-xs font-medium text-[#9EC8D2]">Se não funcionar, você poderá tentar novamente.</span></span> : paginationWarning ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row"><span>O lote adicional ainda não está pronto. Seus resultados continuam disponíveis.</span><button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#FFB86B]/50 px-3 py-2 text-xs font-bold text-[#FFE0B3] transition hover:bg-[#FFB86B] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Tentar novamente</button></span> : stationPages.isFetchNextPageError ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row">Não foi possível atualizar este lote agora. <button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#FFB86B]/50 px-3 py-2 text-xs font-bold text-[#FFE0B3] transition hover:bg-[#FFB86B] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Tentar novamente</button></span> : stationPages.hasNextPage ? <span className="inline-flex flex-col items-center gap-3 sm:flex-row">Role para continuar descobrindo postos nesta área.<button type="button" onClick={() => stationPages.fetchNextPage()} className="min-h-11 rounded-lg border border-[#3DE3FF]/50 px-3 py-2 text-xs font-bold text-[#D8F6FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Carregar agora</button></span> : "Todos os lotes disponíveis para esta consulta foram exibidos."}</div>
        {authorized.data && authorized.data.total > 0 && <section className="mt-10 border-t border-white/10 pt-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Cadastro de postos autorizados</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">{authorizedStations.length} de {authorized.data.total} registros oficiais.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A5B5BC]">Filtre o cadastro por bairro e bandeira. Estes dados vêm da ANP, sem preço ou horário presumidos.</p></div><a href={anpQualityUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#BDA5FF]/45 px-3 py-2 text-xs font-bold text-[#DCCFFF] transition hover:bg-[#BDA5FF] hover:text-[#0B1014]"><ShieldCheck className="size-3.5" /> Ver no ANP com VC <ExternalLink className="size-3" /></a></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#A5B5BC]">Bairro ANP<select value={anpNeighborhood} onChange={event => setAnpNeighborhood(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#C7FF3C]"><option value="all">Todos os bairros</option>{authorized.data.neighborhoods.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}</select></label><label className="text-xs font-bold text-[#A5B5BC]">Bandeira ANP<select value={anpBrand} onChange={event => setAnpBrand(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-[#C7FF3C]"><option value="all">Todas as bandeiras</option>{authorized.data.brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label></div><div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{authorizedStations.map(station => <article key={station.authorization} className="rounded-2xl border border-[#C7FF3C]/20 bg-[#121B22] p-5"><p className="text-[0.6rem] font-bold uppercase tracking-[0.13em] text-[#C7FF3C]">Autorização ANP · {station.authorization}</p><h3 className="mt-3 text-lg font-extrabold leading-tight text-white">{station.legalName}</h3><p className="mt-2 text-sm leading-relaxed text-[#A8BBC3]">{station.address}{station.complement ? ` · ${station.complement}` : ""}</p><p className="mt-2 text-xs text-[#7D919A]">{station.neighborhood || "Bairro não informado"} · {station.brand}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${station.legalName}, ${station.address}, ${query}`)}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-white transition hover:bg-white hover:text-[#0B1014]"><Navigation className="size-3.5" /> Localizar no mapa</a></article>)}</div></section>}
        {compared.length > 0 && <section id="comparar" className="mt-9 overflow-hidden rounded-3xl border border-[#C7FF3C]/35 bg-[#121B22]"><div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Comparação ativa · {compared.length}/3</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Escolha com contexto.</h2></div><button onClick={() => setCompareIds([])} className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#A9BAC2] transition hover:bg-white hover:text-[#0B1014]"><X className="size-4" /> Limpar</button></div><div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">{compared.map((station, index) => <article key={station.placeId} className="p-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Opção {index + 1}</p><h3 className="mt-3 text-lg font-extrabold text-white">{station.name}</h3><p className="mt-2 min-h-10 text-sm text-[#91A3AD]">{station.address}</p><dl className="mt-4 space-y-3 border-y border-white/10 py-3 text-xs text-[#A5B5BC]"><div><dt className="font-bold text-white">Distância de carro</dt><dd>{station.distanceLabel || "Não disponível para esta busca"}</dd></div><div><dt className="font-bold text-white">Fonte e data</dt><dd>Google Maps · consulta em {searchedAt}</dd></div></dl><button onClick={() => setDecisionPlaceId(station.placeId)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C7FF3C] px-3 py-2 text-xs font-bold text-[#0B1014] transition hover:bg-white">Ver opções <ChevronRight className="size-3.5" /></button></article>)}</div></section>}
      </>}
    </main>
    <Dialog open={Boolean(decisionStation)} onOpenChange={open => { if (!open) setDecisionPlaceId(null); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#121B22] text-white"><DialogHeader><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Próximo passo</p><DialogTitle className="font-display text-3xl tracking-[-0.05em] text-white">{selectedStation?.name}</DialogTitle><DialogDescription className="leading-relaxed text-[#A5B5BC]">Confirme a alternativa antes de sair da Trajeto. Distância: {decisionStation?.distanceLabel || "indisponível"}. Dados de localização vêm do Google Maps; qualidade e fiscalização são tratadas no canal oficial da ANP.</DialogDescription></DialogHeader>{stationDetails.isLoading && <p className="rounded-xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/8 p-3 text-xs font-bold text-[#C9F7FF]">Carregando detalhes do posto sob demanda…</p>}{decisionStation && selectedStation && <div className="space-y-3">{selectedStation.phone && <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[#C9D7DC]">Telefone: <strong className="text-white">{selectedStation.phone}</strong></p>}{selectedStation.openingHours[0] && <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[#C9D7DC]">Horário: <strong className="text-white">{selectedStation.openingHours[0]}</strong></p>}<a onClick={() => track("route_open", query)} href={googleMapsRoute(decisionStation.placeId, selectedStation.name)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[#C7FF3C] px-4 py-3 text-sm font-bold text-[#0B1014] transition hover:bg-white">Abrir no Google Maps <ExternalLink className="size-4" /></a><a onClick={() => track("route_open", query)} href={wazeRoute(decisionStation.lat, decisionStation.lng)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#3DE3FF]/45 px-4 py-3 text-sm font-bold text-[#C9F7FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014]">Abrir no Waze <ExternalLink className="size-4" /></a><a onClick={() => track("route_open", query)} href={appleMapsRoute(decisionStation.lat, decisionStation.lng)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-[#0B1014]">Abrir no Apple Maps <ExternalLink className="size-4" /></a><a onClick={() => track("anp_quality_open", query)} href={anpQualityUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#BDA5FF]/50 px-4 py-3 text-sm font-bold text-[#E1D7FF] transition hover:bg-[#BDA5FF] hover:text-[#0B1014]">Consultar ANP com VC <ExternalLink className="size-4" /></a><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-bold text-white">Veículo e FIPE</p><p className="mt-1 text-xs leading-relaxed text-[#9EB0B8]">A FIPE oferece referência pública modelo a modelo e não disponibiliza API oficial ou consulta por placa nesta plataforma.</p><a href={fipeUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#C7FF3C]">Consultar Tabela FIPE oficial <ExternalLink className="size-3.5" /></a></div></div>}</DialogContent></Dialog>
    {compareIds.length > 0 && <button onClick={() => document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between rounded-2xl border border-[#C7FF3C]/50 bg-[#C7FF3C] px-4 py-3 text-sm font-bold text-[#0B1014] shadow-[0_14px_28px_rgba(0,0,0,.35)] md:hidden"><span>{compareIds.length} {compareIds.length === 1 ? "parada selecionada" : "paradas selecionadas"}</span><span className="inline-flex items-center gap-1">Comparar <ChevronRight className="size-4" /></span></button>}
    <footer className="border-t border-white/8 bg-[#070B0E] py-7 text-[#7D9099]"><div className="container text-xs leading-relaxed">Localização, endereço, horário e distância: Google Maps. Cadastro autorizado, bairro e bandeira: ANP. Referências de preço, quando disponíveis, são oficiais e datadas.</div></footer>
  </div>;
}
