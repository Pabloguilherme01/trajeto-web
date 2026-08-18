import { describe, expect, it } from "vitest";

const apiKey = process.env.TOMTOM_API_KEY;
const validate = apiKey && process.env.TOMTOM_TRAFFIC_ENABLED === "true" ? it : it.skip;

describe("TomTom Traffic credential", () => {
  validate("autoriza uma consulta mínima de incidentes para o Entorno do DF", async () => {
    const url = new URL("https://api.tomtom.com/traffic/services/4/incidentDetails/s3/-16.2,-48.4,-15.4,-47.1/json");
    url.searchParams.set("key", apiKey!);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    expect(response.ok).toBe(true);
  }, 15_000);
});
