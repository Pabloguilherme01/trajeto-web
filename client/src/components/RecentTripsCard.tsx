import { Clock3, Navigation, Trash2, RotateCw, Share2, LocateFixed } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { listOfflineRoutes, removeOfflineRoute, offlineRouteEvent } from "@/lib/offlineStore";

type Item = { id: string; origin: string; destination: string; savedAt: string };

export default function RecentTripsCard() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Item[]>([]);

  const [locating, setLocating] = useState<string | null>(null);

  const refresh = async () => {
    const routes = await listOfflineRoutes();
    setItems(routes.slice(0, 3).map(route => ({
      id: route.id, origin: route.origin, destination: route.destination, savedAt: route.savedAt,
    })));
  };

  useEffect(() => {
    void refresh();
    window.addEventListener(offlineRouteEvent, refresh);
    return () => window.removeEventListener(offlineRouteEvent, refresh);
  }, []);

  const openFromHere = (item: Item) => {
    if (!navigator.geolocation || locating) return;
    setLocating(item.id);
    navigator.geolocation.getCurrentPosition(
      position => { setLocating(null); setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(`${position.coords.latitude}, ${position.coords.longitude}`) + "&destino=" + encodeURIComponent(item.destination)); },
      () => { setLocating(null); setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(item.origin) + "&destino=" + encodeURIComponent(item.destination)); },
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
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">Guardadas no aparelho para você retomar sem refazer a consulta.</p>
        </div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => void refresh()} aria-label="Atualizar últimas rotas" className="grid size-9 place-items-center rounded-xl border border-[#D8E0E3] text-[#326575] active:scale-95"><RotateCw className="size-4" /></button><Navigation className="size-5 text-[#326575]" /></div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-[#D8E0E3] bg-[#FCFDFD] p-2 shadow-[0_8px_24px_rgba(11,16,20,.04)]">
            <div className="min-w-0 flex-1 p-2">
              <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(item.origin) + "&destino=" + encodeURIComponent(item.destination))} className="block w-full rounded-lg text-left">
                <p className="truncate text-sm font-bold">{item.origin} → {item.destination}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-[#718089]"><Clock3 className="size-3" />{new Date(item.savedAt).toLocaleString("pt-BR")}</p>
              </button>
              <button type="button" onClick={() => openFromHere(item)} disabled={locating === item.id} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#326575] px-2.5 text-[0.62rem] font-extrabold text-white active:scale-[.98] disabled:opacity-60"><LocateFixed className="size-3" />{locating === item.id ? "Localizando…" : "Daqui agora"}</button>
            </div>
            <button type="button" onClick={() => void shareText(`${item.origin} → ${item.destination}`, `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(item.origin)}&destino=${encodeURIComponent(item.destination)}`, "Rota no Trajeto")} className="grid size-10 shrink-0 place-items-center rounded-lg text-[#326575]" aria-label="Compartilhar rota"><Share2 className="size-4" /></button><button type="button" onClick={async () => { await removeOfflineRoute(item.id); await refresh(); }} className="grid size-10 shrink-0 place-items-center rounded-lg text-[#9B6258]" aria-label="Excluir rota salva"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
