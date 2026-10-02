import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("route history privacy across mobile surfaces", () => {
  const recentTrips = readFileSync(
    new URL("./RecentTripsCard.tsx", import.meta.url),
    "utf8",
  );
  const daily = readFileSync(
    new URL("./DailyCommandCenter.tsx", import.meta.url),
    "utf8",
  );

  it("uses privacy-safe reusable trip links instead of serializing history origins", () => {
    expect(recentTrips).toContain("buildReusableTripPlannerUrl");
    expect(recentTrips).toContain("buildSavedRoutePlannerUrl(saved.id)");
    expect(recentTrips).not.toContain('"?origem=" + encodeURIComponent(trip.origin)');

    expect(daily).toContain("buildReusableTripPlannerUrl(lastTrip)");
    expect(daily).toContain("buildSavedRoutePlannerUrl(routes[0].id)");
    expect(daily).not.toContain('"&modo=conducao"');
  });

  it("uses the Planner's real driving-mode parameter", () => {
    expect(daily).toContain("buildReusableTripPlannerUrl(lastTrip, { drivingMode: true })");
  });
});
