import { describe, expect, it } from "vitest";

const apiKey = process.env.TOMTOM_API_KEY;
const validate = apiKey && process.env.TOMTOM_TRAFFIC_ENABLED === "true" ? it : it.skip;

describe("TomTom Traffic credential", () => {
  validate("autoriza uma consulta mínima de incidentes para o Entorno do DF", async () => {
    const url = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
    url.searchParams.set("key", apiKey!);
    url.searchParams.set("bbox", "-48.1,-16.0,-47.5,-15.5");
    url.searchParams.set("language", "pt-PT");
    url.searchParams.set("timeValidityFilter", "present");
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    expect(response.ok).toBe(true);
  }, 15_000);
});
