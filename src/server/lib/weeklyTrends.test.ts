import { describe, expect, it } from "vitest";
import { aggregateDailyTimestamps, buildWeeklyTrend } from "./weeklyTrends";

describe("weekly trends", () => {
  it("fills a seven-day real-data window with zeroes only for days without records", () => {
    const trend = buildWeeklyTrend([{ day: "2026-08-16", total: 3 }, { day: "2026-08-18", total: 1 }], new Date("2026-08-18T15:00:00.000Z"));
    expect(trend).toHaveLength(7);
    expect(trend.map(day => day.total)).toEqual([0, 0, 0, 0, 3, 0, 1]);
  });

  it("groups raw timestamps before the weekly window is rendered", () => {
    expect(aggregateDailyTimestamps([new Date("2026-08-18T01:00:00.000Z"), new Date("2026-08-18T18:00:00.000Z")])).toEqual([{ day: "2026-08-18", total: 2 }]);
  });
});
