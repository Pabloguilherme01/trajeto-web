import { ArrowRight, BarChart3, Download, History, Navigation, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import {
  getLastTrip,
  getRecentSearches,
  getRecentTrips,
  getRouteUsage,
  mobilePreferenceEvent,
  type RouteUsage,
} from "@/lib/mobilePreferences";
import { getMobileDestinations, mobileDestinationEvent, type MobileDestination } from "@/lib/mobileDestinations";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";

function routeKey(origin: string, destination: string) {
  return origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
}

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatLastUsed(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "data indisponível";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Date(time).toLocaleDateString("pt-BR");
}

type LocalExport = {
  exportedAt: string;
  version: 1;
  scope: "aparelho";
  trips: ReturnType<typeof getRecentTrips>;
  routeUsage: RouteUsage[];
  recentSearches: string[];
  destinations: MobileDestination[];
  vehicle: MobileVehicle | null;
  lastTrip: ReturnType<typeof getLastTrip>;
  offlineRoutes: Array<Pick<OfflineRoute, "id" | "origin" | "destination" | "savedAt">>;
};

export default function MobilityInsightsCard() {
  const [stamp, setStamp] = useState(0);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [offlineRoutes, setOfflineRoutes] = useState<OfflineRoute[]>([]);

  useEffect(() => {
    const refresh = () => setStamp(value => value + 1);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const loadOffline = () => {
      void listOfflineRoutes().then(setOfflineRoutes).catch(() => setOfflineRoutes([]));
    };

    loadOffline();
    const onOfflineRouteChange = () => { refresh(); loadOffline(); };
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(offlineRouteEvent, onOfflineRouteChange);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(offlineRouteEvent, onOfflineRouteChange);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const data = useMemo(() => {
    const routeUsage = getRouteUsage();
    const recentTrips = getRecentTrips();
    const destinations = getMobileDestinations();
    const recentSearches = getRecentSearches();
    const vehicle = getMobileVehicle();
    const lastTrip = getLastTrip();
    const mostUsed = routeUsage[0] ?? null;
    const totalUses = routeUsage.reduce((sum, route) => sum + route.count, 0);
    const lastSevenDays = recentTrips.filter(item => {
      const time = Date.parse(item.usedAt);
      return Number.isFinite(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const matchingOffline = mostUsed ? offlineRoutes.find(item => routeKey(item.origin, item.destination) === routeKey(mostUsed.origin, mostUsed.destination)) ?? null : null;

    return {
      routeUsage,
      recentTrips,
      destinations,
      recentSearches,
      vehicle,
      lastTrip,
      mostUsed,
      totalUses,
      lastSevenDays,
      matchingOffline,
    };
  }, [stamp, offlineRoutes]);

  const repeatRoute = (origin: string, destination: string) => {
    window.location.assign(
      appUrl("/planejar") +
      "?origem=" + encodeURIComponent(origin) +
      "&destino=" + encodeURIComponent(destination),
    );
  };

  const reverseRoute = (origin: string, destination: string) => {
    window.location.assign(
      appUrl("/planejar") +
      "?origem=" + encodeURIComponent(destination) +
      "&destino=" + encodeURIComponent(origin),
    );
  };

  const shareSummary = async () => {
    const favorite = data.mostUsed
      ? `${data.mostUsed.origin} → ${data.mostUsed.destination} (${data.mostUsed.count} usos)`
      : "ainda sem rota recorrente";
    const text = [
      "Meu resumo no Trajeto",
      `• ${formatCount(data.totalUses)} uso(s) de rota registrado(s) neste aparelho`,
      `• ${data.destinations.length} destino(s) pessoal(is)`,
      `• ${offlineRoutes.length} rota(s) disponível(is) offline`,
      `• Rota recorrente: ${favorite}`,
    ].join("\n");
    try {
      await shareText(text, window.location.href, "Resumo do Trajeto");
    } catch {}
  };

  const exportLocalData = async () => {
    const exportData: LocalExport = {
      exportedAt: new Date().toISOString(),
      version: 1,
      scope: "aparelho",
      trips: data.recentTrips,
      routeUsage: data.routeUsage,
      recentSearches: data.recentSearches,
      destinations: data.destinations,
      vehicle: data.vehicle,
      lastTrip: data.lastTrip,
      offlineRoutes: offlineRoutes.map(route => ({
        id: route.id,
        origin: route.origin,
        destination: route.destination,
        savedAt: route.savedAt,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trajeto-dados-locais.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-[#C7FF3C]/15 bg-[#10181F] p-4 text-[#EAF0F2] shadow-[0_18px_55px_rgba(0,0,0,.2)] sm:p-6" aria-labelledby="mobility-insights-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]">Inteligência pessoal</p>
          <h2 id="mobility-insights-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-white">Seu uso vira atalho.</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#8FA3AC]">
            Frequência, destinos e rotas recorrentes são calculados no aparelho. Nenhum desses dados precisa ser enviado para um servidor.
          </p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
          <Sparkles className="size-5" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <BarChart3 className="size-4 text-[#3DE3FF]" />
          <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/35">Uso registrado</p>
          <p className="mt-1 text-lg font-black text-white">{formatCount(data.totalUses)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <Navigation className="size-4 text-[#C7FF3C]" />
          <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/35">Destinos</p>
          <p className="mt-1 text-lg font-black text-white">{formatCount(data.destinations.length)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <History className="size-4 text-[#BDA5FF]" />
          <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/35">Rotas recentes</p>
          <p className="mt-1 text-lg font-black text-white">{formatCount(data.recentTrips.length)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <ShieldCheck className="size-4 text-[#3DE3FF]" />
          <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/35">Offline</p>
          <p className="mt-1 text-lg font-black text-white">{formatCount(offlineRoutes.length)}</p>
        </div>
      </div>

      {data.mostUsed ? (
        <div className="mt-4 rounded-2xl border border-[#C7FF3C]/25 bg-[linear-gradient(135deg,rgba(199,255,60,.09),rgba(61,227,255,.04))] p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]">
              <Navigation className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#C7FF3C]">Rota mais repetida</p>
              <p className="mt-1 truncate text-sm font-extrabold text-white">{data.mostUsed.origin} → {data.mostUsed.destination}</p>
              <p className="mt-1 text-[0.62rem] text-white/55">
                {formatCount(data.mostUsed.count)} uso(s) registrado(s) · última utilização {formatLastUsed(data.mostUsed.lastUsed)}
                {data.matchingOffline ? " · disponível offline" : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => repeatRoute(data.mostUsed!.origin, data.mostUsed!.destination)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.64rem] font-black text-[#0B1014]">
              Repetir <ArrowRight className="size-3.5" />
            </button>
            <button type="button" onClick={() => reverseRoute(data.mostUsed!.origin, data.mostUsed!.destination)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.64rem] font-black text-white/80">
              Fazer volta
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <p className="text-sm font-extrabold text-white">Primeiro padrão ainda não detectado.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8FA3AC]">Use o Planejar para algumas viagens. A frequência das rotas ficará disponível automaticamente neste aparelho.</p>
          <a href={appUrl("/planejar")} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">
            Planejar primeira rota <ArrowRight className="size-3.5" />
          </a>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Nos últimos 7 dias</p>
          <p className="mt-1 text-sm font-extrabold text-white">{formatCount(data.lastSevenDays)} rota(s) recente(s)</p>
          <p className="mt-1 text-[0.6rem] leading-relaxed text-[#71838C]">Considera as últimas utilizações preservadas no histórico local.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Conectividade</p>
          <p className="mt-1 text-sm font-extrabold text-white">{online ? "online" : offlineRoutes.length ? "offline preparado" : "offline sem rota"}</p>
          <p className="mt-1 text-[0.6rem] leading-relaxed text-[#71838C]">Status atual e quantidade real de cópias de rota disponíveis.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Última viagem</p>
          <p className="mt-1 truncate text-sm font-extrabold text-white">{data.lastTrip ? data.lastTrip.origin + " → " + data.lastTrip.destination : "nenhuma registrada"}</p>
          <p className="mt-1 text-[0.6rem] leading-relaxed text-[#71838C]">Atalho pronto para repetir a partir deste aparelho.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <button type="button" onClick={() => void shareSummary()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-[0.62rem] font-black text-white/80">
          <Share2 className="size-3.5 text-[#3DE3FF]" /> Compartilhar resumo
        </button>
        <button type="button" onClick={() => void exportLocalData()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-[0.62rem] font-black text-white/80">
          <Download className="size-3.5 text-[#C7FF3C]" /> Exportar dados locais
        </button>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[0.54rem] leading-relaxed text-white/35">
        <ShieldCheck className="size-3.5 shrink-0" />
        Exportação limitada aos dados de uso armazenados neste aparelho; detalhes completos de navegação não são incluídos.
      </p>
    </section>
  );
}
