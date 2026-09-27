import { BatteryCharging, CheckCircle2, Fuel, Gauge, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "trajeto-trip-checklist";

const defaults = [
  ["combustivel", "Combustível suficiente para o primeiro trecho"],
  ["documentos", "CNH e documentos do veículo"],
  ["rota", "Rota principal e rota alternativa salvas"],
  ["offline", "Rota disponível sem internet"],
] as const;

export default function TripPrepCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const toggle = (id: string) => setChecked(current => ({ ...current, [id]: !current[id] }));
  const progress = defaults.filter(([id]) => checked[id]).length;

  return (
    <section className="rounded-3xl border border-[#CFD9DD] bg-white p-5 text-[#0B1014] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0F2]"><CheckCircle2 className="size-5 text-[#326575]" /></div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Antes de sair</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Checklist rápido da viagem.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">{progress}/{defaults.length} itens preparados. A lista fica salva neste aparelho.</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {defaults.map(([id, label]) => (
          <label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#D8E0E3] px-3 py-2">
            <input type="checkbox" checked={Boolean(checked[id])} onChange={() => toggle(id)} className="size-5 accent-[#326575]" />
            <span className={checked[id] ? "text-sm font-semibold text-[#58706D] line-through" : "text-sm font-semibold"}>{label}</span>
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-[0.62rem] font-bold text-[#617179]">
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><Fuel className="size-3.5" /> combustível</span>
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><WifiOff className="size-3.5" /> offline</span>
        <span className="flex items-center gap-1 rounded-lg bg-[#F2F5F6] p-2"><ShieldCheck className="size-3.5" /> segurança</span>
      </div>
    </section>
  );
}
