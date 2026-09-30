type RouteRequest = {
  origin: string;
  destination: string;
  waypoints?: string[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  emissionType?: "GASOLINE" | "DIESEL" | "HYBRID" | "ELECTRIC";
  trafficDetailed?: boolean;
};

function json(data: unknown, status = 200, allowedOrigin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": allowedOrigin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "vary": "Origin",
    },
  });
}

export default async function handler(request: Request) {
  const configuredOrigin = process.env.TRAJETO_ALLOWED_ORIGIN?.trim();
  if (request.method === "OPTIONS") {
    return configuredOrigin ? json({ ok: true }, 200, configuredOrigin) : json({ error: "server_origin_not_configured" }, 503);
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!configuredOrigin) return json({ error: "server_origin_not_configured" }, 503);

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== configuredOrigin) {
    return json({ error: "origin_not_allowed" }, 403, configuredOrigin);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) return json({ error: "payload_too_large" }, 413, configuredOrigin);

  const apiKey = process.env.GOOGLE_MAPS_ROUTES_API_KEY;
  if (!apiKey) {
    return json({
      error: "routing_provider_not_configured",
      message: "O provedor de rotas ainda não está configurado no servidor.",
    }, 503, configuredOrigin);
  }

  let body: RouteRequest;
  try {
    body = await request.json() as RouteRequest;
  } catch {
    return json({ error: "invalid_json" }, 400, configuredOrigin);
  }

  const origin = body.origin?.trim();
  const destination = body.destination?.trim();
  if (!origin || !destination || origin.length > 300 || destination.length > 300) {
    return json({ error: "invalid_route" }, 400, configuredOrigin);
  }

  const rawWaypoints = Array.isArray(body.waypoints) ? body.waypoints : [];
  const waypoints = rawWaypoints
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const requestBody = {
    origin: { address: origin },
    destination: { address: destination },
    intermediates: waypoints.map(address => ({ address })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: waypoints.length === 0,
    routeModifiers: {
      vehicleInfo: { emissionType: body.emissionType || "GASOLINE" },
      avoidTolls: Boolean(body.avoidTolls),
      avoidHighways: Boolean(body.avoidHighways),
    },
    extraComputations: [
      "TOLLS",
      "FUEL_CONSUMPTION",
      ...(body.trafficDetailed ? ["TRAFFIC_ON_POLYLINE"] : []),
    ],
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
        "routes.travelAdvisory.tollInfo.estimatedPrice",
        "routes.travelAdvisory.fuelConsumptionMicroliters",
        "routes.routeLabels",
        "routes.polyline.encodedPolyline",
        ...(body.trafficDetailed ? ["routes.travelAdvisory.speedReadingIntervals"] : []),
        "routes.legs.distanceMeters",
        "routes.legs.duration",
        "routes.legs.staticDuration",
      ].join(","),
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error(`[GoogleRoutes] provider error ${response.status}`);
    return json({ error: "routing_provider_error", message: "Falha no provedor de rotas." }, 502, configuredOrigin);
  }

  const data = await response.json() as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      staticDuration?: string;
      travelAdvisory?: {
        fuelConsumptionMicroliters?: string;
        tollInfo?: {
          estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }>;
        };
        speedReadingIntervals?: Array<{
          startPolylinePointIndex?: number;
          endPolylinePointIndex?: number;
          speed?: "NORMAL" | "SLOW" | "TRAFFIC_JAM";
        }>;
      };
      routeLabels?: string[];
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const routes = (data.routes || []).map((route, index) => {
    const toll = route.travelAdvisory?.tollInfo?.estimatedPrice?.[0];
    const tollValue = toll
      ? Number(toll.units || 0) + Number(toll.nanos || 0) / 1_000_000_000
      : null;

    const trafficIntervals = body.trafficDetailed ? (route.travelAdvisory?.speedReadingIntervals || []) : [];
    const trafficImpact = body.trafficDetailed ? (() => {
      const points = trafficIntervals.reduce((sum, item) => sum + Math.max(1, (item.endPolylinePointIndex ?? 0) - (item.startPolylinePointIndex ?? 0)), 0);
      const slow = trafficIntervals.reduce((sum, item) => sum + (item.speed === "SLOW" ? Math.max(1, (item.endPolylinePointIndex ?? 0) - (item.startPolylinePointIndex ?? 0)) : 0), 0);
      const jam = trafficIntervals.reduce((sum, item) => sum + (item.speed === "TRAFFIC_JAM" ? Math.max(1, (item.endPolylinePointIndex ?? 0) - (item.startPolylinePointIndex ?? 0)) : 0), 0);
      return { slowPoints: slow, jamPoints: jam, affectedPoints: slow + jam, totalPoints: points };
    })() : null;

    return {
      id: index === 0 ? "principal" : `alternativa-${index}`,
      labels: route.routeLabels || [],
      polyline: route.polyline?.encodedPolyline || null,
      trafficIntervals,
      trafficImpact,
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: route.duration ? Number.parseInt(route.duration, 10) : null,
      staticDurationSeconds: route.staticDuration ? Number.parseInt(route.staticDuration, 10) : null,
      fuelConsumptionLiters: route.travelAdvisory?.fuelConsumptionMicroliters
        ? Number(route.travelAdvisory.fuelConsumptionMicroliters) / 1_000_000
        : null,
      toll: route.travelAdvisory?.tollInfo ? {
        amount: tollValue,
        currency: toll?.currencyCode || "BRL",
        estimated: tollValue != null,
      } : null,
    };
  });

  return json({
    provider: "google-routes",
    generatedAt: new Date().toISOString(),
    trafficAware: true,
    trafficDetailed: Boolean(body.trafficDetailed),
    alternativesAvailable: routes.length > 1,
    routes,
  }, 200, configuredOrigin);
}
