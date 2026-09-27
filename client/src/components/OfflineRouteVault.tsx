import { Trash2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { listOfflineRoutes, removeOfflineRoute } from "@/lib/offlineStore";
import { Link } from "wouter";

type Item = { id: string; origin: string; destination: string; savedAt: string };

export default function OfflineRouteVault() {
  const [items, setItems] = useState<Item[]>([]);

  const refresh = async () => {
    const routes = await listOfflineRoutes();
    setItems(routes.map(route => ({
      id: route.id,
      origin: route.origin,
      destination: route.destination,
      savedAt: route.savedAt,
    })));
  };

  useEffect(() => { void refresh(); }, []);

  if (!items.length) return null;

  return (
    <section className="mt-8 rounded-3xl border border-[#3DE3FF]/20 bg-[#0F171D] p-5 text-white sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/15 text-[#3DE3FF]"><WifiOff className="size-5" /></div>
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Roteiro offline</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Rotas guardadas neste aparelho.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#94A8B0]">Essas rotas podem ser abertas sem nova consulta. Trânsito, mapas externos e atualizações ao vivo continuam dependendo de internet.</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <Link href={`/planejar?origem=${encodeURIComponent(item.origin)}&destino=${encodeURIComponent(item.destination)}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{item.origin} → {item.destination}</p>
              <p className="mt-1 text-[0.65rem] text-[#7F919A]">{new Date(item.savedAt).toLocaleString("pt-BR")}</p>
            </Link>
            <button type="button" onClick={async () => { await removeOfflineRoute(item.id); await refresh(); }} className="grid size-10 place-items-center rounded-xl border border-white/10 text-[#FFB5A1]" aria-label={`Excluir rota ${item.origin} para ${item.destination}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
