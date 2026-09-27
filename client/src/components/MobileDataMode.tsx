import { Gauge, Leaf, Zap } from "lucide-react";
import { useState } from "react";
import { getEconomyMode, setEconomyMode } from "@/lib/mobilePreferences";

export default function MobileDataMode({ onChange }: { onChange?: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState(getEconomyMode);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setEconomyMode(next);
    onChange?.(next);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
          {enabled ? <Leaf className="size-4" /> : <Gauge className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-white">Economia de dados</p>
          <p className="mt-0.5 text-[0.65rem] leading-relaxed text-[#7F919A]">
            {enabled ? "Menos resultados por lote e menos uso de recursos." : "Modo normal, com mais resultados por consulta."}
          </p>
        </div>
        <button type="button" onClick={toggle} aria-pressed={enabled} className={enabled ? "inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#C7FF3C] px-3 text-[0.65rem] font-extrabold text-[#0B1014]" : "inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/15 px-3 text-[0.65rem] font-bold text-white"}>
          <Zap className="size-3.5" /> {enabled ? "Ativo" : "Ativar"}
        </button>
      </div>
    </div>
  );
}
