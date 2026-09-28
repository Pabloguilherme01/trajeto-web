type RouteRequest = { origin: string; destination: string; maxAlternatives?: number; avoidTolls?: boolean; avoidHighways?: boolean };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": process.env.TRAJETO_ALLOWED_ORIGIN || "", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
}

async function geocode(query: string, key: string) {
  const response = await fetch("https://api.tomtom.com/search/2/geocode/" + encodeURIComponent(query) + ".json?key=" + encodeURIComponent(key) + "&limit=1&language=pt-BR");
  if (!response.ok) throw new Error("tomtom_geocoding_error");
  const data = await response.json() as { results?: Array<{ position?: { lat?: number; lon?: number } }> };
  const position = data.results?.[0]?.position;
  if (!position || typeof position.lat !== "number" || typeof position.lon !== "number") throw new Error("location_not_found");
  return position;
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const allowedOrigin = process.env.TRAJETO_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get("origin");
  if (!allowedOrigin || (requestOrigin && requestOrigin !== allowedOrigin)) return json({ error: "origin_not_allowed" }, 403);
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return json({ error: "tomtom_provider_not_configured", message: "TomTom ainda não está configurado no servidor." }, 503);
  let body: RouteRequest;
  try { body = await request.json() as RouteRequest; } catch { return json({ error: "invalid_json" }, 400); }
  const origin = body.origin?.trim();
  const destination = body.destination?.trim();
  if (!origin || !destination || origin.length > 300 || destination.length > 300) return json({ error: "invalid_route" }, 400);
  try {
    const [from, to] = await Promise.all([geocode(origin, key), geocode(destination, key)]);
    const params = new URLSearchParams({ key, traffic: "true", routeType: "fastest", travelMode: "car", language: "pt-BR", maxAlternatives: String(Math.min(2, Math.max(0, body.maxAlternatives ?? 2))) });
    const avoid: string[] = [];
    if (body.avoidTolls) avoid.push("tollRoads");
    if (body.avoidHighways) avoid.push("motorways");
    if (avoid.length) params.set("avoid", avoid.join(","));
    const url = "https://api.tomtom.com/routing/1/calculateRoute/" + from.lat + "," + from.lon + ":" + to.lat + "," + to.lon + "/json?" + params.toString();
    const response = await fetch(url);
    if (!response.ok) return json({ error: "tomtom_provider_error", status: response.status, message: (await response.text()).slice(0, 500) }, 502);
    const data = await response.json() as { routes?: Array<{ summary?: { lengthInMeters?: number; travelTimeInSeconds?: number; trafficDelayInSeconds?: number } }> };
    const routes = (data.routes || []).map((route, index) => ({ id: index === 0 ? "principal" : "alternativa-" + index, distanceMeters: route.summary?.lengthInMeters ?? null, durationSeconds: route.summary?.travelTimeInSeconds ?? null, trafficDelaySeconds: route.summary?.trafficDelayInSeconds ?? null }));
    return json({ provider: "tomtom-routing", generatedAt: new Date().toISOString(), trafficAware: true, alternativesAvailable: routes.length > 1, routes });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "tomtom_error" }, 502);
  }
}