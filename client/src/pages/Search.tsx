import { ArrowRight, BookOpen, Compass, ExternalLink, Fuel, HeartPulse, Landmark, MapPin, Navigation, Phone, Search as SearchIcon, ShieldAlert, Store, TrafficCone, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { AGUAS_LINDAS_STATIONS, searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { PUBLIC_SERVICE_CATEGORIES, PUBLIC_SERVICES, searchPublicServices, type PublicServiceCategory } from "@/lib/publicServices";
import { getRecentSearches, rememberSearch } from "@/lib/mobilePreferences";

type SearchKind = "todos" | "postos" | "servicos";

const categoryIcons = {
  saude: HeartPulse,
  seguranca: ShieldAlert,
  assistencia: ShieldAlert,
  transito: TrafficCone,
  educacao: BookOpen,
  cidadania: Landmark,
} as const;

const quickCards: Array<{ label: string; detail: string; kind: SearchKind; category?: PublicServiceCategory | "todos"; icon: typeof Fuel }> = [
  { label: "Postos", detail: "ANP + catálogo local", kind: "postos", icon: Fuel },
  { label: "Saúde", detail: "UPA, hospital e UBS", kind: "servicos", category: "saude", icon: HeartPulse },
  { label: "Segurança", detail: "Polícia e emergência", kind: "servicos", category: "seguranca", icon: ShieldAlert },
  { label: "Cidadania", detail: "Prefeitura, Procon e serviços", kind: "servicos", category: "cidadania", icon: Landmark },
  { label: "Trânsito", detail: "Mobilidade e atendimento", kind: "servicos", category: "transito", icon: TrafficCone },
  { label: "Educação", detail: "Rede estadual e escolas", kind: "servicos", category: "educacao", icon: BookOpen },
  { label: "Perto de mim", detail: "Use sua localização", kind: "postos", icon: Compass },
];

function googleSearch(query: string) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function phoneHref(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? "tel:" + digits : null;
}

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => params.get("q") || "");
  const [kind, setKind] = useState<SearchKind>(() => {
    const value = params.get("tipo");
    return value === "postos" || value === "servicos" ? value : "todos";
  });
  const [category, setCategory] = useState<PublicServiceCategory | "todos">(() => {
    const value = params.get("categoria");
    return PUBLIC_SERVICE_CATEGORIES.some(item => item.id === value) ? value as PublicServiceCategory | "todos" : "todos";
  });
  const [recents, setRecents] = useState(getRecentSearches);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    setInput(params.get("q") || "");
    const type = params.get("tipo");
    setKind(type === "postos" || type === "servicos" ? type : "todos");
    const cat = params.get("categoria");
    setCategory(PUBLIC_SERVICE_CATEGORIES.some(item => item.id === cat) ? cat as PublicServiceCategory | "todos" : "todos");
  }, [params]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        setInput("");
        inputRef.current?.blur();
      }
    };
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  const stationResults = useMemo(() => {
    const value = input.trim();
    if (kind === "servicos") return [];
    return (value ? searchAguasLindasStations(value) : AGUAS_LINDAS_STATIONS).slice(0, kind === "postos" ? 24 : 8);
  }, [input, kind]);

  const serviceResults = useMemo(() => {
    if (kind === "postos") return [];
    return searchPublicServices(input, kind === "servicos" ? category : "todos").slice(0, 24);
  }, [input, kind, category]);

  const total = stationResults.length + serviceResults.length;

  const openKind = (nextKind: SearchKind, nextCategory: PublicServiceCategory | "todos" = "todos") => {
    setKind(nextKind);
    setCategory(nextCategory);
    const query = new URLSearchParams();
    if (input.trim()) query.set("q", input.trim());
    if (nextKind !== "todos") query.set("tipo", nextKind);
    if (nextKind === "servicos" && nextCategory !== "todos") query.set("categoria", nextCategory);
    const text = query.toString();
    setLocation(appUrl("/buscar") + (text ? "?" + text : ""));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      setLocation(appUrl("/buscar"));
      return;
    }
    rememberSearch(value);
    setRecents(getRecentSearches());
    const query = new URLSearchParams({ q: value });
    if (kind !== "todos") query.set("tipo", kind);
    if (kind === "servicos" && category !== "todos") query.set("categoria", category);
    setLocation(appUrl("/buscar") + "?" + query.toString());
  };

  const openNearby = () => {
    if (!navigator.geolocation) {
      openKind("postos");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => setLocation(appUrl("/postos") + "?q=postos&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude),
      () => openKind("postos"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-6xl pt-5 sm:pt-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#C7FF3C]">Busca local</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.065em] sm:text-5xl">Tudo de Águas Lindas.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">Postos, saúde, segurança, cidadania, trânsito e educação em um painel único. O conteúdo essencial permanece embutido no app para consulta sem conexão.</p>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-2 self-start rounded-full border px-3 text-[0.55rem] font-black " + (online ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-[#C7FF3C]" : "border-[#FFB86B]/25 bg-[#FFB86B]/[.05] text-[#FFB86B]")}>
            {online ? "Catálogo + mapa" : "Catálogo offline"}
          </span>
        </header>

        <form onSubmit={submit} className="mt-5 rounded-[1.6rem] border border-[#C7FF3C]/18 bg-[#121B22] p-2 shadow-[0_20px_55px_rgba(0,0,0,.22)]">
          <div className="flex items-center gap-2 rounded-2xl bg-[#0B1014] px-3">
            <SearchIcon className="size-5 shrink-0 text-[#C7FF3C]" />
            <input
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Posto, UPA, escola, bairro, Prefeitura..."
              className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25"
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Buscar em Águas Lindas de Goiás"
              aria-keyshortcuts="Control+K Meta+K"
            />
            {input && <button type="button" onClick={() => { setInput(""); setLocation(appUrl("/buscar")); }} className="grid size-10 place-items-center rounded-xl text-white/40" aria-label="Limpar busca"><X className="size-4" /></button>}
            <button type="submit" className="grid size-11 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar"><ArrowRight className="size-4" /></button>
          </div>
          <p className="px-3 pt-2 text-[0.5rem] font-bold text-white/25"><kbd className="rounded border border-white/8 px-1.5 py-0.5">Ctrl K</kbd> para focar a busca · Esc para limpar o campo</p>
        </form>

        <section className="mt-5" aria-label="Categorias prontas">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-[0.55rem] font-black uppercase tracking-[.15em] text-white/30">Comece pronto</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Escolha uma categoria.</h2></div>
            {kind !== "todos" && <button type="button" onClick={() => openKind("todos")} className="min-h-10 rounded-xl border border-white/8 px-3 text-[0.58rem] font-black text-white/55">Mostrar tudo</button>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {quickCards.map(card => {
              const Icon = card.icon;
              const active = card.kind === kind && (card.kind !== "servicos" || card.category === category);
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={card.label === "Perto de mim" ? openNearby : () => openKind(card.kind, card.category ?? "todos")}
                  aria-pressed={active}
                  className={"route-card min-h-[6.4rem] rounded-2xl border p-3 text-left transition " + (active ? "border-[#C7FF3C]/30 bg-[#C7FF3C]/[.08] shadow-[0_12px_32px_rgba(199,255,60,.08)]" : "border-white/8 bg-[#121B22] hover:-translate-y-0.5 hover:border-white/15")}
                >
                  <Icon className={"size-4 " + (active ? "text-[#C7FF3C]" : "text-[#3DE3FF]")} />
                  <span className="mt-3 block text-xs font-black">{card.label}</span>
                  <span className="mt-0.5 block text-[0.53rem] leading-relaxed text-white/35">{card.detail}</span>
                </button>
              );
            })}
          </div>
        </section>

        {recents.length > 0 && !input && (
          <section className="mt-5">
            <p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-white/25">Buscas recentes</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {recents.slice(0, 8).map(item => (
                <button key={item} type="button" onClick={() => { setInput(item); rememberSearch(item); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(item)); }} className="min-h-10 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.62rem] font-bold text-white/60">{item}</button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.54rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">{kind === "servicos" ? "Serviços públicos" : kind === "postos" ? "Postos" : "Resultados locais"}</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.05em]">{input ? total + " resultado(s)" : "Disponíveis agora"}</h2>
            </div>
            {kind === "servicos" && <button type="button" onClick={() => setLocation(appUrl("/servicos"))} className="min-h-10 rounded-xl border border-white/8 px-3 text-[0.58rem] font-black text-white/55">Abrir central</button>}
          </div>

          {!input && kind === "todos" && (
            <div className="mt-3 rounded-[1.5rem] border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] p-4">
              <div className="flex items-start gap-3">
                <Landmark className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />
                <div><p className="text-xs font-black">Painel já preparado para a cidade</p><p className="mt-1 text-[0.62rem] leading-relaxed text-white/45">Há cadastro local de postos e uma biblioteca offline de serviços públicos essenciais. Digite qualquer termo ou toque numa categoria.</p></div>
              </div>
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {serviceResults.slice(0, 9).map(service => {
              const Icon = categoryIcons[service.category];
              const call = phoneHref(service.phone);
              return (
                <article key={service.id} className="route-card rounded-[1.4rem] border border-white/8 bg-[#121B22] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/[.08] text-[#C7FF3C]"><Icon className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#3DE3FF]">{PUBLIC_SERVICE_CATEGORIES.find(item => item.id === service.category)?.shortLabel}</p>
                      <h3 className="mt-1 text-sm font-black">{service.name}</h3>
                      <p className="mt-1 text-[0.61rem] leading-relaxed text-white/40">{service.description}</p>
                    </div>
                  </div>
                  {service.address && <p className="mt-3 line-clamp-2 text-[0.61rem] text-white/35">{service.address}</p>}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => window.open(googleSearch(service.mapQuery), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]"><MapPin className="mr-1 inline size-3.5" />Rota</button>
                    {call ? <a href={call} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-[0.6rem] font-black text-[#C9F7FF]"><Phone className="mr-1 size-3.5" />Ligar</a> : <a href={service.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/8 px-3 text-[0.6rem] font-black text-white/60"><ExternalLink className="mr-1 size-3.5" />Fonte</a>}
                  </div>
                </article>
              );
            })}

            {stationResults.map(station => (
              <button key={station.id} type="button" onClick={() => setLocation(appUrl("/local/" + encodeURIComponent(station.id)))} className="route-card w-full rounded-[1.4rem] border border-white/8 bg-[#121B22] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/15">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/[.08] text-[#3DE3FF]"><Fuel className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-[#3DE3FF]">Posto</p>
                    <h3 className="mt-1 truncate text-sm font-black">{station.displayName}</h3>
                    <p className="mt-1 line-clamp-2 text-[0.61rem] leading-relaxed text-white/40">{station.address || station.neighborhood || "Endereço não consolidado"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {station.brand && <span className="rounded-full border border-white/8 px-2 py-1 text-[0.48rem] font-bold text-white/40">{station.brand}</span>}
                      {station.anp?.authorization && <span className="rounded-full border border-[#C7FF3C]/15 px-2 py-1 text-[0.48rem] font-bold text-[#DFFF9A]">ANP</span>}
                      {station.priceData?.gasoline && <span className="rounded-full border border-white/8 px-2 py-1 text-[0.48rem] font-bold text-white/45">{station.priceData.gasoline.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/L</span>}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-white/20" />
                </div>
              </button>
            ))}
          </div>

          {!total && (
            <div className="mt-3 rounded-3xl border border-white/8 bg-[#121B22] p-6 text-center">
              <p className="text-sm font-black">Nada encontrado no cadastro local.</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">A busca externa continua disponível para locais que não estão incorporados ao Trajeto.</p>
              <button type="button" onClick={() => window.open(googleSearch((input || "locais") + ", Águas Lindas de Goiás, GO"), "_blank", "noopener,noreferrer")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]"><Navigation className="size-4" />Buscar no mapa</button>
            </div>
          )}
        </section>

        <footer className="mt-8 pb-4 text-center text-[0.54rem] leading-relaxed text-white/25">
          O cadastro público é identificado pela fonte correspondente. Dados de mapa e navegação externa não são tratados como cadastro oficial do Trajeto.
        </footer>
      </div>
    </main>
  );
}
