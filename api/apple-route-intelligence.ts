type AppleRouteRequest = {
  origin: string;
  destination: string;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": process.env.TRAJETO_ALLOWED_ORIGIN || "",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const allowedOrigin = process.env.TRAJETO_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get("origin");
  if (!allowedOrigin || (requestOrigin && requestOrigin !== allowedOrigin)) return json({ error: "origin_not_allowed" }, 403);

  const token = process.env.APPLE_MAPS_SERVER_TOKEN;
  if (!token) return json({ error: "apple_provider_not_configured", message: "Apple Maps Server API ainda não está configurada no servidor." }, 503);

  let body: AppleRouteRequest;
  try { body = await request.json() as AppleRouteRequest; } catch { return json({ error: "invalid_json" }, 400); }

  const origin = body.origin?.trim();
  const destination = body.destination?.trim();
  if (!origin || !destination || origin.length > 300 || destination.length > 300) return json({ error: "invalid_route" }, 400);

  const params = new URLSearchParams({ origin, destination });
  const avoid: string[] = [];
  if (body.avoidTolls) avoid.push("Tolls");
  if (body.avoidHighways) avoid.push("Highways");
  if (avoid.length) params.set("avoid", avoid.join(","));

  const response = await fetch("https://maps-api.apple.com/v1/directions?" + params.toString(), {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  });

  if (!response.ok) return json({ error: "apple_provider_error", status: response.status, message: (await response.text()).slice(0, 500) }, 502);
  const data = await response.json();
  return json({ provider: "apple-maps-server", generatedAt: new Date().toISOString(), data });
}
