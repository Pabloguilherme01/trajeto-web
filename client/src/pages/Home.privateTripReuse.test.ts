import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home private route reuse", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("does not serialize a private origin when reopening trip history", () => {
    expect(source).toContain("isCurrentLocationLabel(trip.origin)");
    expect(source).toContain('params.set("auto", "1")');
    expect(source).toContain("setLocation(reusableTripUrl(trip))");
    expect(source).not.toContain('"?origem=" + encodeURIComponent(lastTrip.origin)');
  });
});
