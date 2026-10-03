import { useLocation } from "wouter";
import { MapPin, Route as RouteIcon } from "lucide-react";
import { LOCAL_READY_ROUTES, type RouteDestinationCategory } from "@/lib/localRoutePresets";
import { buildReusableTripPlannerUrl } from "@/lib/tripLinks";
import { DestinationActions } from "@/components/DestinationActions";
import { readyRouteDestination } from "@/lib/unifiedDestination";

const categoryLabel: Record<RouteDestinationCategory, string> = {
  saude: "Saúde",
  educacao: "Educação",
  servicos: "Serviços",
  transporte: "Transporte",
  compras: "Compras",
  combustivel: "Combustível",
  centro: "Cidade",
  alimentacao: "Alimentação",
};

export default function ReadyRouteShortcuts({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  const content = <>
    <p className="mt-2 text-xs leading-relaxed text-white/70">Escolha um trajeto com origem e destino. Sem internet, distância e caminho são estimativas; confira as ruas antes de sair.</p>
    <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
      {LOCAL_READY_ROUTES.map(route => <article key={route.id} className="group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#16232b] to-[#10181d] p-3 shadow-[0_12px_35px_rgba(0,0,0,.18)] transition-colors hover:border-[#3DE3FF]/30">
        <button type="button" onClick={() => navigate(buildReusableTripPlannerUrl(route, { auto: true }))} className="min-h-24 w-full text-left active:scale-[.99]">
          <span className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><RouteIcon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="break-words text-sm font-black leading-snug text-white">{route.label}</span>
                <span className="rounded-full border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[.08em] text-[#C7FF3C]">{categoryLabel[route.category]}</span>
              </span>
              <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-white/65">{route.detail}</span>
            </span>
          </span>
          <span className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-white/40"><MapPin className="mt-0.5 size-3 shrink-0 text-[#C7FF3C]" /><span className="line-clamp-2">{route.destination}</span></span>
        </button>
        <div className="mt-2 border-t border-white/8 pt-2"><DestinationActions destination={readyRouteDestination(route)} compact /></div>
      </article>)}
    </div>
  </>;
  return <details className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4" data-compact={compact || undefined}>
    <summary className="min-h-11 cursor-pointer text-sm font-black text-[#3DE3FF]">12 trajetos prontos pela cidade</summary>
    {content}
  </details>;
}
