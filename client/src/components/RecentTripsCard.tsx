import { ArrowLeftRight, ArrowRight, History, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { clearRecentTrips, getRecentTrips, mobilePreferenceEvent, removeRecentTrip, type RecentTrip } from "@/lib/mobilePreferences";
import { findOfflineRouteByTrip, listOfflineRoutes } from "@/lib/offlineStore";

function formatAge(usedAt: string) {
  const time = Date.parse(usedAt);
  if (!Number.isFinite(time)) return "data indisponível";
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `há ${days} d` : new Date(time).toLocaleDateString("pt-BR");
}

export default function RecentTripsCard() {
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<RecentTrip[]>(getRecentTrips);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setTrips(getRecentTrips());
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!trips.length) return null;

  const openReverseTrip = async (trip: RecentTrip) => {
    const origin = trip.destination;
    const destination = trip.origin;

    if (navigator.onLine) {
      setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(origin) + "&destino=" + encodeURIComponent(destination));
      return;
    }

    try {
      const routes = await listOfflineRoutes();
      const saved = findOfflineRouteByTrip(routes, origin, destination);
      if (!saved) {
        setFeedback("A volta desta viagem não tem uma cópia salva neste aparelho. Conecte-se à internet para calculá-la.");
        return;
      }
      setLocation(
        appUrl("/planejar") +
        "?rota=" + encodeURIComponent(saved.id) + "&origem=" + encodeURIComponent(saved.origin) + "&destino=" + encodeURIComponent(saved.destination),
      );
    } catch {
      setFeedback("Não foi possível consultar as rotas salvas. Tente novamente.");
    }
  };

  const openTrip = async (trip: RecentTrip) => {
    if (navigator.onLine) {
      setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination));
      return;
    }
    try {
      const routes = await listOfflineRoutes();
      const saved = findOfflineRouteByTrip(routes, trip.origin, trip.destination);
      if (!saved) {
        setFeedback("Esta viagem não tem uma cópia salva neste aparelho. Conecte-se à internet para recalculá-la.");
        return;
      }
      setLocation(
        appUrl("/planejar") +
        "?rota=" + encodeURIComponent(saved.id) + "&origem=" + encodeURIComponent(saved.origin) + "&destino=" + encodeURIComponent(saved.destination),
      );
    } catch {
      setFeedback("Não foi possível consultar as rotas salvas. Tente novamente.");
    }
  };

  return (
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] shadow-[0_12px_35px_rgba(11,16,20,.06)] sm:p-6" aria-labelledby="recent-trips-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Memória local</p>
          <h2 id="recent-trips-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Viagens recentes.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">As últimas viagens ficam neste aparelho para repetir em poucos toques. Sem conta.</p>
        </div>
        <History className="mt-1 size-5 text-[#326575]" aria-hidden="true" />
      </div>
      {feedback && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-[#D8E0E3] bg-[#F2F5F6] px-3 py-2 text-[0.62rem] font-bold text-[#52636C]">{feedback}</p>}
      <div className="mt-4 space-y-2">
        {trips.map((trip, index) => (
          <div key={trip.origin + "::" + trip.destination} className="flex items-center gap-2 rounded-2xl border border-[#D8E0E3] bg-[#FCFDFD] p-3">
            <div className="min-w-0 flex-1">
              {index === 0 && <span className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-[#326575]">Mais recente</span>}
              <p className="mt-0.5 truncate text-xs font-extrabold">{trip.origin} → {trip.destination}</p>
              <p className="mt-1 text-[0.6rem] text-[#718089]">Usada {formatAge(trip.usedAt)}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={() => void openTrip(trip)} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]">
                Repetir <ArrowRight className="size-3.5" />
              </button>
              <button type="button" onClick={() => void openReverseTrip(trip)} aria-label={"Planejar volta de " + trip.destination + " para " + trip.origin} className="grid size-10 place-items-center rounded-xl border border-[#D8E0E3] text-[#52636C]">
                <ArrowLeftRight className="size-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => removeRecentTrip(trip.origin, trip.destination)} aria-label={`Remover viagem ${trip.origin} para ${trip.destination}`} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#D8E0E3] text-[#718089]">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={clearRecentTrips} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[0.62rem] font-bold text-[#718089]">
        <Trash2 className="size-3.5" /> Limpar histórico local
      </button>
    </section>
  );
}
