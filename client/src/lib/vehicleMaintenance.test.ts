// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getMaintenanceItems, getMaintenanceStatus, saveMaintenanceItem } from "./vehicleMaintenance";

describe("vehicleMaintenance", () => {
  beforeEach(() => localStorage.clear());

  it("persists and sorts maintenance dates", () => {
    expect(saveMaintenanceItem({ id: "pneus", label: "Pneus", dueDate: "2026-12-20" })).toBe(true);
    expect(saveMaintenanceItem({ id: "oleo", label: "Óleo", dueDate: "2026-10-01" })).toBe(true);
    expect(getMaintenanceItems().map(item => item.id)).toEqual(["oleo", "pneus"]);
  });

  it("classifies dates", () => {
    expect(getMaintenanceStatus("2026-01-01", new Date("2026-01-10T12:00:00"))).toBe("vencido");
    expect(getMaintenanceStatus("2026-01-20", new Date("2026-01-10T12:00:00"))).toBe("proximo");
    expect(getMaintenanceStatus("2026-03-01", new Date("2026-01-10T12:00:00"))).toBe("ok");
  });
});
