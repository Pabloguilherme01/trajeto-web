import { describe, expect, it } from "vitest";
import {
  buildReusableTripPlannerUrl,
  buildSavedRoutePlannerUrl,
} from "./tripLinks";

describe("trip links", () => {
  it("reopens a normal trip with origin and optional auto mode", () => {
    const url = buildReusableTripPlannerUrl(
      { origin: "Casa", destination: "Hospital" },
      { auto: true },
    );
    expect(url).toContain("origem=Casa");
    expect(url).toContain("destino=Hospital");
    expect(url).toContain("auto=1");
  });

  it("never serializes the private-location label as an origin", () => {
    const url = buildReusableTripPlannerUrl(
      { origin: "Minha localização", destination: "Hospital" },
      { auto: true, drivingMode: true },
    );
    expect(url).toContain("destino=Hospital");
    expect(url).toContain("conducao=1");
    expect(url).not.toContain("origem=");
    expect(url).not.toContain("auto=1");
    expect(url).not.toContain("Minha");
  });

  it("opens saved routes by id only", () => {
    const url = buildSavedRoutePlannerUrl("rota privada 1");
    expect(url).toContain("rota=rota+privada+1");
    expect(url).not.toContain("origem=");
    expect(url).not.toContain("destino=");
  });
});
