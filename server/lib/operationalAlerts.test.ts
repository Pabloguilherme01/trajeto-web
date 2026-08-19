import { describe, expect, it } from "vitest";
import { evaluateRegionalPaginationAlerts, operationalAlertNotificationCooldownMs, shouldNotifyOperationalAlert } from "./operationalAlerts";

describe("operational alerts", () => {
  it("avalia uma janela móvel de 24 horas sem contar ocorrências antigas", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    const result = evaluateRegionalPaginationAlerts([
      { region: "Águas Lindas de Goiás, GO", createdAt: new Date("2026-08-19T10:00:00.000Z") },
      { region: "Águas Lindas de Goiás, GO", createdAt: new Date("2026-08-19T11:00:00.000Z") },
      { region: "Águas Lindas de Goiás, GO", createdAt: new Date("2026-08-18T10:00:00.000Z") },
    ], [{ region: "Águas Lindas de Goiás, GO", threshold: 2 }], [], now);
    expect(result).toEqual([{ region: "Águas Lindas de Goiás, GO", threshold: 2, observedCount: 2, critical: true }]);
  });

  it("limita lembretes até o cooldown expirar", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    expect(shouldNotifyOperationalAlert(new Date(now.getTime() - operationalAlertNotificationCooldownMs + 1), now)).toBe(false);
    expect(shouldNotifyOperationalAlert(new Date(now.getTime() - operationalAlertNotificationCooldownMs), now)).toBe(true);
  });
});
