export type MobilityContextState =
  | "idle"
  | "planning"
  | "route_ready"
  | "preparing"
  | "navigating"
  | "offline"
  | "completed";

export type MobilityPrimaryAction =
  | "plan_trip"
  | "setup_destination"
  | "repeat_trip"
  | "continue_offline_route"
  | "prepare_trip";

export type MobilityContextInput = {
  online: boolean;
  hasDestination: boolean;
  hasVehicle: boolean;
  hasLastTrip: boolean;
  offlineRoutes: Array<{ savedAt?: string | null }>;
};

export type MobilityCheck = {
  id: "destination" | "vehicle" | "offline_route" | "last_trip" | "connection";
  ready: boolean;
  label: string;
};

export type MobilityContext = {
  state: MobilityContextState;
  primaryAction: MobilityPrimaryAction;
  checks: MobilityCheck[];
  summary: string;
};

function hasFreshOfflineRoute(routes: MobilityContextInput["offlineRoutes"]) {
  return routes.some(route => {
    if (!route.savedAt) return false;
    const timestamp = Date.parse(route.savedAt);
    if (!Number.isFinite(timestamp)) return false;
    return Date.now() - timestamp <= 7 * 24 * 60 * 60 * 1000;
  });
}

export function getMobilityContext(input: MobilityContextInput): MobilityContext {
  const hasOfflineRoute = input.offlineRoutes.length > 0;
  const freshOfflineRoute = hasFreshOfflineRoute(input.offlineRoutes);

  const checks: MobilityCheck[] = [
    { id: "connection", ready: input.online, label: input.online ? "Conexão disponível" : "Sem conexão" },
    { id: "destination", ready: input.hasDestination, label: input.hasDestination ? "Destino configurado" : "Destino pendente" },
    { id: "vehicle", ready: input.hasVehicle, label: input.hasVehicle ? "Veículo configurado" : "Veículo pendente" },
    { id: "offline_route", ready: hasOfflineRoute, label: hasOfflineRoute ? (freshOfflineRoute ? "Rota offline recente" : "Rota offline antiga") : "Sem rota offline" },
    { id: "last_trip", ready: input.hasLastTrip, label: input.hasLastTrip ? "Última viagem disponível" : "Sem viagem anterior" },
  ];

  if (!input.online && hasOfflineRoute) {
    return {
      state: "offline",
      primaryAction: "continue_offline_route",
      checks,
      summary: freshOfflineRoute
        ? "Sem internet. Uma rota salva recentemente está disponível neste aparelho."
        : "Sem internet. Existe uma rota salva, mas ela pode estar desatualizada.",
    };
  }

  if (!input.hasDestination) {
    return {
      state: "preparing",
      primaryAction: "setup_destination",
      checks,
      summary: "Configure um destino para preparar a próxima viagem.",
    };
  }

  if (input.hasLastTrip) {
    return {
      state: "route_ready",
      primaryAction: "repeat_trip",
      checks,
      summary: "A última viagem está disponível para repetição.",
    };
  }

  if (input.hasVehicle) {
    return {
      state: "planning",
      primaryAction: "prepare_trip",
      checks,
      summary: "O Trajeto pode preparar uma nova viagem com seu veículo configurado.",
    };
  }

  return {
    state: "idle",
    primaryAction: "plan_trip",
    checks,
    summary: "Planeje uma viagem para começar a construir sua rotina local.",
  };
}
