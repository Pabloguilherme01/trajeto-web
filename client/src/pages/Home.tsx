import { ArrowRight, Heart, LocateFixed, Navigation, Search, Share2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { resolveIntentQuery } from "@/lib/intentResolver";
import { normalizePlaceSearchText } from "@/lib/placeSearch";
import { searchOfflineDestinations } from "@/lib/offlineDestinations";
import { listMobileStationFavorites } from "@/lib/mobileStationStore";
import { shareText, vibration } from "@/lib/mobileTools";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";

export default function Home() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [savedCount, setSavedCount] = useState(() => listMobileStationFavorites().length);
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setRecentSearches(getRecentSearches());
      setSavedCount(listMobileStationFavorites().length);
      setLastTrip(getLastTrip());
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const searchPlaces = (value: string) => {
    const query = value.trim();
    if (query.length < 3) {
      setMessage("Digite pelo menos 3 caracteres.");
      return;
    }

    setMessage(null);
    rememberSearch(query);

    const offline = searchOfflineDestinations(query)[0];
    const normalizedQuery = normalizePlaceSearchText(query);
    const normalizedName = offline ? normalizePlaceSearchText(offline.name) : "";
    const normalizedShortName = offline ? normalizePlaceSearchText(offline.shortName) : "";
    const exactOffline = Boolean(
      offline &&
      query.length >= 4 &&
      (normalizedQuery === normalizedName || normalizedQuery === normalizedShortName),
    );

    if (exactOffline) {
      rememberIntent("route");
      vibration(8);
      setLocation(appUrl("/local/" + encodeURIComponent(offline.id)));
      return;
    }

    const intent = resolveIntentQuery(query);
    rememberIntent(intent.kind === "route" ? "route" : "explore");
    vibration();

    if (intent.kind === "route") {
      setLocation(appUrl("/planejar") + "?offline=1&destino=" + encodeURIComponent(query));
      return;
    }

    setLocation(appUrl("/mapa") + "?q=" + encodeURIComponent(intent.query));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    searchPlaces(input);
  };

  const findNearby = () => {
    if (locating) return;
    rememberIntent("nearby");
    setMessage(null);
    if (!navigator.geolocation) {
      setLocation(appUrl("/mapa"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        vibration(16);
        setLocation(appUrl("/mapa") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude);
      },
      () => {
        setLocating(false);
        setMessage("Não foi possível obter sua localização. Você pode pesquisar pelo bairro ou endereço.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const shareHome = async () => {
    try {
      await shareText(
        "Trajeto · explore Águas Lindas, encontre lugares, serviços e postos e navegue.",
        window.location.origin + appUrl("/"),
        "Trajeto",
      );
    } catch {
      setMessage("Não foi possível abrir o compartilhamento.");
    }
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
      <div className="container max-w-3xl pt-4 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="brand-wordmark text-[1.25rem] text-white">trajeto</p>
            <p className="mt-1 text-[0.5rem] font-black uppercase tracking-[.18em] text-white/30">explorar · decidir · chegar</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-[0.5rem] font-black " + (online ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-[#C7FF3C]" : "border-[#FFB86B]/25 bg-[#FFB86B]/[.04] text-[#FFB86B]")}>
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "online" : "offline"}
            </span>
            <button type="button" onClick={() => void shareHome()} className="mobile-action-icon border-white/8 bg-white/[.025] text-white/55" aria-label="Compartilhar Trajeto">
              <Share2 className="size-4" />
            </button>
          </div>
        </header>

        <section className="mt-8">
          <p className="text-[0.52rem] font-black uppercase tracking-[.18em] text-[#C7FF3C]">Encontrar</p>
          <h1 className="mobile-title mt-2 font-display text-[clamp(2.7rem,12vw,5rem)] font-semibold leading-[.9] tracking-[-.075em]">
            O que você quer<br />
            <span className="text-[#C7FF3C]">encontrar?</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/40">
            Busque lugares, serviços, bairros ou referências. Depois veja no mapa, confira a fonte e escolha como chegar.
          </p>
        </section>

        <section className="mt-6">
          <form onSubmit={submit} className="rounded-[1.6rem] border border-white/10 bg-[#121B22] p-3 shadow-[0_22px_60px_rgba(0,0,0,.28)]">
            <label htmlFor="home-place-search" className="sr-only">Buscar na cidade</label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
              <Search className="size-4 shrink-0 text-[#3DE3FF]" />
              <input
                id="home-place-search"
                value={input}
                onChange={event => { setInput(event.target.value); setMessage(null); }}
                className="min-h-13 min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/22"
                placeholder="Posto, hospital, escola, Vapt Vupt, bairro…"
                autoComplete="street-address"
                enterKeyHint="search"
              />
              <button type="submit" disabled={input.trim().length < 3} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014] disabled:opacity-25" aria-label="Pesquisar na cidade">
                <ArrowRight className="size-5" />
              </button>
            </div>
          </form>

          {message && (
            <p role="status" aria-live="polite" className="mt-2 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] px-3 py-2.5 text-[0.58rem] font-bold text-[#FFD59B]">
              {message}
            </p>
          )}
        </section>

        <section className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={findNearby} disabled={locating} className="mobile-action mobile-action-primary flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left disabled:opacity-45">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/10"><LocateFixed className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-black">{locating ? "Localizando…" : "Perto de mim"}</span><span className="mt-0.5 block text-[0.52rem] font-bold text-[#19323A]/65">Usar GPS somente quando você pedir</span></span>
            <ArrowRight className="size-4" />
          </button>

          <button type="button" onClick={() => { rememberIntent("route"); setLocation(appUrl("/planejar")); }} className="mobile-action mobile-action-secondary flex min-h-14 items-center gap-3 rounded-2xl border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-4 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Navigation className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-black text-white">No caminho</span><span className="mt-0.5 block text-[0.52rem] font-bold text-white/35">Rota + postos + desvio</span></span>
            <ArrowRight className="size-4 text-white/25" />
          </button>
        </section>


        <section className="mt-3 grid grid-cols-3 gap-2" aria-label="Atalhos locais">
          <button type="button" onClick={() => setLocation(appUrl("/mapa") + "?q=Centro")} className="mobile-action mobile-action-secondary min-h-12 rounded-2xl px-3 text-[0.56rem]">
            ★ Centro
          </button>
          <button type="button" onClick={() => setLocation(appUrl("/mapa") + "?q=emergencia")} className="mobile-action mobile-action-secondary min-h-12 rounded-2xl border-[#FF7D6A]/20 bg-[#FF7D6A]/[.04] px-3 text-[0.56rem] text-[#FFB7A9]">
            ⚠ Emergência
          </button>
          <button type="button" onClick={() => setLocation(appUrl("/mapa"))} className="mobile-action mobile-action-secondary min-h-12 rounded-2xl px-3 text-[0.56rem]">
            🗺 Explorar
          </button>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-white/25">Explorar a cidade</p><h2 className="mt-1 text-base font-black">O que você precisa?</h2></div>
            <button type="button" onClick={() => setLocation(appUrl("/mapa"))} className="mobile-action mobile-action-secondary min-h-10 rounded-xl border-0 bg-transparent px-2 text-[.52rem] font-black text-[#3DE3FF]">Abrir mapa</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["⛽","Postos","postos"],
              ["🏥","Saúde","hospital"],
              ["🏫","Educação","escola"],
              ["🚌","Transporte","transporte"],
              ["🏛","Serviços","servico publico"],
            ].map(([icon,label,query]) => (
              <button key={label} type="button" onClick={() => { rememberSearch(query); setLocation(appUrl("/mapa") + "?q=" + encodeURIComponent(query)); }} className="mobile-action mobile-action-secondary min-h-14 rounded-2xl border-white/8 bg-white/[.025] px-3 text-left">
                <span className="text-base" aria-hidden="true">{icon}</span>
                <span className="mt-1 block text-[.55rem] font-black text-white/70">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {lastTrip && (
          <section className="mt-4 rounded-2xl border border-white/8 bg-[#111A21] p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.04] text-[#C7FF3C]"><Navigation className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-white/25">Última rota</p>
                <p className="mt-1 truncate text-[0.66rem] font-black text-white">{lastTrip.origin} → {lastTrip.destination}</p>
              </div>
              <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination))} className="mobile-action mobile-action-secondary min-h-10 shrink-0 rounded-xl px-3 text-[0.52rem] font-black text-white/65">
                Retomar
              </button>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-white/8 bg-[#111A21] p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.04] text-[#C7FF3C]"><Heart className="size-4" fill={savedCount ? "currentColor" : "none"} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-white/25">Salvos</p>
              <p className="mt-1 text-[0.64rem] font-black text-white">{savedCount ? savedCount + " posto(s) neste aparelho" : "Nenhum posto salvo ainda"}</p>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/salvos"))} className="min-h-10 shrink-0 rounded-xl border border-white/8 px-3 text-[0.52rem] font-black text-white/60">
              Abrir
            </button>
          </div>
        </section>

        {recentSearches.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-white/25">Histórico local</p>
                <h2 className="mt-1 text-base font-black">Buscas recentes</h2>
              </div>
            </div>
            <div className="mobile-scroll-x mt-2 flex gap-2 overflow-x-auto pb-1">
              {recentSearches.slice(0, 6).map(item => (
                <button key={item} type="button" onClick={() => searchPlaces(item)} className="min-h-10 max-w-[13rem] shrink-0 truncate rounded-xl border border-white/8 bg-white/[.02] px-3 text-[0.55rem] font-bold text-white/50">
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {!online && (
          <section className="mt-5 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-3.5">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[#FFCF96]" />
              <div>
                <p className="text-[0.6rem] font-black text-[#FFD59B]">Você está offline</p>
                <p className="mt-1 text-[0.54rem] leading-relaxed text-white/35">
                  Favoritos, histórico e dados armazenados continuam disponíveis. Busca Perto de mim e serviços externos podem exigir conexão.
                </p>
              </div>
            </div>
          </section>
        )}

        {isGitHubPagesRuntime() && (
          <p className="mt-6 pb-2 text-center text-[0.48rem] leading-relaxed text-white/20">
            Catálogo local + ANP quando disponível. Google Maps é usado apenas quando a função precisa de mapa, localização ou navegação.
          </p>
        )}
      </div>
    </main>
  );
}

