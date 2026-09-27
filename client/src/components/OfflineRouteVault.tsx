import { Clock3, ExternalLink, Link2, Navigation, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { listOfflineRoutes, offlineRouteEvent, removeOfflineRoute, type OfflineRoute } from "@/lib/offlineStore";

function relativeAge(savedAt: string) {
  const age = Date.now() - Date.parse(savedAt);
  if (!Number.isFinite(age) || age < 60_000) return "agora";
  const minutes = Math.floor(age / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? "" : "s"}`;
}

function routeUrl(route: Pick<OfflineRoute, "origin" | "destination">) {
  return window.location.origin + appUrl("/planejar") + `?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`;
}

export default function OfflineRouteVault() {
  const [items, setItems] = useState<OfflineRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listOfflineRoutes());
    } catch {
      setError("Não foi possível ler as rotas salvas neste aparelho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(offlineRouteEvent, refresh);
    return () => window.removeEventListener(offlineRouteEvent, refresh);
  }, [refresh]);

  const shareRoute = async (route: OfflineRoute) => {
    try {
      await shareText(`${route.origin} → ${route.destination}`, routeUrl(route), "Rota salva no Trajeto");
      setFeedback("Rota preparada para compartilhar.");
    } catch {
      setFeedback("Não foi possível compartilhar agora.");
    }
  };

  const removeRoute = async (route: OfflineRoute) => {
    try {
      await removeOfflineRoute(route.id);
      setItems(current => current.filter(item => item.id !== route.id));
      setFeedback("Rota removida deste aparelho.");
    } catch {
      setFeedback("Não foi possível excluir a rota.");
    }
  };

  return (
    <section aria-labelledby="offline-routes-title" className="mt-8 rounded-3xl border border-[#3DE3FF]/20 bg-[#0F171D] p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/15 text-[#3DE3FF]"><WifiOff className="size-5" /></div>
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Salvos neste aparelho</p>
            <h2 id="offline-routes-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Rotas prontas para sair.</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#94A8B0]">Abra a rota instantaneamente sem nova consulta. Trânsito, mapas externos e atualizações ao vivo continuam dependendo de internet.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-[#3DE3FF]" aria-label="Atualizar rotas salvas"><RefreshCw className="size-4" /></button>
      </div>

      {feedback && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-[#3DE3FF]/20 bg-white/[0.04] px-3 py-2 text-xs text-[#C5E9EE]">{feedback}</p>}
      {loading && <div role="status" className="mt-5 rounded-2xl border border-white/10 p-4 text-sm text-[#94A8B0]">Lendo rotas salvas…</div>}
      {!loading && error && <div role="alert" className="mt-5 rounded-2xl border border-[#FFB5A1]/30 bg-[#FFB5A1]/10 p-4 text-sm text-[#FFD7CD]"><p>{error}</p><button type="button" onClick={() => void refresh()} className="mt-3 min-h-10 rounded-xl border border-[#FFB5A1]/40 px-3 text-xs font-bold">Tentar novamente</button></div>}
      {!loading && !error && !items.length && <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-5"><p className="text-sm font-bold">Nenhuma rota salva ainda.</p><p className="mt-1 text-xs leading-relaxed text-[#94A8B0]">Calcule uma rota e toque em “Salvar offline” para encontrá-la aqui mesmo sem internet.</p></div>}

      {!loading && !error && items.length > 0 && <div className="mt-5 space-y-3">
        {items.map(route => (
          <article key={route.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-start gap-3">
              <Link href={appUrl(`/planejar?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`)} className="min-w-0 flex-1 rounded-xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3DE3FF]">
                <p className="truncate text-sm font-bold">{route.origin} <span className="px-1 text-[#3DE3FF]">→</span> {route.destination}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-[#94A8B0]"><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{relativeAge(route.savedAt)}</span><span className="inline-flex items-center gap-1 text-[#B9EAF0]"><WifiOff className="size-3" />disponível offline</span></p>
              </Link>
              <Link href={appUrl(`/planejar?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF] text-[#092027] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label={`Abrir rota de ${route.origin} para ${route.destination}`}><Navigation className="size-4" /></Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
              <Link href={appUrl(`/planejar?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 text-[0.65rem] font-bold"><Link2 className="size-3.5" />Abrir</Link>
              <button type="button" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`, "_blank", "noopener,noreferrer")} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 text-[0.65rem] font-bold"><ExternalLink className="size-3.5" />Navegar</button>
              <button type="button" onClick={() => void shareRoute(route)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 text-[0.65rem] font-bold"><Link2 className="size-3.5" />Enviar</button>
            </div>
            <button type="button" onClick={() => void removeRoute(route)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#FFB5A1]/25 text-xs font-bold text-[#FFB5A1]"><Trash2 className="size-3.5" />Excluir rota salva</button>
          </article>
        ))}
      </div>}
    </section>
  );
}
