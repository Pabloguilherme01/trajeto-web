import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { corridorPresets, type CorridorPreset } from "@/lib/corridorPresets";








import DailyCommandCenter from "@/components/DailyCommandCenter";
import MobileUtilityHub from "@/components/MobileUtilityHub";





import { ArrowRight, BadgeCheck, Bookmark, Download, Fuel, History, MapPinned, Navigation, Search, ShieldCheck, TimerReset, LocateFixed, WifiOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { getLastTrip, getRecentSearches, mobilePreferenceEvent, rememberSearch } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { useLocation } from "wouter";

const anpQualityUrl = "https://anpcomvcpostos.anp.gov.br/";

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [activePresetId, setActivePresetId] = useState<CorridorPreset["id"]>(corridorPresets[0]?.id ?? "aguas-lindas");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [offlineStorageError, setOfflineStorageError] = useState(false);
  const [latestSavedRoute, setLatestSavedRoute] = useState<OfflineRoute | null>(null);
  const [lastTrip, setLastTrip] = useState(() => getLastTrip());
  const track = useProductEvents();
  const activePreset = corridorPresets.find(item => item.id === activePresetId) ?? corridorPresets[0];

  useEffect(() => {
    const refresh = () => {
      setRecentSearches(getRecentSearches());
      void listOfflineRoutes().then(routes => {
        setOfflineStorageError(false);
        setSavedRoutes(routes.length);
        setLatestSavedRoute(routes[0] ?? null);
      }).catch(() => {
        setOfflineStorageError(true);
        setSavedRoutes(0);
        setLatestSavedRoute(null);
      });
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    refresh();
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const openSearch = (query: string, presetId = activePreset?.id) => {
    const normalized = query.trim() || activePreset?.query || "";
    if (!online) {
      setSearchError(savedRoutes > 0 ? "Sem internet. Abra uma rota salva para continuar neste aparelho." : "Sem internet. Prepare uma rota quando a conexão voltar.");
      return;
    }
    if (normalized.length < 3) {
      setSearchError("Digite pelo menos 3 caracteres para pesquisar.");
      return;
    }
    setSearchError(null);
    rememberSearch(normalized);
    track("station_search", normalized);
    setLocation(`${appUrl("/postos")}?region=${encodeURIComponent(presetId ?? "")}&q=${encodeURIComponent(normalized)}`);
  };

  const useMyLocation = () => {
    if (!online) {
      setSearchError(savedRoutes > 0 ? "Sem internet. A localização ao vivo precisa de conexão. Abra uma rota salva." : "Sem internet. A localização ao vivo precisa de conexão.");
      return;
    }
    if (!navigator.geolocation || locating) { if (!navigator.geolocation) setSearchError("Seu navegador não oferece localização."); return; }
    setSearchError(null);
    setLocationMessage(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => { setLocating(false); setLocationMessage("Localização encontrada. Abrindo postos próximos."); setLocation(`${appUrl("/postos")}?lat=${position.coords.latitude}&lng=${position.coords.longitude}&q=${encodeURIComponent("postos próximos")}`); },
      () => { setLocating(false); setLocationMessage("Localização indisponível. Você ainda pode pesquisar por cidade ou destino."); setSearchError("Não foi possível obter sua localização. Verifique a permissão do navegador."); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openSearch(search);
  };

  const openSavedRoutes = () => {
    if (latestSavedRoute) {
      setLocation(
        appUrl("/planejar") +
        "?rota=" + encodeURIComponent(latestSavedRoute.id) +
        "&origem=" + encodeURIComponent(latestSavedRoute.origin) +
        "&destino=" + encodeURIComponent(latestSavedRoute.destination),
      );
      return;
    }
    setLocation(appUrl("/planejar?salvos=1"));
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1014] pb-20 text-[#EAF0F2] md:pb-0">
      <header className="border-b border-white/8 bg-[#0B1014]">
        <div className="container flex h-[68px] items-center justify-between gap-4">
          <a href={appUrl("/")} className="flex items-center gap-2.5" aria-label="Trajeto — início">
            <img className="size-9 rounded-xl bg-[#C7FF3C] p-1.5" src={appUrl("/favicon.svg")} alt="" />
            <span className="brand-wordmark text-xl text-white">trajeto</span>
          </a>
          <div className="flex items-center gap-2">
            <a href={appUrl("/minha-conta")} className="hidden rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#9FB0B8] transition hover:bg-white/5 hover:text-white sm:inline-flex">Minha conta</a>
            <a href={appUrl("/planejar")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C7FF3C] px-3.5 py-2 text-xs font-extrabold text-[#0B1014] transition hover:bg-white sm:hidden"><Navigation className="size-4" /> Planejar</a>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-[#C7FF3C]/15 bg-[#0F171D]">
          <div className="container py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#C7FF3C]">Assistente pessoal de mobilidade</p>
                <p className="mt-1 text-sm font-bold text-white">{online ? "Prepare a rota antes de sair e deixe uma cópia no celular para quando a conexão falhar." : savedRoutes > 0 ? `Sem internet: ${savedRoutes} rota${savedRoutes === 1 ? "" : "s"} pronta${savedRoutes === 1 ? "" : "s"} para continuar neste aparelho.` : "Sem internet: não há uma rota pronta para continuar neste aparelho."}</p>
              </div>
              {online ? <a href={appUrl("/planejar")} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014] sm:w-auto">
                <Navigation className="size-4" /> Planejar agora
              </a> : offlineStorageError ? <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014] sm:w-auto">
                <Navigation className="size-4" /> Tentar novamente
              </button> : savedRoutes > 0 ? <button type="button" onClick={openSavedRoutes} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014] sm:w-auto">
                <Navigation className="size-4" /> Continuar última rota
              </button> : <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-extrabold text-[#7F919A] sm:w-auto">
                <WifiOff className="size-4" /> Sem rota salva
              </span>}
            </div>
          </div>
        </section>

        <section className="premium-surface border-b border-white/8">
          <div className="container grid gap-7 py-8 sm:gap-12 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#D9FF91]">
                <Navigation className="size-3.5" /> Águas Lindas de Goiás · Entorno
              </div>
              <h1 className="mt-5 font-display text-[clamp(2.9rem,14vw,7rem)] font-semibold leading-[0.86] tracking-[-0.075em] text-white sm:mt-6">
                Seu dia em movimento.<br /><span className="text-[#C7FF3C]">Mais simples.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[0.95rem] leading-[1.55] text-[#B7C4CA] sm:mt-7 sm:text-lg sm:leading-[1.65]">
                Planeje, compare e continue suas viagens pelo celular. Rotas, postos, custos e atalhos ficam organizados para a próxima saída.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-6">
                <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[0.55rem] font-black uppercase tracking-[.1em] text-white/55">sem cadastro</span>
                <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[0.55rem] font-black uppercase tracking-[.1em] text-white/55">dados locais</span>
                <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2.5 py-1.5 text-[0.55rem] font-black uppercase tracking-[.1em] text-[#C7FF3C]">offline preparado</span>
              </div>

              <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3">
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <MapPinned className="size-5 text-[#3DE3FF]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Postos reais</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Localização, distância e dados disponíveis na consulta.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <TimerReset className="size-5 text-[#C7FF3C]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Menos desvio</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Compare a parada com o impacto real na rota.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <BadgeCheck className="size-5 text-[#BDA5FF]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Fonte visível</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Referências oficiais aparecem separadas das estimativas.</p>
                </div>
              </div>
            </div>

            <section className="mobile-glass rounded-[1.4rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_60px_rgba(0,0,0,.28)] sm:rounded-[1.75rem] sm:p-7" aria-labelledby="search-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Comece aqui</p>
                  <h2 id="search-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">{online ? "Onde você vai passar?" : "Continue sua viagem"}</h2>
                </div>
                <Fuel className="size-6 text-[#C7FF3C]" />
              </div>

              <form onSubmit={submitSearch} className={online ? "mt-5" : "hidden"} noValidate>
                <label htmlFor="home-search" className="text-xs font-bold text-[#A9BAC2]">Cidade, bairro, posto ou destino</label>
                <div className="mt-2 flex rounded-2xl border border-white/12 bg-[#0B1014] p-1.5 focus-within:border-[#3DE3FF]">
                  <Search className="ml-3 mt-3 size-5 shrink-0 text-[#3DE3FF]" />
                  <input id="home-search" minLength={3} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? "home-search-error" : undefined} value={search} onChange={event => { setSearch(event.target.value); if (searchError) setSearchError(null); }} placeholder={activePreset?.query ?? "Ex.: Águas Lindas de Goiás"} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-[#657780]" />
                  <button type="submit" aria-label={online ? "Pesquisar postos" : "Buscar quando houver internet"} disabled={!online} className="grid size-11 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014] transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                    <ArrowRight className="size-5" />
                  </button>
                </div>
              </form>

              {locationMessage && <p role="status" aria-live="polite" className="mt-2 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-[0.62rem] font-bold text-[#8FA3AC]">{locationMessage}</p>}

              <div className={online ? "mt-2 grid grid-cols-2 gap-2" : "hidden"}>
                <button type="button" onClick={useMyLocation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-[#C6D1D6] transition hover:border-[#3DE3FF] active:scale-[.98]" disabled={locating}>
                  <LocateFixed className="size-4 text-[#3DE3FF]" /> {locating ? "Localizando…" : "Usar minha localização"}
                </button>
                <a href={appUrl("/planejar")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-[#C6D1D6] transition hover:border-[#C7FF3C]">
                  <Navigation className="size-4 text-[#C7FF3C]" /> Planejar viagem
                </a>
              </div>

              {online && recentSearches.length > 0 && <div className="mt-5 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]">Pesquisas recentes</p>
                  <span className="text-[0.58rem] font-semibold text-[#5F727B]">só neste aparelho</span>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {recentSearches.map(query => <button key={query} type="button" onClick={() => openSearch(query)} className="min-h-10 shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3.5 text-xs font-bold text-[#D7E0E4] transition hover:border-[#3DE3FF] hover:bg-[#3DE3FF]/8 active:scale-[.98]">{query}</button>)}
                </div>
              </div>}

              <div className="mt-6">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]">Buscas rápidas</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {corridorPresets.slice(0, 4).map(preset => (
                    <button key={preset.id} onClick={() => { setActivePresetId(preset.id); openSearch(preset.query, preset.id); }} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C7FF3C] hover:bg-[#C7FF3C]/8">
                      <span className="block text-xs font-extrabold text-white">{preset.label}</span>
                      <span className="mt-1 block text-[0.65rem] text-[#7F919A]">{preset.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-relaxed text-[#7F919A]">
                {online ? "Consulta pública. Entre somente se quiser salvar favoritos, veículos, rotas ou alertas." : latestSavedRoute ? "Esta rota já está no aparelho. Abra e continue sem recalcular." : "Quando a conexão voltar, prepare uma rota e salve-a para uso offline."}
              </p>
            </section>
          </div>
        </section>

        <DailyCommandCenter />

        <section className="border-b border-white/8 bg-[#0D141A] py-4 sm:py-7" aria-labelledby="mobile-snapshot-title">
          <div className="container">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Resumo operacional</p>
                <h2 id="mobile-snapshot-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.045em] text-white sm:text-2xl">Tudo que importa agora.</h2>
              </div>
              <span className="hidden text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#60737D] sm:block">dados deste aparelho</span>
            </div>
            <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
              <article className="min-w-[10rem] snap-start rounded-2xl border border-white/8 bg-white/[.035] p-3.5 md:min-w-0">
                <div className="flex items-center justify-between gap-2"><WifiOff className={online ? "size-4 text-[#C7FF3C]" : "size-4 text-[#FFC928]"} /><span className={online ? "text-[0.55rem] font-black uppercase tracking-[.1em] text-[#C7FF3C]" : "text-[0.55rem] font-black uppercase tracking-[.1em] text-[#FFC928]"}>{online ? "Conectado" : "Offline"}</span></div>
                <p className="mt-2 text-xs font-extrabold text-white">{online ? "Consultas ao vivo disponíveis" : "Modo local ativo"}</p>
                <p className="mt-1 text-[0.62rem] leading-relaxed text-[#73858E]">{online ? "Mapas e consultas novas podem ser abertas." : savedRoutes ? "Rotas já preparadas continuam acessíveis." : "Prepare uma rota quando a conexão voltar."}</p>
              </article>
              <button type="button" onClick={openSavedRoutes} className="min-w-[10rem] snap-start rounded-2xl border border-white/8 bg-white/[.035] p-3.5 text-left transition hover:border-[#C7FF3C]/35 active:scale-[.99] md:min-w-0">
                <div className="flex items-center justify-between gap-2"><Bookmark className="size-4 text-[#C7FF3C]" /><span className="text-[0.55rem] font-black uppercase tracking-[.1em] text-[#7F919A]">Offline</span></div>
                <p className="mt-2 text-xs font-extrabold text-white">{savedRoutes} {savedRoutes === 1 ? "rota salva" : "rotas salvas"}</p>
                <p className="mt-1 truncate text-[0.62rem] text-[#73858E]">{latestSavedRoute ? latestSavedRoute.origin + " → " + latestSavedRoute.destination : "Nenhuma rota preparada ainda"}</p>
              </button>
              <a href={lastTrip ? appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination) : appUrl("/planejar")} className="min-w-[10rem] snap-start rounded-2xl border border-white/8 bg-white/[.035] p-3.5 transition hover:border-[#BDA5FF]/35 active:scale-[.99] md:min-w-0">
                <div className="flex items-center justify-between gap-2"><History className="size-4 text-[#BDA5FF]" /><span className="text-[0.55rem] font-black uppercase tracking-[.1em] text-[#7F919A]">Última viagem</span></div>
                <p className="mt-2 text-xs font-extrabold text-white">{lastTrip ? "Repetir agora" : "Ainda não registrada"}</p>
                <p className="mt-1 truncate text-[0.62rem] text-[#73858E]">{lastTrip ? lastTrip.origin + " → " + lastTrip.destination : "Planeje a primeira viagem"}</p>
              </a>
              <div className="min-w-[10rem] snap-start rounded-2xl border border-white/8 bg-white/[.035] p-3.5 md:min-w-0">
                <div className="flex items-center justify-between gap-2"><Search className="size-4 text-[#3DE3FF]" /><span className="text-[0.55rem] font-black uppercase tracking-[.1em] text-[#7F919A]">Pesquisa</span></div>
                <p className="mt-2 text-xs font-extrabold text-white">{recentSearches.length} {recentSearches.length === 1 ? "consulta recente" : "consultas recentes"}</p>
                <p className="mt-1 truncate text-[0.62rem] text-[#73858E]">{recentSearches[0] ?? "Suas próximas buscas aparecerão aqui"}</p>
              </div>
            </div>
          </div>
        </section>

        <MobileUtilityHub />

        <section className="border-y border-white/8 bg-[#0F171D] py-14 text-white sm:py-18">
          <div className="container">
            <div className="max-w-2xl">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">Seu copiloto de deslocamento</p>
              <h2 className="mt-3 font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[0.9] tracking-[-0.07em]">Escolha → decida → salve → <em>continue mais rápido.</em></h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#52636C]">Você informa para onde vai. O Trajeto organiza o próximo passo. O que você repete fica no aparelho: destinos, viagens, buscas e rotas salvas. Se a conexão cair, o que já foi preparado continua acessível.</p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-[#111A21] p-5">
                <span className="text-xs font-black text-[#7F919A]">01</span>
                <h3 className="mt-8 text-xl font-extrabold text-white">Encontre</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9FB0B8]">Encontre o destino e as paradas que fazem sentido para a viagem.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#111A21] p-5">
                <span className="text-xs font-black text-[#7F919A]">02</span>
                <h3 className="mt-8 text-xl font-extrabold text-white">Decida</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9FB0B8]">Compare distância, duração e desvio antes de decidir.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#111A21] p-5">
                <span className="text-xs font-black text-[#7F919A]">03</span>
                <h3 className="mt-8 text-xl font-extrabold text-white">Continue</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9FB0B8]">Salve a decisão no aparelho. Depois, reabra a viagem mesmo sem conexão.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="instalar-app" className="border-b border-white/8 bg-[#10181F] py-10 sm:py-14">
          <div className="container">
            <div className="rounded-3xl border border-[#C7FF3C]/20 bg-[#121B22] p-5 sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#C7FF3C]">Funciona como aplicativo</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Instale o Trajeto no celular.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A8B9C0]">Na primeira visita com internet, abra o menu de instalação do navegador. O Trajeto salva o aplicativo e os recursos necessários para reabrir a interface sem conexão.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-[#9FB0B8]"><strong className="block text-white">Android / Chrome</strong>Use “Instalar app” ou “Adicionar à tela inicial”.</div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-[#9FB0B8]"><strong className="block text-white">iPhone / Safari</strong>Use Compartilhar → “Adicionar à Tela de Início”.</div>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-[#74878F]">Sem conexão, a interface e os dados que já foram armazenados no aparelho continuam acessíveis. Consultas novas a Google Maps e outros serviços exigem internet.</p>
                </div>
                <div className="hidden lg:grid size-24 place-items-center rounded-3xl bg-[#C7FF3C] text-[#0B1014]">
                  <Download className="size-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#10181F] py-14 sm:py-18">
          <div className="container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#C7FF3C]"><ShieldCheck className="size-5" /><span className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">Transparência</span></div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em] text-white sm:text-4xl">Preço de referência não é preço de bomba.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#9BAEB7]">Quando houver vínculo verificável, o Trajeto mostra a referência da ANP com data e fonte. Dados de mapas e estimativas próprias ficam identificados separadamente.</p>
            </div>
            <a href={anpQualityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-extrabold text-white transition hover:border-[#C7FF3C] hover:text-[#C7FF3C]">
              <BadgeCheck className="size-4" /> Ver fonte oficial
            </a>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#0B1014] py-12">
          <div className="container flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-white">Próximo passo</p>
              <p className="mt-1 text-xs text-[#7F919A]">Prepare uma rota antes de sair ou abra uma rota salva para continuar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={appUrl("/postos")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014]">Consultar postos <ArrowRight className="size-4" /></a>
              <a href={appUrl("/planejar")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-extrabold text-white">Planejar rota <Navigation className="size-4" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#070B0E] py-6">
        <div className="container flex flex-col gap-2 text-xs text-[#71828B] sm:flex-row sm:items-center sm:justify-between">
          <span>Trajeto · informação para quem se move no Entorno.</span>
          <a href={appUrl("/ajuda")} className="hover:text-white">Como funciona e fontes</a>
        </div>
      </footer>
    </div>
  );
}
