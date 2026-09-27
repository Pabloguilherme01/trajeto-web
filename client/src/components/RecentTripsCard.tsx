import { Clock3, Navigation, Trash2, RotateCw, Share2, LocateFixed, WifiOff, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { listOfflineRoutes, removeOfflineRoute, offlineRouteEvent } from "@/lib/offlineStore";

type Item = { id: string; origin: string; destination: string; savedAt: string };

export default function RecentTripsCard() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [locating, setLocating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const routes = await listOfflineRoutes();
      setItems(routes.slice(0, 3).map(route => ({
        id: route.id, origin: route.origin, destination: route.destination, savedAt: route.savedAt,
      })));
    } catch {
      setFeedback("Não foi possível ler suas rotas salvas agora.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(offlineRouteEvent, refresh);
    return () => window.removeEventListener(offlineRouteEvent, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const openRoute = (item: Item) => {
    setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(item.origin) + "&destino=" + encodeURIComponent(item.destination));
  };

  const openFromHere = (item: Item) => {
    if (!navigator.geolocation || locating) return;
    setFeedback(null);
    setLocating(item.id);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(null);
        setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(`${position.coords.latitude}, ${position.coords.longitude}`) + "&destino=" + encodeURIComponent(item.destination));
      },
      () => {
        setLocating(null);
        setFeedback("GPS indisponível. Usando a origem salva.");
        openRoute(item);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  };

  if (!items.length) return null;

  return (
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Acesso rápido</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Suas últimas rotas.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">Retome em um toque, inclusive sem refazer a consulta.</p>
        </div>
        <button type="button" onClick={() => void refresh()} aria-label="Atualizar últimas rotas" className="grid size-10 place-items-center rounded-xl border border-[#D8E0E3] text-[#326575] active:scale-95"><RotateCw className="size-4" /></button>
      </div>

      {feedback && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#326575]/20 bg-[#F2F5F6] px-3 py-2 text-[0.62rem] font-bold text-[#52636C]">{feedback}</p>}

      <div className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <article key={item.id} className={`rounded-2xl border p-2.5 shadow-[0_8px_24px_rgba(11,16,20,.04)] ${index === 0 ? "border-[#326575]/25 bg-[#F7FAFA]" : "border-[#D8E0E3] bg-[#FCFDFD]"}`}>
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => openRoute(item)} className="min-w-0 flex-1 rounded-lg p-1 text-left">
                <div className="flex flex-wrap items-center gap-1.5">
                  {index === 0 && <span className="rounded-full bg-[#326575] px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.08em] text-white">Mais recente</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF0F1] px-2 py-0.5 text-[0.5rem] font-bold text-[#326575]"><WifiOff className="size-2.5" /> offline</span>
                </div>
                <p className="mt-2 truncate text-sm font-bold">{item.origin} → {item.destination}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-[#718089]"><Clock3 className="size-3" />{new Date(item.savedAt).toLocaleString("pt-BR")}</p>
              </button>
              <button type="button" onClick={() => openRoute(item)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#326575] text-white active:scale-95" aria-label={`Retomar rota para ${item.destination}`}><ArrowRight className="size-4" /></button>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-1.5 border-t border-[#E5EAEB] pt-2">
              <button type="button" onClick={() => openFromHere(item)} disabled={locating === item.id} className="min-h-10 rounded-xl bg-[#163840] px-2.5 text-[0.6rem] font-extrabold text-white active:scale-[.98] disabled:opacity-60"><LocateFixed className="mr-1 inline size-3.5" />{locating === item.id ? "Localizando…" : "Daqui agora"}</button>
              <button type="button" onClick={() => {
                void shareText(
                  item.origin + " → " + item.destination,
                  window.location.origin + appUrl("/planejar") + "?origem=" + encodeURIComponent(item.origin) + "&destino=" + encodeURIComponent(item.destination),
                  "Rota no Trajeto",
                ).then(() => setFeedback("Rota preparada para compartilhar.")).catch(() => setFeedback("Não foi possível compartilhar agora."));
              }} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-[#D8E0E3] text-[#326575]" aria-label="Compartilhar rota"><Share2 className="size-4" /></button>
              <button type="button" onClick={async () => { await removeOfflineRoute(item.id); await refresh(); }} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-[#E8D7D3] text-[#9B6258]" aria-label="Excluir rota salva"><Trash2 className="size-4" /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
