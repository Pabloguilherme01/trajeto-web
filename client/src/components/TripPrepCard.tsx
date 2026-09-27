import { CheckCircle2, Fuel, ShieldCheck, WifiOff, Sparkles, RotateCcw, Navigation, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes } from "@/lib/offlineStore";

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
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
    };
  }, []);

  const toggle = (id: string) => setChecked(current => ({ ...current, [id]: !current[id] }));
  const progress = defaults.filter(([id]) => checked[id]).length;
  const ready = progress === defaults.length;
  const localRouteReady = savedRoutes > 0;
  const hasTrip = Boolean(lastTrip);

  return (
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0F2]"><CheckCircle2 className="size-5 text-[#326575]" /></div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Antes de sair</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Checklist rápido da viagem.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">{progress}/{defaults.length} itens preparados. O Trajeto também verifica o que já está salvo neste aparelho.</p>
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

      <div className="mt-4 space-y-2">
        {defaults.map(([id, label]) => (
          <label key={id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#D8E0E3] bg-[#FCFDFD] px-3 py-2 transition-colors has-[:checked]:border-[#326575]/40 has-[:checked]:bg-[#F2F5F6]">
            <input type="checkbox" checked={Boolean(checked[id])} onChange={() => toggle(id)} className="size-5 accent-[#326575]" />
            <span className={checked[id] ? "text-sm font-semibold text-[#58706D] line-through" : "text-sm font-semibold"}>{label}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-bold text-[#617179]">{ready ? "Tudo pronto para sair." : `${defaults.length - progress} ${defaults.length - progress === 1 ? "item" : "itens"} ainda pendente(s).`}</span>
        <button type="button" onClick={() => setChecked({})} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#D8E0E3] px-2.5 text-[0.62rem] font-bold text-[#617179]"><RotateCcw className="size-3" /> Limpar</button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[0.62rem] font-bold text-[#617179]">
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><Fuel className="size-3.5" /> combustível</span>
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><WifiOff className="size-3.5" /> offline</span>
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><ShieldCheck className="size-3.5" /> segurança</span>
      </div>

      {ready && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-[#326575]/20 bg-[#F2F5F6] p-3 text-xs font-bold text-[#326575]"><Sparkles className="size-4" /> Checklist concluído. Você pode iniciar a viagem.</div>}
    </section>
  );
}
