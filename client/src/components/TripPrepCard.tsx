import { CheckCircle2, Sparkles, RotateCcw, Navigation, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";

const KEY = "trajeto-trip-checklist";

const defaults = [
  ["combustivel", "Combustível suficiente para o primeiro trecho"],
  ["documentos", "CNH e documentos do veículo"],
  ["rota", "Rota da viagem salva neste aparelho"],
  ["offline", "Conexão ou rota offline pronta"],
] as const;

const routeTarget = (route: OfflineRoute) =>
  appUrl("/planejar") +
  "?rota=" + encodeURIComponent(route.id) +
  "&origem=" + encodeURIComponent(route.origin) +
  "&destino=" + encodeURIComponent(route.destination);

export default function TripPrepCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored) ? stored as Record<string, boolean> : {};
    } catch { return {}; }
  });
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [latestOfflineRoute, setLatestOfflineRoute] = useState<OfflineRoute | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [, setLocation] = useLocation();
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(() => getLastTrip());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  useEffect(() => {
    const refresh = () => {
      void listOfflineRoutes()
        .then(routes => {
          setStorageError(false);
          setSavedRoutes(routes.length);
          setLatestOfflineRoute(routes[0] ?? null);
        })
        .catch(() => {
          setStorageError(true);
          setSavedRoutes(0);
          setLatestOfflineRoute(null);
        });
      setLastTrip(getLastTrip());
    };
    refresh();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const localRouteReady = Boolean(latestOfflineRoute);
  const hasTrip = Boolean(lastTrip);
  const activeOfflineDestination = !online && latestOfflineRoute ? latestOfflineRoute.destination : null;
  const toggle = (id: string) => setChecked(current => ({ ...current, [id]: !current[id] }));
  const smartChecked: Record<string, boolean> = {
    ...checked,
    rota: checked.rota || localRouteReady,
    offline: checked.offline || (!online ? localRouteReady : false),
  };
  const progress = defaults.filter(([id]) => smartChecked[id]).length;
  const ready = progress === defaults.length;

  const openPreparedTrip = () => {
    if (!online) {
      if (latestOfflineRoute) {
        setLocation(routeTarget(latestOfflineRoute));
      } else {
        setLocation(appUrl("/planejar?salvos=1"));
      }
      return;
    }
    if (!lastTrip) {
      setLocation(latestOfflineRoute ? routeTarget(latestOfflineRoute) : appUrl("/planejar"));
      return;
    }
    setLocation(
      appUrl("/planejar") +
        "?origem=" + encodeURIComponent(lastTrip.origin) +
        "&destino=" + encodeURIComponent(lastTrip.destination),
    );
  };

  return (
    <section className="mobile-card rounded-3xl border border-white/10 bg-[#111A21] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]"><CheckCircle2 className="size-5 text-[#3DE3FF]" /></div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Antes de sair</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">{online ? "Deixe a próxima viagem pronta." : latestOfflineRoute ? "Sua viagem continua pronta." : "Prepare uma rota para usar offline."}</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#8FA3AC]">{online ? `${progress}/${defaults.length} itens preparados. O Trajeto reconhece o que já está pronto neste aparelho.` : latestOfflineRoute ? "A rota salva pode ser reaberta neste aparelho sem recalcular." : "Sem uma rota salva, o modo offline não consegue preparar uma nova viagem."}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-[#3DE3FF] transition-all" style={{ width: `${(progress / defaults.length) * 100}%` }} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={`rounded-xl border p-3 ${hasTrip ? "border-[#326575]/25 bg-white/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
          <Navigation className="size-4 text-[#3DE3FF]" />
          <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#8FA3AC]">Próxima viagem</p>
          <p className="mt-1 truncate text-xs font-extrabold">{activeOfflineDestination ?? (hasTrip ? lastTrip?.destination : "Nenhuma definida")}</p>
        </div>
        <div className={`rounded-xl border p-3 ${localRouteReady ? "border-[#326575]/25 bg-white/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
          <Smartphone className="size-4 text-[#3DE3FF]" />
          <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#8FA3AC]">Rotas locais</p>
          <p className="mt-1 text-xs font-extrabold">{storageError ? "Armazenamento indisponível" : savedRoutes + (savedRoutes === 1 ? " rota salva" : " rotas salvas")}</p>
        </div>
      </div>

      <details className="mt-4 group" open={!ready}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-extrabold text-white [&::-webkit-details-marker]:hidden">
          <span>{ready ? "Checklist concluído" : "Revisar o que falta antes de sair"}</span>
          <span className="rounded-full bg-white/[0.03] px-2 py-1 text-[0.58rem] text-[#8FA3AC] group-open:hidden">abrir</span>
          <span className="hidden rounded-full bg-white/[0.03] px-2 py-1 text-[0.58rem] text-[#8FA3AC] group-open:inline">fechar</span>
        </summary>
        <div className="mt-2 space-y-2">
        {defaults.map(([id, label]) => (
          <label key={id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors has-[:checked]:border-[#326575]/40 has-[:checked]:bg-white/[0.05]">
            <input type="checkbox" checked={Boolean(smartChecked[id])} onChange={() => toggle(id)} disabled={(id === "rota" && localRouteReady) || (id === "offline" && localRouteReady)} className="size-5 accent-[#326575]" />
            <span className={smartChecked[id] ? "text-sm font-semibold text-[#B7C4CA] line-through" : "text-sm font-semibold"}>{label}{((id === "rota" && localRouteReady) || (id === "offline" && localRouteReady)) && <span className="ml-1 text-[0.58rem] font-bold text-[#3DE3FF]">(auto)</span>}</span>
          </label>
        ))}
        </div>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-bold text-[#8FA3AC]">{ready ? (online ? "Tudo pronto para sair." : "Tudo pronto para continuar.") : `${defaults.length - progress} ${defaults.length - progress === 1 ? "item" : "itens"} ainda pendente(s).`}</span>
        <button type="button" onClick={() => setChecked({})} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[0.62rem] font-bold text-[#8FA3AC]"><RotateCcw className="size-3" /> Limpar</button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[0.62rem] font-bold text-[#8FA3AC]">
          <span className={online ? "size-2 rounded-full bg-[#3DE3FF]" : "size-2 rounded-full bg-[#C77B3C]"} />
          {storageError ? "Não foi possível verificar as rotas deste aparelho." : online ? "Online: pronto para novas consultas." : latestOfflineRoute ? "Offline: uma rota pronta para continuar." : "Offline: nenhuma rota salva pronta."}
        </span>
        {!online && latestOfflineRoute && !storageError && (
          <button type="button" onClick={openPreparedTrip} className="min-h-9 shrink-0 rounded-lg bg-[#C7FF3C] text-[#0B1014] px-2.5 text-[0.58rem] font-extrabold">
            Continuar
          </button>
        )}
      </div>

      {storageError && (
        <div role="alert" className="mt-4 rounded-xl border border-[#FFB5A1]/30 bg-[#3A1F1A] px-3 py-2 text-xs font-bold text-[#FFB5A1]">
          O navegador não conseguiu acessar as rotas salvas. Tente novamente antes de sair.
        </div>
      )}

      {ready && !storageError && (
        <div className="mt-4 rounded-2xl border border-[#326575]/20 bg-white/[0.05] p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#3DE3FF]">
            <Sparkles className="size-4 shrink-0" />
            <span>{online ? "Tudo preparado. O próximo passo é sair." : latestOfflineRoute ? "Tudo preparado. O próximo passo é continuar a rota salva." : "Salve uma rota quando estiver online para habilitar a continuidade offline."}</span>
          </div>
          <button type="button" onClick={openPreparedTrip} disabled={!online && !latestOfflineRoute} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#C7FF3C] text-[#0B1014] px-4 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40">
            {online ? "Iniciar próxima viagem" : latestOfflineRoute ? "Continuar rota salva" : "Sem rota salva"}
          </button>
        </div>
      )}
    </section>
  );
}
