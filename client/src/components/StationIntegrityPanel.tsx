import { CheckCircle2, CircleHelp } from "lucide-react";
import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import { stationFieldEvidence, type StationFieldSource } from "@/lib/stationEntity";

const sourceLabel: Record<StationFieldSource, string> = {
  ANP: "ANP",
  Google: "Google",
  Local: "Local",
  Indisponível: "Sem dado",
};

export default function StationIntegrityPanel({
  anp,
  local,
  price,
}: {
  anp?: AnpStation | null;
  local?: LocalStationRecord | null;
  price?: AnpPriceRecord | null;
}) {
  const fields = stationFieldEvidence({ anp, local, price });
  const available = fields.filter(field => field.available).length;

  return (
    <section aria-label="Integridade e procedência dos dados" className="rounded-2xl border border-white/8 bg-[#0B1014] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.47rem] font-black uppercase tracking-[.12em] text-[#3DE3FF]">Integridade do cadastro</p>
          <p className="mt-1 text-[0.55rem] text-white/40">{available}/{fields.length} campos disponíveis · a origem de cada campo fica explícita</p>
        </div>
        <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.03] px-2 py-1 text-[0.45rem] font-black text-[#D9FF91]">{available}/{fields.length}</span>
      </div>
      <div className="mt-3 divide-y divide-white/6">
        {fields.map(field => (
          <div key={field.field} className="flex items-center justify-between gap-3 py-2">
            <span className="text-[0.55rem] font-bold text-white/60">{field.label}</span>
            <span className="flex items-center gap-1.5 text-[0.5rem] font-black">
              {field.available ? <CheckCircle2 className="size-3 text-[#C7FF3C]" /> : <CircleHelp className="size-3 text-white/25" />}
              <span className={field.available ? "text-white/65" : "text-white/30"}>{sourceLabel[field.source]}</span>
              {field.updatedAt && <span className="text-white/25">{new Date(field.updatedAt).toLocaleDateString("pt-BR")}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
