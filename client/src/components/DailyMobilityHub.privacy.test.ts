import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DailyMobilityHub route-link privacy", () => {
  const source = readFileSync(new URL("./DailyMobilityHub.tsx", import.meta.url), "utf8");

  it("does not hand-build origin/destination URLs for repeated or saved trips", () => {
    expect(source).toContain("buildReusableTripPlannerUrl");
    expect(source).toContain("buildSavedRoutePlannerUrl(latestRoute.id)");
    expect(source).not.toContain('"?origem=" + encodeURIComponent(primary.target.origin)');
    expect(source).not.toContain('"&origem=" + encodeURIComponent(latestRoute.origin)');
  });
});
