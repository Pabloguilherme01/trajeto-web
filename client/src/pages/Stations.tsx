/**
 * Mobile conversion direction: list-first route markers, optional map loading,
 * clear source labels and a compact comparison tray that supports a decision in a few taps.
 */
import { StationMap } from "@/components/StationMap";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { AUTH_RETURN_KEY } from "@/lib/authReturn";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BadgeInfo, Check, ChevronRight, CircleCheck, Clock3, ExternalLink, Fuel, Globe2, Heart, ListFilter, Loader2, Map, MapPinned, Navigation, Phone, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";

const quickRegions = ["Brasília, DF", "Águas Lindas de Goiás, GO", "Goiânia, GO"];

function initialQuery() {
  return new URLSearchParams(window.location.search).get("q") || "Brasília, DF";
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [showMap, setShowMap] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();
  const track = useProductEvents();
  const stations = trpc.stationDirectory.search.useQuery({ query }, { enabled: query.trim().length >= 3, retry: 1 });

  useEffect(() => {
    const current = initialQuery();
    setInput(current);
    setQuery(current);
  }, []);

  useEffect(() => {
    setShowMap(false);
    setCompareIds([]);
  }, [query]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    track("station_search", value);
    setQuery(value);
    setLocation(`/postos?q=${encodeURIComponent(value)}`);
  };

  const list = stations.data?.stations ?? [];
  const searchedAt = stations.data ? new Date(stations.data.queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  const placeIds = useMemo(() => list.map(station => station.placeId), [list]);
  const favoriteState = trpc.personal.favoriteState.useQuery({ placeIds }, { enabled: isAuthenticated && placeIds.length > 0 });
  const utils = trpc.useUtils();
  const addFavorite = trpc.personal.addFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.success("Parada salva na sua conta."); } });
  const removeFavorite = trpc.personal.removeFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); utils.personal.overview.invalidate(); toast.message("Parada removida dos favoritos."); } });
  const favorites = new Set(favoriteState.data ?? []);
  const compared = list.filter(station => compareIds.includes(station.placeId));

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

  return <div className="min-h-screen bg-[#F7F2E8] text-[#163840]">
    <header className="border-b-4 border-[#163840] bg-[#FFC928]"><div className="container flex h-[70px] items-center justify-between"><Link href="/" className="flex items-center gap-3"><img className="size-9 rounded-xl bg-[#163840] p-1.5" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><span className="brand-wordmark text-[1.35rem] text-[#163840]">trajeto</span><span className="hidden border-l border-[#163840]/25 pl-3 text-[0.6rem] font-bold tracking-[0.18em] sm:block">CONSULTA PÚBLICA</span></Link><button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="size-4" /> Início</button></div></header>
    <main className="container py-7 pb-28 lg:py-12">
      <section className="grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch"><div className="relative overflow-hidden bg-[#3E54E8] p-6 text-white sm:p-8"><span className="absolute -right-8 -top-12 font-display text-[12rem] leading-none text-white/10">01</span><p className="relative text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Rota 01 · consulte perto de você</p><h1 className="relative font-display mt-4 text-[clamp(3.25rem,6vw,5.8rem)] font-semibold leading-[0.8] tracking-[-0.075em]">Encontre sua<br /><span className="text-[#FFC928]">próxima parada.</span></h1><p className="relative mt-6 max-w-md text-sm leading-relaxed text-white/80">A lista chega antes do mapa: compare informações públicas, salve preferidos e escolha a rota que faz sentido.</p><div className="relative mt-7 flex items-center gap-2 text-xs font-bold text-[#FFC928]"><BadgeInfo className="size-4" /> Fonte de cada dado sempre visível</div></div>
        <section className="border-4 border-[#163840] bg-white p-5 sm:p-7"><p className="eyebrow">Digite ou escolha uma região</p><h2 className="font-display mt-2 text-4xl font-semibold leading-[0.9] tracking-[-0.06em]">Abra a consulta.</h2><form onSubmit={submit} className="mt-6"><label className="text-xs font-bold text-[#48635E]" htmlFor="station-query">Cidade, bairro ou posto</label><div className="mt-2 flex border-2 border-[#163840]"><Search className="ml-3 mt-3 size-5 text-[#D94F3D]" /><input id="station-query" value={input} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 px-3 py-3 outline-none" placeholder="Ex.: Brasília, DF" /><Button type="submit" className="h-auto rounded-none bg-[#163840] px-4 hover:bg-[#D94F3D]" aria-label="Pesquisar postos"><ArrowRight className="size-5" /></Button></div></form><div className="mt-5 flex flex-wrap gap-2">{quickRegions.map(region => <button key={region} onClick={() => { setInput(region); setQuery(region); setLocation(`/postos?q=${encodeURIComponent(region)}`); }} className={`border px-3 py-2 text-xs font-bold transition ${query === region ? "border-[#163840] bg-[#FFC928] text-[#163840]" : "border-[#CAD6CC] text-[#47635C] hover:border-[#163840]"}`}>{region}</button>)}</div><div className="mt-6 border-l-2 border-[#D94F3D] pl-4 text-sm leading-relaxed text-[#5F756E]"><strong className="text-[#163840]">Consulta aberta.</strong> Você não precisa entrar para pesquisar. A conta serve apenas para guardar favoritos e acompanhar solicitações.</div></section></section>

      {stations.isLoading && <div className="mt-8 grid min-h-72 place-items-center border-4 border-[#163840] bg-[#D94F3D] text-white"><div className="text-center"><Loader2 className="mx-auto size-8 animate-spin text-[#FFC928]" /><p className="mt-4 font-bold">Localizando marcos de rota…</p></div></div>}
      {stations.isError && <div className="mt-8 flex min-h-64 flex-col justify-center border-4 border-[#163840] bg-[#D94F3D] p-8 text-white"><Fuel className="size-7 text-[#FFC928]" /><h2 className="font-display mt-5 text-4xl font-semibold">Não encontramos essa rota.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">Revise o termo da busca, informe uma cidade mais específica ou tente novamente em alguns instantes.</p></div>}

      {stations.data && <>
        <section className="mt-9 flex flex-col gap-5 border-b-2 border-[#163840] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Resultado da consulta · {stations.data.query}</p><h2 className="font-display mt-2 text-4xl font-semibold tracking-[-0.06em]">{list.length ? `${list.length} marcos encontrados.` : "Nenhuma parada encontrada."}</h2></div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 border border-[#163840] bg-white px-3 py-2 text-xs font-bold"><ListFilter className="size-3.5 text-[#D94F3D]" /> Lista primeiro</span><button onClick={() => { if (!showMap) track("map_open", query); setShowMap(current => !current); }} className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-bold transition ${showMap ? "bg-[#3E54E8] text-white" : "border border-[#163840] bg-[#FFC928] text-[#163840]"}`}><Map className="size-3.5" /> {showMap ? "Ocultar mapa" : "Ver mapa"}</button></div></section>
        {!isAuthenticated && list.length > 0 && <section className="mt-5 flex flex-col gap-4 border-2 border-[#3E54E8] bg-[#E5E9FF] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3E54E8]">Volte sem procurar de novo</p><p className="mt-1 text-sm leading-relaxed text-[#38515A]"><strong className="text-[#163840]">Crie sua conta gratuita</strong> para salvar até as três paradas que mais importam nesta rota.</p></div><button onClick={() => { track("account_cta", query); sessionStorage.setItem(AUTH_RETURN_KEY, location); startLogin(); }} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#3E54E8] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#163840]">Guardar minha rota <ArrowRight className="size-3.5" /></button></section>}
        <section className="mt-5 grid gap-4 md:grid-cols-3"><div className="border-l-4 border-[#FFC928] bg-white p-4 text-sm leading-relaxed text-[#506C65]"><strong className="block text-[#163840]">Dados do posto</strong>Endereço, horário, telefone e site quando disponibilizados pelo Google Maps.</div><div className="border-l-4 border-[#D94F3D] bg-white p-4 text-sm leading-relaxed text-[#506C65]"><strong className="block text-[#163840]">Preço e condições</strong>Não são inventados nesta lista. Referências oficiais aparecem com data no planejador quando houver cobertura.</div><div className="border-l-4 border-[#3E54E8] bg-white p-4 text-sm leading-relaxed text-[#506C65]"><strong className="block text-[#163840]">Distância de carro</strong>Calculada para esta busca pelo Google Maps em {searchedAt}.</div></section>
        {showMap && <section className="mt-6"><StationMap stations={list} /></section>}
        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((station, index) => <article key={station.placeId} className="relative flex min-h-80 flex-col overflow-hidden border-2 border-[#163840] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#FFC928]"><span className="absolute right-4 top-3 font-display text-5xl font-semibold tracking-[-0.1em] text-[#163840]/10">{String(index + 1).padStart(2, "0")}</span><div className="flex items-start justify-between gap-4"><div className="grid size-10 place-items-center bg-[#FFC928] text-[#163840]"><Fuel className="size-5" /></div>{station.isOpen === true && <span className="inline-flex items-center gap-1 bg-[#DDF0C8] px-2 py-1 text-[0.62rem] font-bold text-[#24502D]"><CircleCheck className="size-3" /> Aberto agora</span>}{station.isOpen === false && <span className="bg-[#F2D4CE] px-2 py-1 text-[0.62rem] font-bold text-[#7A3025]">Fechado agora</span>}</div><p className="mt-5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#D94F3D]">Marco de rota {String(index + 1).padStart(2, "0")}</p><h3 className="mt-2 text-xl font-bold leading-tight">{station.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#647973]">{station.address}</p><div className="mt-4 grid grid-cols-2 gap-2 border-y border-dashed border-[#D4DED5] py-3 text-[0.68rem] font-bold text-[#58736B]"><span className="inline-flex items-center gap-1"><BadgeInfo className="size-3.5 text-[#3E54E8]" /> Google Maps</span><span className="inline-flex items-center gap-1"><Navigation className="size-3.5 text-[#D94F3D]" /> {station.distanceLabel || "Distância indisponível"}</span></div><div className="mt-auto space-y-3 pt-5 text-xs text-[#536C65]">{station.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 text-[#D94F3D]" />{station.phone}</p>}{station.openingHours[0] && <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-[#D94F3D]" />{station.openingHours[0]}</p>}<div className="flex flex-wrap gap-2">{station.website && <a href={station.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-[#163840] px-2 py-2 font-bold text-[#163840] transition hover:bg-[#FFC928]"><Globe2 className="size-3" /> Site <ExternalLink className="size-3" /></a>}<a onClick={() => track("route_open", query)} href={`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(station.placeId)}&query=${encodeURIComponent(station.name)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-[#163840] px-2 py-2 font-bold text-white transition hover:bg-[#3E54E8]"><Navigation className="size-3" /> Rota</a><button onClick={() => toggleFavorite(station)} disabled={addFavorite.isPending || removeFavorite.isPending} className={`inline-flex items-center gap-1 border px-2 py-2 font-bold transition ${favorites.has(station.placeId) ? "border-[#D94F3D] bg-[#F9E3DC] text-[#A53527]" : "border-[#163840] text-[#163840] hover:bg-[#FFC928]"}`}><Heart className={`size-3 ${favorites.has(station.placeId) ? "fill-current" : ""}`} />{favorites.has(station.placeId) ? "Salvo" : "Salvar"}</button></div><button onClick={() => toggleCompare(station.placeId)} disabled={!compareIds.includes(station.placeId) && compareIds.length === 3} className={`mt-3 inline-flex w-full items-center justify-center gap-2 border px-3 py-2 text-xs font-bold transition ${compareIds.includes(station.placeId) ? "border-[#3E54E8] bg-[#3E54E8] text-white" : "border-[#163840] text-[#163840] hover:bg-[#EAF0E9]"}`}><Check className="size-3.5" /> {compareIds.includes(station.placeId) ? "Na comparação" : "Comparar esta parada"}</button></div></article>)}</section>
        {compared.length > 0 && <section id="comparar" className="mt-9 overflow-hidden border-4 border-[#163840] bg-[#163840] text-white"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#FFC928]">Comparação ativa · {compared.length}/3</p><h2 className="font-display mt-2 text-3xl font-semibold tracking-[-0.055em]">Escolha a parada com contexto.</h2></div><button onClick={() => setCompareIds([])} className="inline-flex items-center gap-2 self-start text-xs font-bold text-white/70 hover:text-[#FFC928]"><X className="size-4" /> Limpar</button></div><div className="grid divide-y divide-white/15 border-t border-white/15 md:grid-cols-3 md:divide-x md:divide-y-0">{compared.map((station, index) => <article key={station.placeId} className="p-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#FFC928]">Opção {index + 1}</p><h3 className="mt-3 text-lg font-bold">{station.name}</h3><p className="mt-2 min-h-10 text-sm text-white/70">{station.address}</p><dl className="mt-4 space-y-3 border-y border-white/15 py-3 text-xs text-white/70"><div><dt className="font-bold text-white">Distância de carro</dt><dd>{station.distanceLabel || "Não disponível para esta busca"}</dd></div><div><dt className="font-bold text-white">Fonte e data</dt><dd>Google Maps · consulta em {searchedAt}</dd></div><div><dt className="font-bold text-white">Referência de preço</dt><dd>Indisponível nesta lista; consulte o planejador quando houver cobertura oficial datada.</dd></div></dl><a href={`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(station.placeId)}&query=${encodeURIComponent(station.name)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 bg-[#FFC928] px-3 py-2 text-xs font-bold text-[#163840] transition hover:bg-white">Abrir rota <ChevronRight className="size-3.5" /></a></article>)}</div></section>}
      </>}
    </main>
    {compareIds.length > 0 && <button onClick={() => document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between border-2 border-[#163840] bg-[#FFC928] px-4 py-3 text-sm font-bold text-[#163840] shadow-[4px_4px_0_#163840] md:hidden"><span>{compareIds.length} {compareIds.length === 1 ? "parada selecionada" : "paradas selecionadas"}</span><span className="inline-flex items-center gap-1">Comparar <ChevronRight className="size-4" /></span></button>}
    <footer className="bg-[#163840] py-7 text-white/65"><div className="container text-xs leading-relaxed">Informações públicas de estabelecimento: Google Maps. Referências oficiais de preço, quando disponíveis, devem ser lidas com data e origem. Confirme as condições diretamente com o posto antes de se deslocar.</div></footer>
  </div>;
}
