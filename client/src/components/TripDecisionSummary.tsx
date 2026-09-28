import { ArrowRight, CheckCircle2, Fuel, Route, Share2, WifiOff } from "lucide-react";

type TripDecisionSummaryProps = {
  distance: string;
  duration: string;
  recommendationName?: string | null;
  detourKm?: number | null;
  detourSource?: "real" | "estimated" | null;
  fuelCost?: number | null;
  litersNeeded?: number | null;
  autonomyKm?: number | null;
  offline: boolean;
  snapshot?: boolean;
  snapshotSavedAt?: string | null;
  onNavigate: () => void;
  onShare: () => void;
  onSave: () => void;
  onRefresh?: () => void;
};

export default function TripDecisionSummary({
  distance, duration, recommendationName, detourKm, detourSource,
  fuelCost, litersNeeded, autonomyKm, offline, snapshot = false, snapshotSavedAt, onNavigate, onShare, onSave, onRefresh,
}: TripDecisionSummaryProps) {
  const hasFuel = Number.isFinite(fuelCost ?? NaN) || Number.isFinite(litersNeeded ?? NaN);
  const hasAutonomy = Number.isFinite(autonomyKm ?? NaN);
  const snapshotAge = snapshotSavedAt ? (() => {
    const time = Date.parse(snapshotSavedAt);
    if (!Number.isFinite(time)) return null;
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.round(hours / 24);
    return `há ${days} d`;
  })() : null;
  const isSavedSnapshot = snapshot && !offline;

  return (
    <section aria-labelledby="trip-decision-title" className="mt-6 border border-[#BFCFC4] bg-[#163840] p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Minha viagem</p>
          <h2 id="trip-decision-title" className="font-display mt-2 text-3xl font-semibold tracking-[-0.055em]">{offline ? "Rota pronta no aparelho." : isSavedSnapshot ? "Rota salva pronta." : "Decisão pronta."}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">Destino, parada e impacto da viagem reunidos em uma única decisão.</p>
        </div>
        {offline ? (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#FFB86B]/25 bg-[#FFB86B]/10 px-3 text-xs font-bold text-[#FFD4AE]"><WifiOff className="size-3.5" /> Offline</span>
        ) : isSavedSnapshot ? (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#FFC928]/20 bg-[#FFC928]/10 px-3 text-xs font-bold text-[#FFE89A]"><Route className="size-3.5" /> Snapshot salvo{snapshotAge ? ` · ${snapshotAge}` : ""}</span>
        ) : (
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#C7FF3C]/20 bg-[#C7FF3C]/10 px-3 text-xs font-bold text-[#DFFF9A]"><CheckCircle2 className="size-3.5" /> Dados atuais</span>
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Distância</p>
          <p className="mt-1 text-lg font-extrabold">{distance}</p>
          <p className="text-xs text-white/50">{duration}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Próxima parada</p>
          <p className="mt-1 truncate text-lg font-extrabold">{recommendationName ?? "Não definida"}</p>
          <p className="text-xs text-white/50">{detourKm != null ? "Desvio " + detourKm.toLocaleString("pt-BR") + " km" + (detourSource === "real" ? " · real" : "") : "Sem desvio calculado"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Combustível</p>
          {hasFuel ? (
            <>
              <p className="mt-1 text-lg font-extrabold">{fuelCost != null ? fuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Estimado"}</p>
              <p className="text-xs text-white/50">{litersNeeded != null ? litersNeeded.toLocaleString("pt-BR") + " L" : "Custo indisponível"}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-extrabold">Não calculado</p>
              <p className="text-xs text-white/50">Configure veículo e consumo</p>
            </>
          )}
        </div>
      </div>

      {hasAutonomy && <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white/70"><Fuel className="size-4 text-[#C7FF3C]" /><span>Autonomia estimada: <strong className="text-white">{autonomyKm!.toLocaleString("pt-BR")} km</strong>.</span></div>}

      <div className="mt-4 flex flex-wrap gap-2">{offline && <p role="status" className="basis-full rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[0.06] px-3 py-2 text-xs font-bold text-[#FFD4AE]">Esta é uma cópia local da rota. Você pode continuar vendo a decisão sem internet; dados novos e navegação externa dependem de conexão.</p>}
        <button type="button" onClick={onNavigate} disabled={offline} aria-disabled={offline} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">Começar viagem <ArrowRight className="size-4" /></button>
        <button type="button" onClick={onSave} disabled={offline && snapshot} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:border-white/30 disabled:cursor-default disabled:opacity-45" aria-label={offline && snapshot ? "Rota já salva neste aparelho" : "Salvar rota offline"}><Route className="size-4" /> {offline && snapshot ? "Salva no aparelho" : "Salvar offline"}</button>
        {snapshot && onRefresh && !offline && <button type="button" onClick={onRefresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C7FF3C]/30 px-4 text-sm font-bold text-[#DFFF9A]">Calcular dados atuais</button>}
        <button type="button" onClick={onShare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:border-white/30"><Share2 className="size-4" /> Compartilhar</button>
      </div>
    </section>
  );
}
