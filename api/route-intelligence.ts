type RouteRequest = {
  origin: string;
  destination: string;
  waypoints?: string[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
};

const allowedOrigin = process.env.TRAJETO_ALLOWED_ORIGIN || "*";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": allowedOrigin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = process.env.GOOGLE_MAPS_ROUTES_API_KEY;
  if (!apiKey) {
    return json({
      error: "routing_provider_not_configured",
      message: "O provedor de rotas ainda não está configurado no servidor.",
    }, 503);
  }

  let body: RouteRequest;
  try {
    body = await request.json() as RouteRequest;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const origin = body.origin?.trim();
  const destination = body.destination?.trim();
  if (!origin || !destination || origin.length > 300 || destination.length > 300) {
    return json({ error: "invalid_route" }, 400);
  }

  const waypoints = (body.waypoints || [])
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const requestBody = {
    origin: { address: origin },
    destination: { address: destination },
    intermediates: waypoints.map(address => ({ address })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: true,
    routeModifiers: {
      avoidTolls: Boolean(body.avoidTolls),
      avoidHighways: Boolean(body.avoidHighways),
    },
    extraComputations: ["TOLLS"],
    languageCode: "pt-BR",
    units: "METRIC",
  };

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": [
        "routes.distanceMeters",
        "routes.duration",
        "routes.staticDuration",
        "routes.travelAdvisory",
        "routes.legs.distanceMeters",
        "routes.legs.duration",
        "routes.legs.staticDuration",
      ].join(","),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const detail = await response.text();
    return json({
      error: "routing_provider_error",
      status: response.status,
      message: detail.slice(0, 500),
    }, 502);
  }

  const data = await response.json() as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      staticDuration?: string;
      travelAdvisory?: {
        tollInfo?: {
          estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }>;
        };
      };
    }>;
  };

  const routes = (data.routes || []).map((route, index) => {
    const toll = route.travelAdvisory?.tollInfo?.estimatedPrice?.[0];
    const tollValue = toll
      ? Number(toll.units || 0) + Number(toll.nanos || 0) / 1_000_000_000
      : null;

    return {
      id: index === 0 ? "principal" : `alternativa-${index}`,
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: route.duration ? Number.parseInt(route.duration, 10) : null,
      staticDurationSeconds: route.staticDuration ? Number.parseInt(route.staticDuration, 10) : null,
      toll: toll ? {
        amount: tollValue,
        currency: toll.currencyCode || "BRL",
        estimated: true,
      } : null,
    };
  });

  return json({
    provider: "google-routes",
    generatedAt: new Date().toISOString(),
    trafficAware: true,
    alternativesAvailable: routes.length > 1,
    routes,
  });
}
