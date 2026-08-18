import { describe, expect, it } from "vitest";
import { routeTrafficStatus } from "./routeTraffic";

const enabled = process.env.TOMTOM_API_KEY && process.env.TOMTOM_TRAFFIC_ENABLED === "true" ? it : it.skip;

describe("route traffic live integration", () => {
  enabled("retorna o estado ativo e a lista real de ocorrências para o Entorno", async () => {
    const traffic = await routeTrafficStatus({ lat: -15.761, lng: -48.281 }, { lat: -15.794, lng: -47.883 });
    expect(traffic.state).toBe("active");
    expect(Array.isArray(traffic.incidents)).toBe(true);
    expect(traffic.officialSources).toHaveLength(3);
  }, 15_000);
});
