import { CheckCircle2, Sparkles, RotateCcw, Navigation, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";

const KEY = "trajeto-trip-checklist";

const defaults = [
  ["combustivel", "Combustível suficiente para o primeiro trecho"],
  ["documentos", "CNH e documentos do veículo"],
  ["rota", "Rota principal e rota alternativa salvas"],
  ["offline", "Rota disponível sem internet"],
] as const;

export default function TripPrepCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored) ? stored as Record<string, boolean> : {};
    } catch { return {}; }
  });
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [, setLocation] = useLocation();
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(() => getLastTrip());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  useEffect(() => {
    const refresh = () => {
      void listOfflineRoutes().then(routes => setSavedRoutes(routes.length)).catch(() => {});
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

  const localRouteReady = savedRoutes > 0;
  const hasTrip = Boolean(lastTrip);
  const toggle = (id: string) => setChecked(current => ({ ...current, [id]: !current[id] }));
  const smartChecked: Record<string, boolean> = {
    ...checked,
    rota: checked.rota || hasTrip,
    offline: checked.offline || localRouteReady,
  };
  const progress = defaults.filter(([id]) => smartChecked[id]).length;
  const ready = progress === defaults.length;

  const openPreparedTrip = () => {
    if (!lastTrip) return;
    if (!online) {
      setLocation(appUrl("/planejar") + "?salvos=1");
      return;
    }
    setLocation(
      appUrl("/planejar") +
        "?origem=" + encodeURIComponent(lastTrip.origin) +
        "&destino=" + encodeURIComponent(lastTrip.destination),
    );
  };

  return (
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0F2]"><CheckCircle2 className="size-5 text-[#326575]" /></div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Antes de sair</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Checklist rápido da viagem.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">{progress}/{defaults.length} itens preparados. Rota e offline são reconhecidos automaticamente quando já estão prontos neste aparelho.</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E3E9EB]" aria-hidden="true"><div className="h-full rounded-full bg-[#326575] transition-all" style={{ width: `${(progress / defaults.length) * 100}%` }} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={`rounded-xl border p-3 ${hasTrip ? "border-[#326575]/25 bg-[#F2F5F6]" : "border-[#D8E0E3] bg-[#FCFDFD]"}`}>
          <Navigation className="size-4 text-[#326575]" />
          <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#617179]">Próxima viagem</p>
          <p className="mt-1 truncate text-xs font-extrabold">{hasTrip ? lastTrip?.destination : "Nenhuma definida"}</p>
        </div>
        <div className={`rounded-xl border p-3 ${localRouteReady ? "border-[#326575]/25 bg-[#F2F5F6]" : "border-[#D8E0E3] bg-[#FCFDFD]"}`}>
          <Smartphone className="size-4 text-[#326575]" />
          <p className="mt-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#617179]">Rotas locais</p>
          <p className="mt-1 text-xs font-extrabold">{savedRoutes} salvas no aparelho</p>
        </div>
      </div>

      <details className="mt-4 group" open={!ready}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-[#D8E0E3] bg-[#F8FAFA] px-3 py-2.5 text-xs font-extrabold text-[#36545C] [&::-webkit-details-marker]:hidden">
          <span>{ready ? "Checklist concluído" : "Revisar o que falta antes de sair"}</span>
          <span className="rounded-full bg-white px-2 py-1 text-[0.58rem] text-[#617179] group-open:hidden">abrir</span>
          <span className="hidden rounded-full bg-white px-2 py-1 text-[0.58rem] text-[#617179] group-open:inline">fechar</span>
        </summary>
        <div className="mt-2 space-y-2">
        {defaults.map(([id, label]) => (
          <label key={id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#D8E0E3] bg-[#FCFDFD] px-3 py-2 transition-colors has-[:checked]:border-[#326575]/40 has-[:checked]:bg-[#F2F5F6]">
            <input type="checkbox" checked={Boolean(smartChecked[id])} onChange={() => toggle(id)} disabled={(id === "rota" && hasTrip) || (id === "offline" && localRouteReady)} className="size-5 accent-[#326575]" />
            <span className={smartChecked[id] ? "text-sm font-semibold text-[#58706D] line-through" : "text-sm font-semibold"}>{label}{((id === "rota" && hasTrip) || (id === "offline" && localRouteReady)) && <span className="ml-1 text-[0.58rem] font-bold text-[#326575]">(auto)</span>}</span>
          </label>
        ))}
        </div>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-bold text-[#617179]">{ready ? "Tudo pronto para sair." : `${defaults.length - progress} ${defaults.length - progress === 1 ? "item" : "itens"} ainda pendente(s).`}</span>
        <button type="button" onClick={() => setChecked({})} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#D8E0E3] px-2.5 text-[0.62rem] font-bold text-[#617179]"><RotateCcw className="size-3" /> Limpar</button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#D8E0E3] bg-[#F8FAFA] px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[0.62rem] font-bold text-[#617179]">
          <span className={online ? "size-2 rounded-full bg-[#326575]" : "size-2 rounded-full bg-[#C77B3C]"} />
          {online ? "Internet disponível para novas consultas." : "Offline: use as rotas já salvas."}
        </span>
        {!online && savedRoutes > 0 && <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?salvos=1")} className="min-h-9 shrink-0 rounded-lg bg-[#163840] px-2.5 text-[0.58rem] font-extrabold text-white">Abrir salvos</button>}
      </div>

      {ready && hasTrip && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-[#326575]/25 bg-[#163840] p-3 text-white shadow-[0_10px_28px_rgba(22,56,64,.14)]">
          <div className="min-w-0">
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.12em] text-[#C7FF3C]">{online ? "Pronto para sair" : "Preparado neste aparelho"}</p>
            <p className="mt-1 truncate text-xs font-extrabold">{lastTrip?.origin} → {lastTrip?.destination}</p>
          </div>
          <button type="button" onClick={openPreparedTrip} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-extrabold text-[#0B1014] active:scale-[.98]">{online ? "Iniciar" : "Abrir salvos"}</button>
        </div>
      )}
      {ready && !hasTrip && localRouteReady && (
        <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#326575]/20 bg-[#F2F5F6] p-3">
          <span className="text-[0.62rem] font-bold text-[#52636C]">Você já tem rotas disponíveis sem internet.</span>
          <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?salvos=1")} className="min-h-10 rounded-xl bg-[#163840] px-3 text-[0.62rem] font-extrabold text-white">Abrir rotas</button>
        </div>
      )}
      {ready && (
        <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-[#326575]/20 bg-[#F2F5F6] p-3 text-xs font-bold text-[#326575]"><Sparkles className="size-4" /> {online ? "Tudo preparado. Você pode iniciar a viagem." : "Tudo preparado. Continue uma rota salva sem internet."}</div>
      )}
    </section>
  );
}
