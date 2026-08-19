import { describe, expect, it } from "vitest";
import { buildAlertIntensityByHour } from "./alertIntensity";

describe("alert intensity", () => {
  it("agrupa notificações na hora de Brasília", () => {
    const intensity = buildAlertIntensityByHour([new Date("2026-08-19T12:10:00Z"), new Date("2026-08-19T12:55:00Z"), new Date("2026-08-19T21:00:00Z")]);
    expect(intensity[9]).toMatchObject({ label: "09h", total: 2 });
    expect(intensity[18]).toMatchObject({ label: "18h", total: 1 });
  });
});
