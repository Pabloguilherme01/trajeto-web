import { describe, expect, it } from "vitest";
import { buildGoogleMapsWeeklyStability } from "./googleMapsStability";

describe("google maps weekly stability", () => {
  it("agrega sucesso, p95 e tokens em espera por dia sem inventar amostras", () => {
    const trend = buildGoogleMapsWeeklyStability([
      { createdAt: new Date("2026-08-18T10:00:00.000Z"), success: true, durationMs: 180 },
      { createdAt: new Date("2026-08-18T11:00:00.000Z"), success: false, durationMs: 2_100 },
      { createdAt: new Date("2026-08-18T12:00:00.000Z"), success: true, durationMs: 480 },
    ], [{ createdAt: new Date("2026-08-18T13:00:00.000Z") }], new Date("2026-08-18T15:00:00.000Z"));
    expect(trend.at(-1)).toMatchObject({ key: "2026-08-18", samples: 3, successRate: 67, p95Ms: 2_100, tokensWaiting: 1 });
    expect(trend.slice(0, -1).every(day => day.samples === 0 && day.successRate === null && day.p95Ms === null)).toBe(true);
  });
});
