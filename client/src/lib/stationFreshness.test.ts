import { describe, expect, it } from "vitest";
import { freshnessLevel } from "./stationEntity";

describe("freshnessLevel", () => {
  it("classifies snapshots by age", () => {
    const now = Date.now();
    const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

    expect(freshnessLevel(daysAgo(0))).toBe("fresh");
    expect(freshnessLevel(daysAgo(10))).toBe("recent");
    expect(freshnessLevel(daysAgo(30))).toBe("stale");
    expect(freshnessLevel()).toBe("unknown");
  });
});
