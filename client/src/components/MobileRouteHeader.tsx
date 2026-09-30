import { ArrowDownUp, Bookmark, ExternalLink, Gauge, Navigation, Share2, Wifi, WifiOff } from "lucide-react";

type Props = {
  origin: string;
  destination: string;
  online: boolean;
  planned: boolean;
  distance?: string | null;
  duration?: string | null;
  onInvert: () => void;
  onNavigate?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onOpenSaved?: () => void;
};

export default function MobileRouteHeader({
  origin,
  destination,
  online,
  planned,
  distance,
  duration,
  onInvert,
  onNavigate,
  onShare,
  onSave,
  onOpenSaved,
}: Props) {
  return (
    <section className="mb-5 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0D151B] text-white shadow-[0_18px_45px_rgba(0,0,0,.16)] md:hidden" aria-label="Resumo da viagem">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <span className="flex items-center gap-2 text-[0.52rem] font-black uppercase tracking-[0.14em] text-[#7F919A]">
          {online ? <Wifi className="size-3.5 text-[#C7FF3C]" /> : <WifiOff className="size-3.5 text-[#FFB86B]" />}
          {online ? "Dados ao vivo disponíveis" : "Modo offline"}
        </span>
        {planned && distance && duration ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.52rem] font-black text-white/70">
            <Gauge className="size-3" /> {distance} · {duration}
          </span>
        ) : <span className="text-[0.5rem] font-bold text-white/35">preparação</span>}
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3">
          <span className="mt-1 size-2 rounded-full bg-[#3DE3FF] ring-4 ring-[#3DE3FF]/10" />
          <div className="min-w-0">
            <p className="text-[0.48rem] font-black uppercase tracking-[0.12em] text-white/35">Origem</p>
            <p className="mt-0.5 truncate text-xs font-extrabold text-white">{origin || "Defina a origem"}</p>
          </div>
          <span className="mt-1 size-2 rounded-full bg-[#C7FF3C] ring-4 ring-[#C7FF3C]/10" />
          <div className="min-w-0">
            <p className="text-[0.48rem] font-black uppercase tracking-[0.12em] text-white/35">Destino</p>
            <p className="mt-0.5 truncate text-xs font-extrabold text-white">{destination || "Defina o destino"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onInvert} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.6rem] font-black text-white/75">
            <ArrowDownUp className="size-3.5" /> Inverter
          </button>
          {planned && onNavigate ? (
            <button type="button" onClick={onNavigate} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]">
              <Navigation className="size-3.5" /> Navegar
            </button>
          ) : onOpenSaved ? (
            <button type="button" onClick={onOpenSaved} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]">
              <Bookmark className="size-3.5" /> Rotas salvas
            </button>
          ) : null}
        </div>

        {planned && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {onSave && <button type="button" onClick={onSave} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[0.05] px-3 text-[0.58rem] font-black text-[#DFFF9A]"><Bookmark className="size-3.5" /> Salvar offline</button>}
            {onShare && <button type="button" onClick={onShare} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.58rem] font-black text-white/70"><Share2 className="size-3.5" /> Compartilhar</button>}
          </div>
        )}

        {!online && planned && (
          <p className="mt-3 flex items-center gap-1.5 text-[0.54rem] leading-relaxed text-[#FFD49C]">
            <ExternalLink className="size-3 shrink-0" /> Navegadores externos precisam de conexão e podem recalcular o percurso.
          </p>
        )}
      </div>
    </section>
  );
}
