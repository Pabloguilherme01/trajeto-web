import React from "react";
import { useMemo, useState } from "react";
import { Building2, BusFront, ExternalLink, HeartPulse, MapPinned, Navigation, Phone, Route, Search, Signpost, Wifi } from "lucide-react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { buildNavigationProviderUrl, type NavigationProvider } from "@/lib/mobileTools";
import { CITY_PLACES, CITY_SERVICES, searchCityPlaces, type CityCategory } from "@/lib/aguasLindasCity";
import SmartCityMode from "@/components/SmartCityMode";

const filters: { id: "todos" | CityCategory; label: string; icon: typeof MapPinned }[] = [
  { id: "todos", label: "Tudo", icon: MapPinned },
  { id: "saude", label: "Saúde", icon: HeartPulse },
  { id: "transporte", label: "Transporte", icon: BusFront },
  { id: "via", label: "Vias principais", icon: Signpost },
];

const providers: { id: NavigationProvider; label: string }[] = [
  { id: "google", label: "Google Maps" },
  { id: "waze", label: "Waze" },
  { id: "apple", label: "Apple Maps" },
  { id: "openstreetmap", label: "OpenStreetMap" },
];

const categoryName: Record<CityCategory, string> = { saude: "Saúde", transporte: "Transporte", via: "Via principal" };

