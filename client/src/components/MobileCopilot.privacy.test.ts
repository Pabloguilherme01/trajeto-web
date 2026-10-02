import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MobileCopilot route privacy", () => {
  const source = readFileSync(new URL("./MobileCopilot.tsx", import.meta.url), "utf8");

  it("uses shared privacy-safe trip helpers", () => {
    expect(source).toContain("buildReusableTripPlannerUrl(state.lastTrip)");
    expect(source).toContain("buildSavedRoutePlannerUrl(latestOfflineRoute.id)");
    expect(source).not.toContain('"?origem=" + encodeURIComponent(state.lastTrip.origin)');
    expect(source).not.toContain('"&origem=" + encodeURIComponent(latestOfflineRoute.origin)');
  });
});
