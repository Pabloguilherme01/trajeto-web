export type AppleRouteIntelligence = {
  provider: "apple-maps-server";
  generatedAt: string;
  alternativesAvailable: boolean;
  routes: Array<{
    id: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
    toll: { available: boolean } | null;
    name: string | null;
  }>;
};

export async function fetchAppleRouteIntelligence(input: {
  origin: string;
  destination: string;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}): Promise<AppleRouteIntelligence> {
  const base = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim()?.replace(/\/$/, "") || "";
  const response = await fetch(base + "/api/apple-route-intelligence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || "Não foi possível consultar o Apple Maps Server.");
    (error as Error & { code?: string }).code = data?.error;
    throw error;
  }
  return data as AppleRouteIntelligence;
}