export default function City() {
  const [filter, setFilter] = useState<"todos" | CityCategory>("todos");
  const [query, setQuery] = useState("");
  const places = useMemo(() => searchCityPlaces(query, filter), [filter, query]);

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_15%_0%,rgba(61,227,255,.08),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(199,255,60,.06),transparent_24%),#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-9">
        <header className="rounded-[1.8rem] border border-white/10 bg-[#121B22] p-5 shadow-[0_22px_65px_rgba(0,0,0,.25)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Águas Lindas · guia da cidade</p>
              <h1 className="mt-2 max-w-3xl font-display text-[clamp(2.4rem,8vw,4.4rem)] font-semibold leading-[.92] tracking-[-.065em]">A cidade inteira,<br /><span className="text-[#C7FF3C]">no seu trajeto.</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">Encontre unidades de saúde, corredores viários, transporte e contatos municipais em um só lugar. Consulte a fonte e abra o destino no navegador que preferir.</p>
            </div>
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.06] text-[#C7FF3C] sm:grid"><Building2 className="size-6" /></span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><p className="text-[.52rem] font-bold uppercase tracking-[.12em] text-white/35">Saúde</p><p className="mt-1 text-lg font-black">{CITY_PLACES.filter(place => place.category === "saude").length}</p><p className="text-[.55rem] text-white/40">unidades listadas</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><p className="text-[.52rem] font-bold uppercase tracking-[.12em] text-white/35">Vias</p><p className="mt-1 text-lg font-black">{CITY_PLACES.filter(place => place.category === "via").length}</p><p className="text-[.55rem] text-white/40">corredores oficiais</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><p className="text-[.52rem] font-bold uppercase tracking-[.12em] text-white/35">Acesso</p><p className="mt-1 text-lg font-black">Livre</p><p className="text-[.55rem] text-white/40">sem cadastro</p></div>
          </div>
        </header>

        <SmartCityMode />

        <section className="mt-5" aria-label="Pesquisar locais e rotas da cidade">
          <label htmlFor="city-search" className="text-[.56rem] font-black uppercase tracking-[.13em] text-white/40">O que você procura?</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#121B22] px-3">
            <Search className="size-4 shrink-0 text-[#3DE3FF]" />
            <input id="city-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: hospital, Barragem, BR-070…" enterKeyHint="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/30" />
            {query && <button type="button" onClick={() => setQuery("")} className="min-h-10 px-2 text-xs font-bold text-white/50">Limpar</button>}
          </div>
          <div className="mobile-scroll-x mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por categoria">
            {filters.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={"flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[.62rem] font-black " + (filter === id ? "border-[#C7FF3C]/30 bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-white/[.03] text-white/65")}><Icon className="size-3.5" />{label}</button>)}
          </div>
        </section>

        <section className="mt-5" aria-labelledby="city-places-title">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[.55rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Diretório público</p><h2 id="city-places-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">Locais e corredores</h2></div>
            <span className="text-xs font-bold text-white/45" aria-live="polite">{places.length} resultado(s)</span>
          </div>
          {places.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {places.map(place => <article key={place.id} className="rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4 shadow-[0_12px_35px_rgba(0,0,0,.14)]">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]">{place.category === "saude" ? <HeartPulse className="size-4" /> : place.category === "transporte" ? <BusFront className="size-4" /> : <Signpost className="size-4" />}</span>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-black leading-snug">{place.name}</h3><span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-[.47rem] font-bold text-white/45">{categoryName[place.category]}</span></div><p className="mt-2 text-xs leading-relaxed text-white/55">{place.address}</p></div>
              </div>
              {place.detail && <p className="mt-3 rounded-xl border border-[#FFB86B]/15 bg-[#FFB86B]/[.035] p-2.5 text-[.62rem] leading-relaxed text-[#FFD59A]/75">{place.detail}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={buildNavigationProviderUrl("google", place.address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]"><Navigation className="size-4" />Traçar rota</a>
                {place.phone && <a href={`tel:${place.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white/70"><Phone className="size-3.5" />Ligar</a>}
                <details className="relative">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-white/10 px-3 text-xs font-bold text-white/65">Outros mapas</summary>
                  <div className="absolute right-0 top-12 z-20 min-w-44 rounded-xl border border-white/10 bg-[#0B1014] p-2 shadow-xl">
                    {providers.slice(1).map(provider => <a key={provider.id} href={buildNavigationProviderUrl(provider.id, place.address)} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-bold text-white/70 hover:bg-white/[.06]"><ExternalLink className="size-3" />{provider.label}</a>)}
                  </div>
                </details>
              </div>
              <p className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-2.5 text-[.5rem] text-white/35"><span>Fonte: {place.source}</span><a href={place.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#9FEFFF]">Ver fonte <ExternalLink className="size-3" /></a></p>
            </article>)}
          </div> : <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center"><p className="text-sm font-bold">Nenhum local encontrado.</p><p className="mt-1 text-xs text-white/45">Tente outro nome, bairro ou categoria.</p></div>}
        </section>

        <section className="mt-7 rounded-[1.5rem] border border-[#3DE3FF]/15 bg-[#0F1A20] p-4 sm:p-5" aria-labelledby="city-contacts-title">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Phone className="size-4" /></span><div><p className="text-[.55rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Canais institucionais</p><h2 id="city-contacts-title" className="mt-1 text-lg font-black">Contatos úteis da cidade</h2><p className="mt-1 text-[.62rem] text-white/45">Números publicados pela Prefeitura; confirme o serviço antes de compartilhar.</p></div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{CITY_SERVICES.map(service => <article key={service.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/8 bg-[#0B1014] p-3"><div className="min-w-0 flex-1"><p className="text-xs font-black">{service.name}</p><p className="mt-1 text-[.58rem] leading-relaxed text-white/45">{service.detail}</p></div><a href={`tel:${service.phone.replace(/[^+\d]/g, "")}`} aria-label={`Ligar para ${service.name} ${service.phone}`} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#9FEFFF]"><Phone className="size-4" /></a></article>)}</div>
          <a href="https://aguaslindasdegoias.go.gov.br/unidades-de-saude/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#9FEFFF]">Abrir lista oficial e conferir atualizações <ExternalLink className="size-3.5" /></a>
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-[.62rem] leading-relaxed text-white/40">
          <p className="flex items-center gap-2 font-black text-white/65"><Wifi className="size-3.5 text-[#C7FF3C]" />Como usar os dados</p>
          <p className="mt-2">As unidades de saúde e contatos vêm de páginas oficiais consultadas em 30/09/2026. A página municipal não informa horário de atendimento de cada unidade. Vias estruturantes vêm da Lei municipal 341/2002, que descreve hierarquia e não o trânsito atual. A referência da rodoviária é de notícia municipal publicada em 2020; confirme o embarque no mapa.</p>
          <div className="mt-3 flex flex-wrap gap-3"><a className="font-bold text-[#9FEFFF]" href="https://legislacao.aguaslindasdegoias.go.gov.br/leis/394" target="_blank" rel="noopener noreferrer">Plano Diretor <ExternalLink className="inline size-3" /></a><a className="font-bold text-[#9FEFFF]" href="https://goias.gov.br/saude/heal/" target="_blank" rel="noopener noreferrer">HEAL · Goiás <ExternalLink className="inline size-3" /></a><Link className="font-bold text-[#C7FF3C]" href={appUrl("/planejar")}><Route className="mr-1 inline size-3" />Planejar outra rota</Link></div>
        </section>
      </div>
    </main>
  );
}
