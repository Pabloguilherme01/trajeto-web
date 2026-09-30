import { BadgeInfo, ChevronRight, CircleCheck, Fuel, Heart, Loader2, Map, MapPin, Navigation, Search, Share2, SlidersHorizontal, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { appUrl } from "@/lib/appUrl";
import { buildGoogleMapsNearbyStationsUrl, buildGoogleMapsSearchUrl, openNavigation, shareText, vibration } from "@/lib/mobileTools";
import { getCachedStations, cacheStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "@/lib/mobileStationStore";
import { getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { corridorPresets } from "@/lib/corridorPresets";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { AGUAS_LINDAS_ANP_VERIFIED_COUNT, AGUAS_LINDAS_STATIONS_COUNT, AGUAS_LINDAS_STATIONS_LAST_SYNC, AGUAS_LINDAS_STATIONS_SOURCE, AGUAS_LINDAS_STATIONS_UPDATED_AT, getStationDataQualityLabel, searchAguasLindasStations, stationMapsSearchUrl } from "@/lib/aguasLindasStations";
import { inferredBrand } from "@/lib/stationListControls";
import { StationMap } from "@/components/StationMap";
import { toast } from "sonner";

function getInitialQuery() {
  if (typeof window === "undefined") return corridorPresets[0]?.query || "postos";
  return new URLSearchParams(window.location.search).get("q") || corridorPresets[0]?.query || "postos";
}

export default function Stations() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const [input, setInput] = useState(getInitialQuery);
  const [query, setQuery] = useState(getInitialQuery);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [nearby, setNearby] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [saved, setSaved] = useState<MobileStation[]>(listMobileStationFavorites);
  const [locating, setLocating] = useState(false);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [addressOnly, setAddressOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const verifiedFilterAvailable = AGUAS_LINDAS_ANP_VERIFIED_COUNT > 0;

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const showSavedOnly = params.get("salvos") === "1";
  const staticRuntime = isGitHubPagesRuntime();
  const localDirectory = useMemo(() => {
    if (!staticRuntime || showSavedOnly) return [];
    const matches = searchAguasLindasStations(query);
    const filtered = matches.filter(station =>
      (neighborhoodFilter === "all" || station.neighborhood === neighborhoodFilter) &&
      (brandFilter === "all" || (station.brand ?? "Sem bandeira") === brandFilter) &&
      (!addressOnly || Boolean(station.address)) &&
      (!verifiedOnly || station.dataQuality === "anp-confirmed" || station.dataOrigin === "ANP")
    );
    return [...filtered].sort((a, b) =>
      (a.neighborhood ?? "").localeCompare(b.neighborhood ?? "", "pt-BR") ||
      a.displayName.localeCompare(b.displayName, "pt-BR")
    );
  }, [query, showSavedOnly, staticRuntime, neighborhoodFilter, brandFilter, addressOnly, verifiedOnly]);
  const localBrands = useMemo(() => [...new Set(searchAguasLindasStations("postos").map(station => station.brand ?? "Sem bandeira"))].sort((a,b) => a.localeCompare(b, "pt-BR")), []);
  const localNeighborhoods = useMemo(
    () => [...new Set(searchAguasLindasStations("postos").map(station => station.neighborhood).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    []
  );

  const stationPages = trpc.stationDirectory.search.useInfiniteQuery(
    hasCoordinates ? { query, lat, lng } : { query },
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

  const cachedSnapshot = getCachedStations(query, hasCoordinates ? lat : undefined, hasCoordinates ? lng : undefined);
  const stations = showSavedOnly ? saved : liveStations.length > 0 ? liveStations : cachedSnapshot?.stations ?? [];
  const visibleStations = onlyOpen ? stations.filter(station => station.isOpen === true) : stations;
  const compared = visibleStations.filter(station => compareIds.includes(station.placeId));
  const recentSearches = getRecentSearches();

  const searchedAt = stationPages.data?.pages[0]?.queriedAt
    ? new Date(stationPages.data.pages[0].queriedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const cachedAt = cachedSnapshot?.savedAt
    ? new Date(cachedSnapshot.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const usingCache = !online && liveStations.length === 0 && stations.length > 0;

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
      cacheStations(query, liveStations as unknown as MobileStation[], hasCoordinates ? lat : undefined, hasCoordinates ? lng : undefined);
    }
  }, [liveStations, query, hasCoordinates, lat, lng]);

  useEffect(() => {
    document.title = query.trim() ? "Postos em " + query.trim() + " · Trajeto" : "Postos · Trajeto";
  }, [query]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 3) {
      toast.error("Digite uma cidade, bairro, endereço ou nome de posto.");
      return;
    }
    rememberIntent("stations");
    rememberSearch(trimmed);
    vibration();
    setQuery(trimmed);
    setShowMap(false);
    setCompareIds([]);
    setOnlyOpen(false);
    setNeighborhoodFilter("all");
    setBrandFilter("all");
    setAddressOnly(false);
    setVerifiedOnly(false);
    setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(trimmed));
  };

  const useNearby = () => {
    if (!online || !navigator.geolocation || locating) {
      if (!online) toast.message("Sem internet. Uma nova busca por perto precisa de conexão.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        rememberIntent("nearby");
        setNearby(true);
        setOnlyOpen(false);
        setNeighborhoodFilter("all");
        setBrandFilter("all");
        setAddressOnly(false);
        setVerifiedOnly(false);
        vibration(18);
        if (staticRuntime) {
          window.location.assign(buildGoogleMapsNearbyStationsUrl(position.coords.latitude, position.coords.longitude));
          return;
        }
        setQuery("postos");
        setInput("postos próximos");
        setLocation(appUrl("/postos") + "?q=postos&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
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

  const toggleSaved = (station: typeof stations[number]) => {
    const result = toggleMobileStationFavorite(station as unknown as MobileStation);
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
    if (typeof station.lat === "number" && typeof station.lng === "number") {
      const urls = openNavigation(station.lat, station.lng, station.name);
      window.open(urls.google, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(buildGoogleMapsSearchUrl([station.name, station.address].filter(Boolean).join(", ")), "_blank", "noopener,noreferrer");
  };

  const shareCurrent = async () => {
    try {
      const url = window.location.origin + appUrl("/postos") + "?q=" + encodeURIComponent(query);
      await shareText("Postos em " + query + " · consulta do Trajeto", url, "Trajeto · postos");
    } catch {}
  };

  const openSaved = () => {
    rememberIntent("saved");
    setLocation(appUrl("/postos") + "?salvos=1");
  };

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.56rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Postos</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.06em]">{showSavedOnly ? "Seus salvos." : "Encontre uma parada."}</h1>
          </div>
          <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.54rem] font-black " + (online ? "border-[#C7FF3C]/20 text-[#C7FF3C]" : "border-[#FFB86B]/25 text-[#FFB86B]")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "online" : "offline"}
          </span>
        </header>

        {!showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_20px_55px_rgba(0,0,0,.25)] sm:p-5">
            <form onSubmit={submit}>
              <label className="block text-[0.56rem] font-black uppercase tracking-[.14em] text-white/35" htmlFor="station-search">Cidade, bairro ou posto</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <Search className="size-4 shrink-0 text-[#3DE3FF]" />
                <input id="station-search" value={input} onChange={event => setInput(event.target.value)} autoComplete="street-address" enterKeyHint="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" placeholder="Ex.: Águas Lindas de Goiás" />
                <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </form>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={useNearby} disabled={locating || !online} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#C7FF3C] px-3.5 text-[0.6rem] font-black text-[#0B1014] disabled:opacity-40">
                <Navigation className="size-3.5" /> {locating ? "GPS…" : "Perto de mim"}
              </button>
              {!staticRuntime && (
                <button type="button" onClick={() => setOnlyOpen(current => !current)} className={onlyOpen ? "min-h-11 shrink-0 rounded-full bg-[#3DE3FF] px-3.5 text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 py-2 text-[0.6rem] font-bold text-white/65"}>
                  <CircleCheck className="mr-1 inline size-3.5" /> Abertos agora
                </button>
              )}
              <button type="button" onClick={() => void shareCurrent()} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 text-[0.6rem] font-bold text-white/65"><Share2 className="mr-1 inline size-3.5" /> Enviar</button>
              <button type="button" onClick={openSaved} className="min-h-11 shrink-0 rounded-full border border-white/8 bg-white/[.03] px-3.5 text-[0.6rem] font-bold text-white/65"><Heart className="mr-1 inline size-3.5" /> Salvos {saved.length || ""}</button>
            </div>

            {recentSearches.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {recentSearches.slice(0, 4).map(item => (
                  <button key={item} type="button" onClick={() => {
                  setInput(item);
                  setQuery(item);
                  setOnlyOpen(false);
                  setNeighborhoodFilter("all");
                  setBrandFilter("all");
                  setAddressOnly(false);
                  setVerifiedOnly(false);
                  setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(item));
                }} className="max-w-[12rem] shrink-0 truncate rounded-full border border-white/8 px-3 py-2 text-[0.57rem] font-bold text-white/40">{item}</button>
                ))}
              </div>
            )}
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-[#3DE3FF]/20 bg-[#0F1A20] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="public-stations-title">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Navigation className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Modo público</p>
                <h2 id="public-stations-title" className="mt-1 text-lg font-black">Pesquisar postos sem esperar por servidor.</h2>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-white/45">Esta versão está hospedada como site estático. A busca ao vivo é entregue pelo Google Maps, enquanto favoritos e dados já salvos continuam no aparelho.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Pesquisar no Google Maps</button>
              <button type="button" onClick={useNearby} disabled={locating || !online} className="min-h-12 rounded-xl border border-[#3DE3FF]/25 bg-[#3DE3FF]/[.05] px-3 text-xs font-black text-[#C9F7FF]">Postos perto de mim</button>
            </div>
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-5 rounded-[1.6rem] border border-[#C7FF3C]/20 bg-[#111A21] p-4 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-5" aria-labelledby="local-directory-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.56rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Diretório local</p>
                <h2 id="local-directory-title" className="mt-1 text-xl font-black">{localDirectory.length} cadastro(s) encontrados</h2>
                <p className="mt-2 text-[0.66rem] leading-relaxed text-white/45">Base de Águas Lindas atualizada em {new Date(AGUAS_LINDAS_STATIONS_UPDATED_AT + "T12:00:00").toLocaleDateString("pt-BR")}. Sincronização ANP de referência: {new Date(AGUAS_LINDAS_STATIONS_LAST_SYNC + "T12:00:00").toLocaleDateString("pt-BR")}. {AGUAS_LINDAS_STATIONS_SOURCE}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.5rem] font-black text-white/40">{AGUAS_LINDAS_STATIONS_COUNT} base</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Filtrar diretório por bairro</span>
                <select value={neighborhoodFilter} onChange={event => setNeighborhoodFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white outline-none">
                  <option value="all">Todos os bairros</option>
                  {localNeighborhoods.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
                </select>
              </label>
              <label className="min-w-0"><span className="sr-only">Filtrar diretório por bandeira</span><select value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white outline-none"><option value="all">Todas as bandeiras</option>{localBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold text-white/70"><input type="checkbox" checked={addressOnly} onChange={event => setAddressOnly(event.target.checked)} className="size-4 accent-[#C7FF3C]" /> Com endereço</label>
              <label className={"flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-[#0B1014] px-3 text-xs font-bold " + (verifiedFilterAvailable ? "text-white/70" : "text-white/35")}><input type="checkbox" checked={verifiedOnly} onChange={event => setVerifiedOnly(event.target.checked)} disabled={!verifiedFilterAvailable} className="size-4 accent-[#C7FF3C] disabled:opacity-40" /> Dados ANP {verifiedFilterAvailable ? "(" + AGUAS_LINDAS_ANP_VERIFIED_COUNT + ")" : "(não sincronizados)"}</label>
            </div>

            {localDirectory.length ? (
              <>
              <div className="mt-4 flex items-center justify-between gap-2" aria-live="polite">
                <p className="text-[0.58rem] font-black uppercase tracking-[.12em] text-white/30">{localDirectory.length} resultado(s) · {localDirectory.filter(item => item.address).length} com endereço</p>
                <span className="text-[0.55rem] text-white/25">ordenado por bairro</span>
              </div>
              <div className="mt-3 space-y-2">
                {localDirectory.map(station => {
                  const statusText = getStationDataQualityLabel(station);
                  return (
                    <article key={station.cnpj} className="rounded-[1.25rem] border border-white/8 bg-[#0B1014] p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
                          <Fuel className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white">{station.displayName}</p>
                              <p className="mt-1 text-[0.58rem] font-semibold text-white/35">{station.legalName} · CNPJ {station.cnpj}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] px-2 py-1 text-[0.46rem] font-black text-[#D9FF91]">{statusText}</span>
                          </div>
                          {station.address ? (
                            <p className="mt-2 text-[0.62rem] leading-relaxed text-white/45">{station.address}</p>
                          ) : (
                            <p className="mt-2 text-[0.62rem] leading-relaxed text-white/30">Endereço físico não consolidado nesta coleta.</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => window.open(stationMapsSearchUrl(station), "_blank", "noopener,noreferrer")} className="min-h-11 flex-1 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]">Abrir no Google Maps</button>
                        {station.address && <button type="button" onClick={() => void copyAddress(station)} className="min-h-11 rounded-xl border border-white/8 px-3 text-[0.6rem] font-black text-white/65">Copiar endereço</button>}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[0.5rem] text-white/25">
                        <span>{station.neighborhood ?? "Bairro não consolidado"}</span>
                        <span>{station.brand ?? "Bandeira não consolidada"}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-xs text-white/45">Nenhum cadastro local corresponde à busca “{query}” nesse bairro.</div>
            )}
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.57rem] leading-relaxed text-white/35">
            Fonte e natureza do dado: cadastro empresarial público e referências públicas locais. A ANP mantém o cadastro oficial de revendedores autorizados; preços e situação operacional podem mudar e devem ser verificados antes da viagem.
          </section>
        )}

        {staticRuntime && !showSavedOnly && (
          <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.58rem] leading-relaxed text-white/35">
            <p><strong className="text-white/55">Confiabilidade:</strong> cadastro ativo é uma informação cadastral; não confirma funcionamento neste momento, preço atual ou coordenada exata.</p>
            <p className="mt-1">A ANP disponibiliza cadastro oficial e também uma API de revendedores com endereço, produtos, distribuidor, tancagem, bicos, situação de interdição e coordenadas quando disponíveis.</p>
          </section>
        )}

        {nearby && (
          <section className="mt-3 flex items-start gap-3 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />
            <div><p className="text-xs font-black">Busca por proximidade</p><p className="mt-1 text-[0.58rem] leading-relaxed text-white/40">A localização foi usada para ordenar a consulta; suas coordenadas não são exibidas publicamente pelo Trajeto.</p></div>
          </section>
        )}

        {stationPages.isLoading && !showSavedOnly && (
          <section className="mt-5 grid gap-2" role="status" aria-live="polite">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl border border-white/8 bg-[#121B22]" />)}
          </section>
        )}

        {stationPages.isError && !stations.length && !showSavedOnly && (
          <section className="mt-5 rounded-3xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-5">
            <p className="text-sm font-black">A consulta não respondeu.</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">O objetivo continua disponível no Google Maps enquanto o serviço do Trajeto não responde.</p>
            <button type="button" onClick={() => window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")} className="mt-4 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">Abrir no Google Maps</button>
          </section>
        )}

        {(!staticRuntime && (stations.length > 0 || showSavedOnly)) && (
          <>
            <section className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-white/25">{usingCache ? "Cache local" : searchedAt ? "Consulta atual" : "Neste aparelho"}</p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">{visibleStations.length} resultado(s)</h2>
                <p className="mt-1 text-[0.56rem] text-white/30">{usingCache ? "Salvos em " + cachedAt : searchedAt ? "Atualizado em " + searchedAt : "Favoritos locais"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMap(current => !current)} disabled={!visibleStations.length} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-white/60" aria-label={showMap ? "Ocultar mapa" : "Mostrar mapa"}><Map className="size-4" /></button>
                {compareIds.length > 0 && <button type="button" onClick={() => document.getElementById("station-compare")?.scrollIntoView({ behavior: "smooth" })} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.58rem] font-black text-[#0B1014]">{compareIds.length} comparar</button>}
              </div>
            </section>

            {showMap && visibleStations.length > 0 && (
              <section className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-[#121B22]">
                <div className="h-[min(62vh,500px)]"><StationMap stations={visibleStations} /></div>
              </section>
            )}

            <section className="mt-3 space-y-2" aria-label="Resultados de postos">
              {visibleStations.map((station, index) => {
                const isSaved = saved.some(item => item.placeId === station.placeId);
                const isCompared = compareIds.includes(station.placeId);
                return (
                  <article key={station.placeId} className={"rounded-[1.35rem] border bg-[#121B22] p-4 " + (isCompared ? "border-[#3DE3FF]/50" : "border-white/8")}>
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="truncate text-sm font-black">{station.name}</p><p className="mt-1 truncate text-[0.6rem] text-white/35">{inferredBrand(station.name)} · {station.distanceLabel || "distância indisponível"}</p></div>
                          {station.isOpen === true && <span className="shrink-0 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.48rem] font-black text-[#D9FF91]">aberto</span>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[0.64rem] leading-relaxed text-white/40">{station.address}</p>
                      </div>
                    </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => navigateTo(station)} className="col-span-2 min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.6rem] font-black text-[#0B1014]"><Navigation className="mr-1 inline size-3.5" />Navegar</button>
                      <button type="button" onClick={() => toggleSaved(station)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isSaved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/[.06] text-[#FFB7A9]" : "border-white/8 text-white/55")} aria-label={isSaved ? "Remover dos salvos" : "Salvar posto"}><Heart className="size-4" fill={isSaved ? "currentColor" : "none"} /></button>
                      <button type="button" onClick={() => toggleCompare(station.placeId)} className={"grid min-h-11 min-w-0 place-items-center rounded-xl border " + (isCompared ? "border-[#3DE3FF]/40 bg-[#3DE3FF]/[.08] text-[#3DE3FF]" : "border-white/8 text-white/55")} aria-label={isCompared ? "Remover da comparação" : "Comparar posto"}><SlidersHorizontal className="size-4" /></button>
                    </div>
                    {index === 0 && <p className="mt-2 text-center text-[0.5rem] font-bold text-white/20">Ações principais ficam sempre no alcance do polegar.</p>}
                  </article>
                );
              })}
            </section>

            {stationPages.hasNextPage && (
              <button type="button" onClick={() => void stationPages.fetchNextPage()} disabled={stationPages.isFetchingNextPage} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.025] text-xs font-black text-white/60 disabled:opacity-40">
                {stationPages.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                {stationPages.isFetchingNextPage ? "Carregando mais postos…" : "Mostrar mais postos"}
              </button>
            )}

            {compared.length > 0 && (
              <section id="station-compare" className="mt-5 rounded-[1.5rem] border border-[#3DE3FF]/20 bg-[#121B22] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[0.55rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Comparação</p><h3 className="mt-1 text-xl font-black">{compared.length} parada(s)</h3></div>
                  <button type="button" onClick={() => setCompareIds([])} className="grid size-9 place-items-center rounded-lg border border-white/8 text-white/40" aria-label="Limpar comparação"><X className="size-4" /></button>
                </div>
                <div className="mt-3 space-y-2">
                  {compared.map(item => <button key={item.placeId} type="button" onClick={() => navigateTo(item)} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[#0B1014] px-3 text-left"><span className="min-w-0 truncate text-xs font-black">{item.name}<span className="ml-2 text-[0.55rem] font-normal text-white/35">{item.distanceLabel || "sem distância"}</span></span><ChevronRight className="size-4 shrink-0 text-[#3DE3FF]" /></button>)}
                </div>
              </section>
            )}

            <section className="mt-4 rounded-3xl border border-white/8 bg-white/[.025] p-4">
              <details>
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-black"><span>Como ler estes dados</span><BadgeInfo className="size-4 text-white/25" /></summary>
                <div className="mt-2 space-y-2 text-[0.6rem] leading-relaxed text-white/35">
                  <p>Endereço, horário, telefone e distância dependem da consulta atual do provedor de mapas.</p>
                  <p>Referências de preço aparecem separadas e nunca são tratadas como preço em tempo real.</p>
                  <p>Um item salvo neste aparelho funciona como atalho local e não precisa de conta.</p>
                </div>
              </details>
            </section>
          </>
        )}

        {!stations.length && !stationPages.isLoading && (
          <section className="mt-5 rounded-3xl border border-white/8 bg-[#121B22] p-5 text-center">
            <Fuel className="mx-auto size-5 text-white/25" />
            <p className="mt-3 text-sm font-black">{showSavedOnly ? "Nenhum posto salvo." : "Pesquise uma região para começar."}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/35">O Trajeto mostra resultados encontrados na consulta atual e separa as referências oficiais quando disponíveis.</p>
          </section>
        )}

        <footer className="mt-10 pb-3 text-center text-[0.55rem] leading-relaxed text-white/25">
          O Trajeto organiza os resultados; a navegação é aberta no provedor escolhido.
        </footer>
      </div>
    </main>
  );
}
