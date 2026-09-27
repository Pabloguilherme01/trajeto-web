import { ArrowRight, Clock3, ExternalLink, RotateCw, Share2, Trash2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { listOfflineRoutes, offlineRouteEvent, removeOfflineRoute, type OfflineRoute } from "@/lib/offlineStore";

function formatAge(savedAt: string) {
  const time = Date.parse(savedAt);
  if (!Number.isFinite(time)) return "Data indisponível";

  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "salva agora";
  if (minutes < 60) return `salva há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `salva há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `salva há ${days} d`;

  return `salva em ${new Date(time).toLocaleDateString("pt-BR")}`;
}


export default function OfflineRouteVault() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<OfflineRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStorageError(false);
    try {
      setItems(await listOfflineRoutes());
    } catch {
      setItems([]);
      setStorageError(true);
      setFeedback("Não foi possível acessar as rotas salvas. Seus dados locais não foram alterados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener(offlineRouteEvent, refresh);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener(offlineRouteEvent, refresh);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [refresh]);

  const openRoute = (route: OfflineRoute) => {
    setLocation(
      appUrl("/planejar") +
      "?rota=" + encodeURIComponent(route.id) +
      "&origem=" + encodeURIComponent(route.origin) +
      "&destino=" + encodeURIComponent(route.destination),
    );
  };

  const navigateExternally = (route: OfflineRoute) => {
    if (!isOnline) {
      setFeedback("A navegação externa precisa de internet. A rota salva continua disponível offline.");
      return;
    }
    const url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(route.destination);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareRoute = async (route: OfflineRoute) => {
    try {
      await shareText(
        `Rota salva no Trajeto: ${route.origin} → ${route.destination}.`,
        window.location.origin + appUrl("/planejar") + "?origem=" + encodeURIComponent(route.origin) + "&destino=" + encodeURIComponent(route.destination),
        "Rota salva no Trajeto",
      );
      setFeedback("Origem e destino preparados para compartilhar. O destinatário precisará de internet para recalcular a rota.");
    } catch {
      setFeedback("Não foi possível compartilhar esta rota agora.");
    }
  };

  const deleteRoute = async (route: OfflineRoute) => {
    try {
      await removeOfflineRoute(route.id);
      setItems(current => current.filter(item => item.id !== route.id));
      setFeedback("Rota removida deste aparelho.");
    } catch {
      setFeedback("Não foi possível excluir a rota.");
    }
  };

  return (
    <section id="saved-routes" aria-labelledby="saved-routes-title" className="mt-8 rounded-3xl border border-[#CFD9DD] bg-[#0F171D] p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/15 text-[#3DE3FF]">
            <WifiOff className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Salvos no aparelho</p>
            <h2 id="saved-routes-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Rotas salvas.</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#94A8B0]">
              Abra a rota calculada sem refazer a consulta. Navegação externa e dados ao vivo dependem de internet.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-[#AFC0C7] disabled:opacity-50"
          aria-label="Atualizar rotas salvas"
        >
          <RotateCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.58rem] font-bold">
        <span className={`rounded-full px-2.5 py-1 ${isOnline ? "bg-[#C7FF3C]/15 text-[#C7FF3C]" : "bg-[#3DE3FF]/10 text-[#8FEAFF]"}`}>
          {isOnline ? "Internet disponível" : "Sem internet"}
        </span>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[#91A4AC]">Rota salva localmente
        </span>
      </div>

      {feedback && (
        <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.65rem] font-bold text-[#B9C9CE]">
          {feedback}
        </p>
      )}

      {loading ? (
        <div role="status" aria-label="Carregando rotas salvas" className="mt-5 space-y-2">
          {[1, 2].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />)}
        </div>
      ) : storageError ? (
        <div className="mt-5 rounded-2xl border border-[#FFB5A1]/30 bg-[#FFB5A1]/[0.06] p-5">
          <p className="text-sm font-bold text-white">Não foi possível abrir o cofre offline.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#B8A7A2]">O navegador não conseguiu acessar o armazenamento local. Tente novamente; nenhuma rota será removida automaticamente.</p>
          <button type="button" onClick={() => void refresh()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-black text-white">Tentar novamente <RotateCw className="size-4" /></button>
        </div>
      ) : !items.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-5">
          <p className="text-sm font-bold text-white">Nenhuma rota salva ainda.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8FA3AC]">
            Planeje uma viagem e toque em “Salvar offline”. A rota calculada ficará disponível neste aparelho.
          </p>
          <a href={appUrl("/planejar")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-black text-[#0B1014]">
            Planejar uma rota <ArrowRight className="size-4" />
          </a>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((route, index) => (
            <article key={route.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <button type="button" onClick={() => openRoute(route)} className="block w-full rounded-xl p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7FF3C]">
                <div className="flex items-center gap-2">
                  {index === 0 && <span className="rounded-full bg-[#C7FF3C] px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#0B1014]">Mais recente</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#3DE3FF]/10 px-2 py-0.5 text-[0.5rem] font-bold text-[#8FEAFF]">
                    <WifiOff className="size-2.5" /> disponível offline
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-bold text-white">{route.origin} → {route.destination}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-[#7F919A]">
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{formatAge(route.savedAt)}</span>
                  <span>{new Date(route.savedAt).toLocaleString("pt-BR")}</span>
                  <span className="text-[#657780]">snapshot da viagem</span>
                </p>
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 sm:grid-cols-4">
                <button type="button" onClick={() => openRoute(route)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#C7FF3C] px-2 text-[0.62rem] font-black text-[#0B1014]">
                  <ArrowRight className="size-3.5" /> Abrir
                </button>
                <button type="button" onClick={() => navigateExternally(route)} disabled={!isOnline} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 text-[0.62rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
                  <ExternalLink className="size-3.5" /> Navegar
                </button>
                <button type="button" onClick={() => void shareRoute(route)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 text-[0.62rem] font-bold text-white">
                  <Share2 className="size-3.5" /> Compartilhar
                </button>
                <button type="button" onClick={() => void deleteRoute(route)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E8D7D3] px-2 text-[0.62rem] font-bold text-[#FFB5A1]" aria-label={`Excluir rota ${route.origin} para ${route.destination}`}>
                  <Trash2 className="size-3.5" /> Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
