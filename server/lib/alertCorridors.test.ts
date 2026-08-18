import { describe, expect, it } from "vitest";
import { getAlertCorridor, isSlotActiveNow } from "./alertCorridors";

describe("alert corridors", () => {
  it("resolves a saved Entorno corridor to a compact incident query point", () => {
    expect(getAlertCorridor("aguas-lindas")).toMatchObject({ label: "Águas Lindas", point: { lat: -15.761, lng: -48.281 } });
  });

  it("honors the selected time window in Brasilia time", () => {
    expect(isSlotActiveNow("morning", new Date("2026-08-18T10:00:00Z"))).toBe(true);
    expect(isSlotActiveNow("evening", new Date("2026-08-18T10:00:00Z"))).toBe(false);
  });
});
