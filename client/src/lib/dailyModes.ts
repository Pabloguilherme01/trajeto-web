import { getEconomyMode, getLastIntent, getLastTrip, type MobileIntent } from "@/lib/mobilePreferences";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations } from "@/lib/mobileDestinations";

const KEY = "trajeto-daily-mode";
export type DailyModeId = "automatico" | "proxima" | "repetir" | "economia" | "offline" | "conducao";

export type DailyMode = {
  id: DailyModeId;
  label: string;
  detail: string;
  href: string;
};

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getSavedDailyMode(): DailyModeId | null {
  const value = storage()?.getItem(KEY);
  return value === "automatico" || value === "proxima" || value === "repetir" || value === "economia" || value === "offline" || value === "conducao" ? value : null;
}

export function setSavedDailyMode(mode: DailyModeId) {
  try { storage()?.setItem(KEY, mode); } catch {}
}

export function clearSavedDailyMode() {
  try { storage()?.removeItem(KEY); } catch {}
}

export function chooseAutomaticDailyMode(input: {
  online: boolean;
  savedRoutes: number;
  favoriteDestination?: boolean;
  lastTrip?: boolean;
  economy?: boolean;
  intent?: MobileIntent | null;
}): DailyModeId {
  if (!input.online && input.savedRoutes > 0) return "offline";
  if (input.intent === "route" && input.lastTrip) return "repetir";
  if (input.favoriteDestination) return "proxima";
  if (input.economy) return "economia";
  if (input.savedRoutes > 0) return "offline";
  return "proxima";
}

export function getAutomaticDailyMode(online: boolean, savedRoutes: number): DailyModeId {
  const favorite = getFavoriteDestination(getMobileDestinations(), getDestinationUsage());
  return chooseAutomaticDailyMode({
    online,
    savedRoutes,
    favoriteDestination: Boolean(favorite),
    lastTrip: Boolean(getLastTrip()),
    economy: getEconomyMode(),
    intent: getLastIntent(),
  });
}

export function buildDailyModes(online: boolean, savedRoutes: number): DailyMode[] {
  const favorite = getFavoriteDestination(getMobileDestinations(), getDestinationUsage());
  const trip = getLastTrip();
  const modes: DailyMode[] = [
    { id: "automatico", label: "Automático", detail: "Escolhe a próxima ação com seus dados salvos.", href: "/"},
    { id: "proxima", label: favorite ? "Destino frequente" : "Próxima viagem", detail: favorite ? favorite.value : "Planejar um novo destino", href: favorite ? "/planejar?destino=" + encodeURIComponent(favorite.value) : "/planejar" },
    { id: "repetir", label: "Repetir", detail: trip ? trip.origin + " → " + trip.destination : "Última viagem", href: trip ? "/planejar?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination) : "/planejar" },
    { id: "economia", label: "Economia", detail: "Calcular custo, consumo e impacto mensal.", href: "/planejar?economia=1" },
    { id: "offline", label: "Sem internet", detail: savedRoutes ? savedRoutes + (savedRoutes === 1 ? " rota salva" : " rotas salvas") : "Preparar uma rota para usar offline.", href: "/planejar?salvos=1" },
    { id: "conducao", label: "Condução", detail: trip ? "Abrir sua última viagem com menos distração." : "Abrir o planejamento com foco na direção.", href: trip ? "/planejar?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination) + "&modo=driving&conducao=1" : "/planejar?conducao=1" },
  ];
  return online ? modes : modes.filter(mode => mode.id === "automatico" || mode.id === "offline");
}
