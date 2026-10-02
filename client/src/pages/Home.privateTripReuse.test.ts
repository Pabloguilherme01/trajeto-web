import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home private route reuse", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("delegates trip-history URLs to the privacy-safe link builder", () => {
    expect(source).toContain("buildReusableTripPlannerUrl(lastTrip, { auto: true })");
    expect(source).toContain("buildReusableTripPlannerUrl(trip)");
    expect(source).not.toContain('"?origem=" + encodeURIComponent(lastTrip.origin)');
  });
});
