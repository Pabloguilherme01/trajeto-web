import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Planner private-history defaults", () => {
  const source = readFileSync(new URL("./Planner.tsx", import.meta.url), "utf8");

  it("does not prefill a current-location label without a live private handoff", () => {
    expect(source).toContain("isCurrentLocationLabel(historicalOrigin) ? \"\" : historicalOrigin");
    expect(source).toContain("queryParams.get(\"destino\") || initialTrip?.destination || \"\"");
  });
});

describe("Home internal search", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("keeps discovery shortcuts inside the Trajeto instead of requiring Google Maps", () => {
    expect(source).toContain('setLocation(appUrl("/buscar") + "?q=centro")');
    expect(source).toContain('rememberIntent("search")');
    expect(source).not.toContain("buildGoogleMapsSearchUrl(query)");
  });
});
