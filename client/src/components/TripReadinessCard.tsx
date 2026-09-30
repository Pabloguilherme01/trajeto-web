import { CheckCircle2, CircleAlert, CloudOff, Fuel, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { getMaintenanceItems, getMaintenanceStatus, vehicleMaintenanceEvent } from "@/lib/vehicleMaintenance";
import { isOfflineRouteStale, listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { getLastTrip, getMostUsedRoute, mobilePreferenceEvent } from "@/lib/mobilePreferences";

type Item = { label: string; detail: string; ok: boolean; warn?: boolean };

function routeAge(savedAt: string) {
  const time = Date.parse(savedAt);
  if (!Number.isFinite(time)) return "idade indisponível";
  const hours = Math.floor(Math.max(0, Date.now() - time) / 3600000);
  if (hours < 1) return "menos de 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function connectionDetail(online: boolean) {
  if (!online) return { label: "offline", detail: "Sem internet · use uma rota salva como contingência." };
  if (typeof navigator === "undefined") return { label: "online", detail: "Conexão disponível para consultas atualizadas." };
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!connection?.effectiveType) return { label: "online", detail: "Conexão disponível para consultas atualizadas." };
  const type = connection.effectiveType.toUpperCase();
  return { label: type, detail: connection.saveData ? `Conexão ${type} · economia de dados ativada.` : `Conexão ${type} · consultas atualizadas disponíveis.` };
}

function fuelDetail(vehicle: MobileVehicle | null) {
  if (!vehicle) return { ok: false, detail: "Cadastre o veículo para calcular combustível." };
  if (vehicle.fuel && vehicle.consumption > 0) return { ok: true, detail: `${vehicle.consumption.toLocaleString("pt-BR")} km/L · ${vehicle.fuel}` };
  return { ok: false, detail: "Complete combustível e consumo do veículo." };
}

export default function TripReadinessCard() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [routes, setRoutes] = useState<OfflineRoute[]>([]);
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [maintenance, setMaintenance] = useState(() => getMaintenanceItems());
  const [lastTrip, setLastTrip] = useState(() => getLastTrip());
  const [mostUsedTrip, setMostUsedTrip] = useState(() => getMostUsedRoute());

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      setMaintenance(getMaintenanceItems());
      setLastTrip(getLastTrip());
      setMostUsedTrip(getMostUsedRoute());
      void listOfflineRoutes().then(setRoutes).catch(() => setRoutes([]));
    };
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    refresh();
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(vehicleMaintenanceEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(vehicleMaintenanceEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const latestRoute = routes[0] ?? null;
  const freshOfflineRoutes = routes.filter(route => !isOfflineRouteStale(route.savedAt)).length;
  const connection = connectionDetail(online);
  const maintenanceWarning = maintenance.some(item => getMaintenanceStatus(item.dueDate) !== "ok");
  const fuel = fuelDetail(vehicle);
  const items = useMemo<Item[]>(() => [
    { label: "Conexão", detail: online ? connection.detail : latestRoute ? `${connection.detail} ${freshOfflineRoutes} rota${freshOfflineRoutes === 1 ? "" : "s"} recente${freshOfflineRoutes === 1 ? "" : "s"}.` : connection.detail, ok: online || Boolean(latestRoute), warn: !online && !latestRoute },
    { label: "Rota", detail: latestRoute ? (isOfflineRouteStale(latestRoute.savedAt) ? `salva há ${routeAge(latestRoute.savedAt)} · revisar antes de sair` : `salva há ${routeAge(latestRoute.savedAt)}`) : lastTrip ? "Última viagem registrada, mas não há cópia offline." : "Nenhuma viagem preparada.", ok: Boolean(latestRoute) && !isOfflineRouteStale(latestRoute.savedAt), warn: Boolean(latestRoute && isOfflineRouteStale(latestRoute.savedAt)) },
    { label: "Veículo", detail: vehicle ? vehicle.name || `${vehicle.fuel} · ${vehicle.consumption.toLocaleString("pt-BR")} km/L` : "Nenhum veículo cadastrado.", ok: Boolean(vehicle) },
    { label: "Manutenção", detail: maintenance.length ? (maintenanceWarning ? "Há item vencido ou próximo do vencimento." : "Itens cadastrados dentro do prazo.") : "Nenhum prazo de manutenção cadastrado.", ok: maintenance.length > 0 && !maintenanceWarning, warn: maintenanceWarning },
    { label: "Combustível", detail: fuel.detail, ok: fuel.ok },
  ], [online, latestRoute, vehicle, maintenance, maintenanceWarning, fuel, lastTrip]);

  const readyCount = items.filter(item => item.ok).length;
  const hasWarning = items.some(item => item.warn);
  const status = readyCount === items.length ? "Pronto para sair" : hasWarning ? "Revisar antes de sair" : "Preparação incompleta";
  const routineLabel = mostUsedTrip ? `${mostUsedTrip.origin} → ${mostUsedTrip.destination}` : lastTrip ? `${lastTrip.origin} → ${lastTrip.destination}` : null;
  const routineOffline = mostUsedTrip ? routes.find(route => route.origin.trim().toLocaleLowerCase("pt-BR") === mostUsedTrip.origin.trim().toLocaleLowerCase("pt-BR") && route.destination.trim().toLocaleLowerCase("pt-BR") === mostUsedTrip.destination.trim().toLocaleLowerCase("pt-BR")) : null;

  return (
    <section className="mobile-card rounded-3xl border border-white/10 bg-[#10181F] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6" aria-labelledby="trip-readiness-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Prontidão da viagem</p>
          <h2 id="trip-readiness-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.045em]">{status}</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{readyCount}/{items.length} pontos verificados localmente · sem enviar seus dados para um servidor.</p>
        </div>
        <div className={hasWarning ? "grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFC928]/10 text-[#FFD66B]" : "grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"}>
          {hasWarning ? <CircleAlert className="size-5" /> : <ShieldCheck className="size-5" />}
        </div>
      </div>
      {routineLabel && (
        <div className="mt-4 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.035] p-3">
          <p className="text-[0.52rem] font-black uppercase tracking-[.12em] text-[#3DE3FF]">Rotina detectada localmente</p>
          <p className="mt-1 truncate text-xs font-extrabold text-white">{routineLabel}</p>
          <p className="mt-1 text-[0.58rem] text-white/45">{mostUsedTrip ? "Esta é a rota mais usada na memória deste aparelho." : "Última rota registrada neste aparelho."}</p>
          {routineOffline && <p className={"mt-1 text-[0.55rem] font-bold " + (isOfflineRouteStale(routineOffline.savedAt) ? "text-amber-200" : "text-[#C7FF3C]")}>{isOfflineRouteStale(routineOffline.savedAt) ? "Cópia offline antiga · revisar antes de depender dela." : "Cópia offline disponível para contingência."}</p>}
        </div>
      )}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {items.map(item => (
          <div key={item.label} className={"min-w-[10.5rem] snap-start rounded-2xl border p-3 sm:min-w-0 " + (item.ok ? "border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04]" : item.warn ? "border-[#FFC928]/20 bg-[#FFC928]/[.05]" : "border-white/8 bg-white/[.025]")}>
            {item.label === "Conexão" ? <CloudOff className="size-4 text-[#3DE3FF]" /> : item.label === "Veículo" ? <ShieldCheck className="size-4 text-[#3DE3FF]" /> : item.label === "Manutenção" ? <Wrench className="size-4 text-[#C7FF3C]" /> : item.label === "Combustível" ? <Fuel className="size-4 text-[#C7FF3C]" /> : <CheckCircle2 className="size-4 text-[#C7FF3C]" />}
            <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[.1em] text-white/50">{item.label}</p>
            <p className="mt-1 text-[0.65rem] font-bold leading-relaxed text-white/80">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
