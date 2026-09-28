import { CheckCircle2, Fuel, Navigation, RefreshCw, Route, Save, Share2, WifiOff, Map } from "lucide-react";

type Props = {
  destination: string;
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
  saved?: boolean;
  onNavigate: () => void;
  onShare: () => void;
  onSave: () => void | Promise<void>;
  onRefresh?: () => void;
  onStations: () => void;
  onGoogleMaps?: () => void;
  onWaze?: () => void;
  onAppleMaps?: () => void;
};

export default function MobileNavigationCenter({
  destination, distance, duration, recommendationName, detourKm, detourSource,
  fuelCost, litersNeeded, autonomyKm, offline, snapshot = false, snapshotSavedAt,
  saved = false, onNavigate, onShare, onSave, onRefresh, onStations, onGoogleMaps, onWaze, onAppleMaps,
}: Props) {
  const snapshotAge = snapshotSavedAt ? (() => {
    const time = Date.parse(snapshotSavedAt);
    if (!Number.isFinite(time)) return null;
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    return `há ${Math.round(hours / 24)} d`;
  })() : null;

  const canNavigate = !offline;
  const status = offline ? "Offline" : snapshot ? `Snapshot salvo${snapshotAge ? ` · ${snapshotAge}` : ""}` : "Dados atuais";

  return (
    <section aria-labelledby="navigation-center-title" className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#C7D4CA] bg-[#101A20] text-white shadow-[0_22px_70px_rgba(0,0,0,.24)]">
      <div className="border-b border-white/8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#C7FF3C]">Centro de navegação</p>
            <h2 id="navigation-center-title" className="mt-2 font-display text-[clamp(1.8rem,7vw,2.8rem)] font-semibold leading-[.95] tracking-[-.055em]">Pronto para ir.</h2>
            <p className="mt-2 truncate text-sm font-semibold text-white/65" title={destination}>→ {destination}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-2 text-[0.58rem] font-black text-white/65">
            {offline ? <WifiOff className="size-3.5" /> : <CheckCircle2 className="size-3.5 text-[#C7FF3C]" />}
            {status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-white/40">Rota</p>
            <p className="mt-1 text-base font-black">{distance}</p>
            <p className="text-[0.65rem] text-white/45">{duration}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-white/40">Combustível</p>
            <p className="mt-1 text-base font-black">{fuelCost != null ? fuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p>
            <p className="text-[0.65rem] text-white/45">{litersNeeded != null ? `${litersNeeded.toLocaleString("pt-BR")} L` : "configure o veículo"}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-white/40">Parada</p>
            <p className="mt-1 truncate text-base font-black">{recommendationName ?? "—"}</p>
            <p className="text-[0.65rem] text-white/45">{detourKm != null ? `${detourKm.toLocaleString("pt-BR")} km de desvio` : "sem parada calculada"}</p>
          </div>
        </div>

        {autonomyKm != null && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.05] px-3 py-2.5 text-xs text-[#E4F9B5]">
            <Fuel className="size-4 shrink-0" />
            Autonomia estimada: <strong>{autonomyKm.toLocaleString("pt-BR")} km</strong>
          </div>
        )}
        {recommendationName && detourKm != null && (
          <p className="mt-3 text-[0.68rem] leading-relaxed text-white/50">
            Parada sugerida: <strong className="text-white/75">{recommendationName}</strong>. Desvio {detourSource === "real" ? "real" : "estimado"}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <button type="button" onClick={onNavigate} disabled={!canNavigate} className="col-span-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] shadow-[0_10px_28px_rgba(199,255,60,.12)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2">
          <Navigation className="size-5" /> Navegar agora
        </button>
        <button type="button" onClick={onStations} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white/[.07] px-3 text-xs font-black text-white active:scale-[.98]">
          <Fuel className="size-4" /> Paradas
        </button>
        <button type="button" onClick={onShare} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white/[.07] px-3 text-xs font-black text-white active:scale-[.98]">
          <Share2 className="size-4" /> Enviar
        </button>
        <button type="button" onClick={() => void onSave()} disabled={saved || (offline && snapshot)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black text-white disabled:cursor-default disabled:opacity-50">
          {saved ? <CheckCircle2 className="size-4 text-[#C7FF3C]" /> : <Save className="size-4" />} {saved ? "Salva" : "Salvar"}
        </button>
        {onGoogleMaps && <button type="button" onClick={onGoogleMaps} disabled={offline} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-3 text-xs font-black text-[#BCEFFA] disabled:opacity-40"><Map className="size-4" /> Google Maps</button>}
        {onWaze && <button type="button" onClick={onWaze} disabled={offline} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] px-3 text-xs font-black text-[#FFD9AF] disabled:opacity-40">Waze</button>}
        {onAppleMaps && <button type="button" onClick={onAppleMaps} disabled={offline} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-white disabled:opacity-40">Apple Maps</button>}
        {snapshot && onRefresh && !offline && (
          <button type="button" onClick={onRefresh} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C7FF3C]/25 px-3 text-xs font-black text-[#DFFF9A]">
            <RefreshCw className="size-4" /> Atualizar
          </button>
        )}
      </div>

      <p className="border-t border-white/8 px-4 py-2.5 text-center text-[0.56rem] font-semibold leading-relaxed text-white/40">
        {offline
          ? "A rota salva continua disponível. Dados novos e navegação externa precisam de conexão."
          : "O Google Maps abre a navegação externa. Mantenha a atenção na direção."}
      </p>
    </section>
  );
}
