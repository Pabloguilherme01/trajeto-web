import { ArrowRight, BarChart3, Download, History, Navigation, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { getLastTrip, getRecentSearches, getRecentTrips, getRouteUsage, mobilePreferenceEvent, restoreLocalMobilityProfile, type RecentTrip } from "@/lib/mobilePreferences";
import { getMobileDestinations, mobileDestinationEvent, removeMobileDestination, saveMobileDestination, type MobileDestination } from "@/lib/mobileDestinations";
import { getMobileVehicle, mobileVehicleEvent, removeMobileVehicle, saveMobileVehicle, type MobileVehicle } from "@/lib/mobileVehicle";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";

type RouteUsageBackup = { origin: string; destination: string; count: number; lastUsed: string };
type LocalExport = {
  exportedAt: string;
  version: 1;
  scope: "aparelho";
  trips: RecentTrip[];
  routeUsage: RouteUsageBackup[];
  recentSearches: string[];
  destinations: MobileDestination[];
  vehicle: MobileVehicle | null;
  lastTrip: ReturnType<typeof getLastTrip>;
};

function key(origin: string, destination: string) {
  return origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
}

function humanAge(value: string) {
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

export default function MobilityInsightsCard() {
  const [stamp, setStamp] = useState(0);
  const [offlineRoutes, setOfflineRoutes] = useState<OfflineRoute[]>([]);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const refresh = () => setStamp(value => value + 1);
    const load = () => { void listOfflineRoutes().then(setOfflineRoutes).catch(() => setOfflineRoutes([])); };
    const onOfflineChange = () => { refresh(); load(); };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    load();
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(offlineRouteEvent, onOfflineChange);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(offlineRouteEvent, onOfflineChange);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const data = useMemo(() => {
    const trips = getRecentTrips();
    const byRoute = new Map<string, RouteUsageBackup>();
    for (const trip of trips) {
      const routeKey = key(trip.origin, trip.destination);
      const count = getRouteUsage(trip.origin, trip.destination);
      const current = byRoute.get(routeKey);
      if (!current || count > current.count || Date.parse(trip.usedAt) > Date.parse(current.lastUsed)) {
        byRoute.set(routeKey, { origin: trip.origin, destination: trip.destination, count, lastUsed: trip.usedAt });
      }
    }
    const routes = [...byRoute.values()].filter(item => item.count > 0).sort((a, b) => b.count - a.count || Date.parse(b.lastUsed) - Date.parse(a.lastUsed));
    const mostUsed = routes[0] ?? null;
    const totalUses = routes.reduce((sum, item) => sum + item.count, 0);
    const lastSevenDays = trips.filter(item => {
      const time = Date.parse(item.usedAt);
      return Number.isFinite(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const destinationCount = getMobileDestinations().length;
    const recentSearches = getRecentSearches();
    const vehicle = getMobileVehicle();
    const lastTrip = getLastTrip();
    const matchingOffline = mostUsed ? offlineRoutes.find(route => key(route.origin, route.destination) === key(mostUsed.origin, mostUsed.destination)) : null;
    return { trips, routes, mostUsed, totalUses, lastSevenDays, destinationCount, recentSearches, vehicle, lastTrip, matchingOffline };
  }, [stamp, offlineRoutes]);

  const repeatRoute = (origin: string, destination: string) => {
    window.location.assign(appUrl("/planejar") + "?origem=" + encodeURIComponent(origin) + "&destino=" + encodeURIComponent(destination));
  };

  const shareSummary = async () => {
    const route = data.mostUsed ? `${data.mostUsed.origin} → ${data.mostUsed.destination} (${data.mostUsed.count} usos)` : "ainda sem rota recorrente";
    const text = [
      "Meu resumo no Trajeto",
      `• ${data.totalUses.toLocaleString("pt-BR")} uso(s) de rota neste aparelho`,
      `• ${data.destinationCount} destino(s) pessoal(is)`,
      `• ${offlineRoutes.length} rota(s) offline`,
      `• Rota recorrente: ${route}`,
    ].join("\n");
    try { await shareText(text, window.location.href, "Resumo do Trajeto"); } catch {}
  };

  const exportData = () => {
    const payload: LocalExport = {
      exportedAt: new Date().toISOString(),
      version: 1,
      scope: "aparelho",
      trips: data.trips,
      routeUsage: data.routes,
      recentSearches: data.recentSearches,
      destinations: getMobileDestinations(),
      vehicle: data.vehicle,
      lastTrip: data.lastTrip,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trajeto-perfil-local.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback("Backup local exportado.");
  };

  const importData = async (file: File) => {
    setFeedback(null);
    if (file.size > 300_000) {
      setFeedback("Arquivo recusado: o limite é 300 KB.");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("format");
      const data = parsed as Record<string, unknown>;
      if (!restoreLocalMobilityProfile(parsed)) throw new Error("profile");

      if (Array.isArray(data.destinations)) {
        const restored = new Set<MobileDestination["id"]>();
        for (const item of data.destinations) {
          if (!item || typeof item !== "object" || Array.isArray(item)) continue;
          const destination = item as Record<string, unknown>;
          if ((destination.id === "casa" || destination.id === "trabalho" || destination.id === "outro") && typeof destination.value === "string" && destination.value.trim().length >= 3) {
            if (saveMobileDestination(destination.id, destination.value)) restored.add(destination.id);
          }
        }
        for (const id of ["casa", "trabalho", "outro"] as const) if (!restored.has(id)) removeMobileDestination(id);
      }

      if (data.vehicle && typeof data.vehicle === "object" && !Array.isArray(data.vehicle)) {
        const vehicle = data.vehicle as Record<string, unknown>;
        if (
          typeof vehicle.name === "string" &&
          (vehicle.fuel === "gasolina" || vehicle.fuel === "etanol" || vehicle.fuel === "diesel") &&
          typeof vehicle.consumption === "number" &&
          typeof vehicle.tank === "number"
        ) {
          saveMobileVehicle({ name: vehicle.name, fuel: vehicle.fuel, consumption: vehicle.consumption, tank: vehicle.tank });
        } else {
          removeMobileVehicle();
        }
      } else {
        removeMobileVehicle();
      }

      setFeedback("Perfil local restaurado. As rotas offline existentes não foram substituídas.");
      setStamp(value => value + 1);
    } catch {
      setFeedback("Não foi possível importar. Use um JSON exportado pelo Trajeto.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="rounded-3xl border border-[#C7FF3C]/15 bg-[#10181F] p-4 text-[#EAF0F2] shadow-[0_18px_55px_rgba(0,0,0,.2)] sm:p-6" aria-labelledby="mobility-insights-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]">Inteligência pessoal</p>
          <h2 id="mobility-insights-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-white">Seu uso vira atalho.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#8FA3AC]">Frequência e padrões são calculados no aparelho. Você pode exportar um backup do perfil sem criar conta.</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Sparkles className="size-5" /></div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [BarChart3, "Uso registrado", data.totalUses.toLocaleString("pt-BR")],
          [Navigation, "Destinos", String(data.destinationCount)],
          [History, "Rotas recentes", String(data.trips.length)],
          [ShieldCheck, "Offline", String(offlineRoutes.length)],
        ].map(([Icon, label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            <Icon className="size-4 text-[#3DE3FF]" />
            <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/35">{label}</p>
            <p className="mt-1 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {data.mostUsed ? (
        <div className="mt-4 rounded-2xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/[0.06] p-4">
          <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#C7FF3C]">Rota mais repetida</p>
          <p className="mt-1 truncate text-sm font-extrabold text-white">{data.mostUsed.origin} → {data.mostUsed.destination}</p>
          <p className="mt-1 text-[0.62rem] text-white/55">{data.mostUsed.count} uso(s) · última utilização {humanAge(data.mostUsed.lastUsed)}{data.matchingOffline ? " · disponível offline" : ""}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => repeatRoute(data.mostUsed!.origin, data.mostUsed!.destination)} className="mobile-pressable rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]">Repetir <ArrowRight className="size-3.5" /></button>
            <button type="button" onClick={() => repeatRoute(data.mostUsed!.destination, data.mostUsed!.origin)} className="mobile-pressable rounded-xl border border-white/10 px-3 text-[0.62rem] font-black text-white/75">Voltar</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <p className="text-sm font-extrabold text-white">Seu primeiro padrão ainda não apareceu.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8FA3AC]">Use o Planejar nas próximas viagens. O Trajeto transforma repetição em atalho automaticamente.</p>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Últimos 7 dias</p>
          <p className="mt-1 text-sm font-extrabold text-white">{data.lastSevenDays} viagem(ns) recente(s)</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Conectividade</p>
          <p className="mt-1 text-sm font-extrabold text-white">{online ? "online" : offlineRoutes.length ? "offline preparado" : "offline sem rota"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/35">Veículo</p>
          <p className="mt-1 truncate text-sm font-extrabold text-white">{data.vehicle?.name ?? "não cadastrado"}</p>
        </div>
      </div>

      {feedback && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.62rem] font-bold text-[#B7C5CA]">{feedback}</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <button type="button" onClick={exportData} className="mobile-pressable gap-2 rounded-xl border border-white/10 px-3 text-[0.62rem] font-black text-white/80"><Download className="size-3.5 text-[#C7FF3C]" /> Backup</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="mobile-pressable rounded-xl border border-white/10 px-3 text-[0.62rem] font-black text-white/80">Restaurar</button>
        <button type="button" onClick={() => void shareSummary()} className="mobile-pressable gap-2 rounded-xl border border-white/10 px-3 text-[0.62rem] font-black text-white/80"><Share2 className="size-3.5 text-[#3DE3FF]" /> Compartilhar</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Selecionar backup JSON do Trajeto" onChange={event => { const file = event.target.files?.[0]; if (file) void importData(file); }} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-[0.54rem] leading-relaxed text-white/35"><ShieldCheck className="size-3.5 shrink-0" /> O backup contém preferências e histórico do aparelho. Rotas offline já salvas não são sobrescritas.</p>
    </section>
  );
}
