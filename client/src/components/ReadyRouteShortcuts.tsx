import { useLocation } from "wouter";
import { LOCAL_READY_ROUTES } from "@/lib/localRoutePresets";
import { buildReusableTripPlannerUrl } from "@/lib/tripLinks";
import { DestinationActions } from "@/components/DestinationActions";
import { readyRouteDestination } from "@/lib/unifiedDestination";

export default function ReadyRouteShortcuts({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  const content = <>
    <p className="mt-2 text-xs leading-relaxed text-white/70">Escolha um trajeto com origem e destino. Sem internet, distância e caminho são estimativas; confira as ruas antes de sair.</p>
    <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-3">
      {LOCAL_READY_ROUTES.map(route => <article key={route.id} className="min-w-0 rounded-2xl border border-white/10 bg-[#121B22] p-3">
        <button type="button" onClick={() => navigate(buildReusableTripPlannerUrl(route, { auto: true }))} className="min-h-16 w-full text-left active:scale-[.99]">
          <span className="block break-words text-sm font-black text-white">{route.label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-white/65">{route.detail}</span>
        </button>
        <div className="mt-2"><DestinationActions destination={readyRouteDestination(route)} compact /></div>
      </article>)}
    </div>
  </>;
  return <details className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4" data-compact={compact || undefined}>
    <summary className="min-h-11 cursor-pointer text-sm font-black text-[#3DE3FF]">12 trajetos prontos pela cidade</summary>
    {content}
  </details>;
}
