import { ArrowRight, Compass, Fuel, Hospital, MapPin, Navigation, Search as SearchIcon, ShieldAlert, Store, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { AGUAS_LINDAS_STATIONS, searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { getRecentSearches, rememberSearch } from "@/lib/mobilePreferences";

function googleSearch(query: string) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

const quickActions = [
  { label: "Postos", query: "postos", icon: Fuel, internal: true },
  { label: "Perto de mim", query: "nearby", icon: Compass, internal: true },
  { label: "Centro", query: "Centro, Águas Lindas de Goiás, GO", icon: MapPin, internal: false },
  { label: "Hospitais / UPA", query: "hospitais UPA, Águas Lindas de Goiás, GO", icon: Hospital, internal: false },
  { label: "Polícia", query: "polícia, Águas Lindas de Goiás, GO", icon: ShieldAlert, internal: false },
  { label: "Farmácias", query: "farmácias, Águas Lindas de Goiás, GO", icon: Store, internal: false },
] as const;

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const [input, setInput] = useState(() => params.get("q") || "");
  const [query, setQuery] = useState(() => params.get("q") || "");
  const [recents, setRecents] = useState(getRecentSearches);
  const results = useMemo(() => {
    const value = query.trim();
    if (!value) return AGUAS_LINDAS_STATIONS.slice(0, 8);
    return searchAguasLindasStations(value).slice(0, 12);
  }, [query]);

  useEffect(() => {
    const next = params.get("q") || "";
    setInput(next);
    setQuery(next);
  }, [params]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      setQuery("");
      return;
    }
    rememberSearch(value);
    setRecents(getRecentSearches());
    setQuery(value);
    setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(value));
  };

  const openQuick = (action: typeof quickActions[number]) => {
    if (action.query === "nearby") {
      if (!navigator.geolocation) {
        setLocation(appUrl("/mapa"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation(appUrl("/postos") + "?q=postos&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude);
        },
        () => setLocation(appUrl("/mapa")),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
      );
      return;
    }
    if (action.internal) {
      rememberSearch(action.query);
      setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(action.query));
      return;
    }
    window.open(googleSearch(action.query), "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-4xl pt-5 sm:pt-8">
        <header>
          <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Busca universal</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">Encontre o que precisa.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">A busca local usa os dados disponíveis no Trajeto. Para categorias sem cadastro local, o aplicativo abre uma busca externa sem inventar resultados.</p>
        </header>

        <form onSubmit={submit} className="mt-5 flex min-h-14 items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#121B22] px-3">
          <SearchIcon className="size-5 shrink-0 text-[#C7FF3C]" />
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Posto, nome, endereço ou bairro"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Buscar locais"
          />
          {input && <button type="button" onClick={() => { setInput(""); setQuery(""); setLocation(appUrl("/buscar")); }} className="grid size-10 place-items-center rounded-xl text-white/40" aria-label="Limpar busca"><X className="size-4" /></button>}
          <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar"><ArrowRight className="size-4" /></button>
        </form>

        <section className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" onClick={() => openQuick(action)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/8 bg-[#121B22] px-3.5 text-[0.62rem] font-black text-white/70 active:scale-[.98]">
                  <Icon className="size-3.5 text-[#3DE3FF]" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </section>

        {recents.length > 0 && !query && (
          <section className="mt-5">
            <p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-white/25">Recentes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recents.slice(0, 8).map(item => (
                <button key={item} type="button" onClick={() => { setInput(item); setQuery(item); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(item)); }} className="rounded-full border border-white/8 bg-white/[.03] px-3 py-2 text-[0.62rem] font-bold text-white/60">
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Locais do Trajeto</p>
              <h2 className="mt-1 text-xl font-black">{query ? results.length + " resultado(s)" : "Principais locais"}</h2>
            </div>
            {query && results.length === 0 && <span className="text-[0.58rem] font-bold text-white/35">Nenhum cadastro local</span>}
          </div>

          <div className="mt-3 space-y-2">
            {results.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { rememberSearch(item.displayName); setLocation(appUrl("/local/" + encodeURIComponent(item.id))); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#121B22] p-4 text-left transition active:scale-[.995]"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Fuel className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{item.displayName}</p>
                  <p className="mt-1 line-clamp-2 text-[0.63rem] leading-relaxed text-white/42">{item.address || item.neighborhood || "Endereço não consolidado"}</p>
                  <p className="mt-1 text-[0.52rem] font-bold text-white/25">{item.cnpj ? "Cadastro CNPJ disponível" : "CNPJ não informado"}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-white/25" />
              </button>
            ))}
          </div>

          {results.length === 0 && (
            <div className="mt-3 rounded-2xl border border-white/8 bg-[#121B22] p-5">
              <p className="text-sm font-black">Não encontrei esse termo no catálogo local.</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">Você pode abrir a pesquisa externa sem que o Trajeto transforme um resultado externo em cadastro próprio.</p>
              <button type="button" onClick={() => window.open(googleSearch(query + ", Águas Lindas de Goiás, GO"), "_blank", "noopener,noreferrer")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">
                <Navigation className="size-4" /> Buscar fora do Trajeto
              </button>
            </div>
          )}
        </section>

        <footer className="mt-8 pb-4 text-center text-[0.54rem] text-white/25">
          O catálogo local é limitado às fontes incorporadas ao aplicativo. Resultados externos permanecem identificados como externos.
        </footer>
      </div>
    </main>
  );
}
