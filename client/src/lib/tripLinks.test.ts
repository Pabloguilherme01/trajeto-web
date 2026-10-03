import { describe, expect, it } from "vitest";
import {
  buildDestinationPlannerUrl,
  buildOriginPlannerUrl,
  buildReusableTripPlannerUrl,
  buildSavedRoutePlannerUrl,
  plannerDestinationFromMapItem,
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
  it("does not serialize a precise coordinate origin from legacy history", () => {
    const url = buildReusableTripPlannerUrl(
      { origin: "-15.76123, -48.28123", destination: "Hospital" },
      { auto: true },
    );

    expect(url).toContain("destino=Hospital");
    expect(url).not.toContain("origem=");
    expect(url).not.toContain("-15.76123");
    expect(url).not.toContain("-48.28123");
    expect(url).not.toContain("auto=1");
  });

  it("builds one canonical planner link for a selected destination", () => {
    const url = buildDestinationPlannerUrl("  UPA Mansões Odisseia  ");
    expect(url).toContain("destino=UPA+Mans%C3%B5es+Odisseia");
    expect(url).not.toContain("origem=");
  });

  it("opens the planner with a reusable public origin for Ir daqui", () => {
    const url = buildOriginPlannerUrl("Prefeitura de Águas Lindas");
    expect(url).toContain("origem=Prefeitura+de+%C3%81guas+Lindas");
    expect(url).not.toContain("destino=");
  });

  it("does not serialize a private coordinate as Ir daqui origin", () => {
    const url = buildOriginPlannerUrl("-15.76123, -48.28123");
    expect(url).not.toContain("origem=");
    expect(url).not.toContain("-15.76123");
  });

  it("keeps ANP station name and address together when entering the planner", () => {
    expect(plannerDestinationFromMapItem({
      name: "Posto Exemplo",
      address: "BR-070, Águas Lindas de Goiás",
      source: "ANP",
    })).toBe("Posto Exemplo, BR-070, Águas Lindas de Goiás");
    expect(plannerDestinationFromMapItem({
      name: "UPA",
      address: "UPA Mansões Odisseia, Águas Lindas de Goiás",
      source: "local",
    })).toBe("UPA Mansões Odisseia, Águas Lindas de Goiás");
  });
});
