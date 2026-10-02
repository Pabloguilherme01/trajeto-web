import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DailyCommandCenter repeat-card privacy", () => {
  const source = readFileSync(new URL("./DailyCommandCenter.tsx", import.meta.url), "utf8");

  it("does not hand-build the repeat-card origin URL", () => {
    expect(source).toContain("buildReusableTripPlannerUrl(lastTrip)");
    expect(source).not.toContain('"?origem=" + encodeURIComponent(lastTrip.origin)');
  });
});
