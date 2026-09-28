export type RouteIntelligenceRoute = {
  id: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  staticDurationSeconds: number | null;
  toll: { amount: number | null; currency: string; estimated: boolean } | null;
};

export type RouteIntelligence = {
  provider: "google-routes";
  generatedAt: string;
  trafficAware: boolean;
  alternativesAvailable: boolean;
  routes: RouteIntelligenceRoute[];
};

function getEndpoint() {
  const configured = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") + "/api/route-intelligence" : "/api/route-intelligence";
}

export async function fetchRouteIntelligence(input: {
  origin: string;
  destination: string;
  waypoints?: string[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}): Promise<RouteIntelligence> {
  const response = await fetch(getEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || "Não foi possível consultar a inteligência da rota.");
    (error as Error & { code?: string }).code = data?.error;
    throw error;
  }
  return data as RouteIntelligence;
}
