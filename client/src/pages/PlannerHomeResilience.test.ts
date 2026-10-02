import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Planner private-history defaults", () => {
  const source = readFileSync(new URL("./Planner.tsx", import.meta.url), "utf8");

  it("does not prefill a current-location label without a live private handoff", () => {
    expect(source).toContain("isCurrentLocationLabel(historicalOrigin) ? \"\" : historicalOrigin");
    expect(source).toContain("queryParams.get(\"destino\") || initialTrip?.destination || \"\"");
  });
});

describe("Home offline local search", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("keeps service searches inside the app while offline", () => {
    expect(source).toContain("if (!online)");
    expect(source).toContain("setLocation(internalSearch)");
    expect(source).toContain("buildGoogleMapsSearchUrl(query)");
  });
});
