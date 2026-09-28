import type { DailyModeId } from "@/lib/dailyModes";

export type MobilePrimaryInput = {
  online: boolean;
  mode: DailyModeId;
  automaticMode: DailyModeId;
  savedRoutes: number;
  favorite?: { label: string; value: string } | null;
  lastTrip?: { origin: string; destination: string } | null;
};

export type MobilePrimaryAction = {
  kind: "destination" | "repeat" | "offline" | "economy" | "plan";
  label: string;
  target?: { origin?: string; destination?: string; routeList?: boolean; calculator?: boolean };
};

export function chooseMobilePrimaryAction(input: MobilePrimaryInput): MobilePrimaryAction {
  const active = input.mode === "automatico" ? input.automaticMode : input.mode;

  if (active === "offline" && input.savedRoutes > 0) {
    return { kind: "offline", label: "Continuar", target: { routeList: true } };
  }

  if (active === "repetir" && input.lastTrip) {
    return {
      kind: "repeat",
      label: "Repetir",
      target: { origin: input.lastTrip.origin, destination: input.lastTrip.destination },
    };
  }

  if (active === "proxima" && input.favorite) {
    return { kind: "destination", label: input.favorite.label, target: { destination: input.favorite.value } };
  }

  if (active === "economia") {
    return { kind: "economy", label: "Custo", target: { calculator: true } };
  }

  if (!input.online && input.savedRoutes > 0) {
    return { kind: "offline", label: "Continuar", target: { routeList: true } };
  }

  return { kind: "plan", label: input.lastTrip ? "Retomar" : "Planejar" };
}
