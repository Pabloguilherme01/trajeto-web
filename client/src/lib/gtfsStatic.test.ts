import { describe, expect, it } from "vitest";
import { gtfsSnapshotStatus, normalizeGtfsStaticSnapshot } from "./gtfsStatic";

const feed = {
  schema: 1,
  feedId: "df-static",
  sourceId: "stpc-df-gtfs",
  generatedAt: "2026-10-02T12:00:00Z",
  agencies: [{ id: "agency", name: "Operador" }],
  routes: [{ id: "route", agencyId: "agency", shortName: "100" }],
  stops: [{ id: "stop", name: "Terminal", lat: -15.7, lng: -48.2 }],
  trips: [{ id: "trip", routeId: "route", serviceId: "weekday" }],
  stopTimes: [{ tripId: "trip", stopId: "stop", sequence: 1, departure: "06:00:00" }],
};

describe("GTFS static snapshot contract", () => {
  it("accepts a referentially consistent static feed", () => {
    expect(normalizeGtfsStaticSnapshot(feed)?.feedId).toBe("df-static");
  });

  it("rejects orphan route and stop references", () => {
    expect(normalizeGtfsStaticSnapshot({
      ...feed,
      trips: [{ ...feed.trips[0], routeId: "missing" }],
    })).toBeNull();
    expect(normalizeGtfsStaticSnapshot({
      ...feed,
      stopTimes: [{ ...feed.stopTimes[0], stopId: "missing" }],
    })).toBeNull();
  });

  it("rejects duplicate ids and invalid coordinates", () => {
    expect(normalizeGtfsStaticSnapshot({
      ...feed,
      stops: [feed.stops[0], { ...feed.stops[0] }],
    })).toBeNull();
    expect(normalizeGtfsStaticSnapshot({
      ...feed,
      stops: [{ ...feed.stops[0], lat: 120 }],
    })).toBeNull();
  });

  it("validates the feed validity window and exposes expiration", () => {
    const dated = normalizeGtfsStaticSnapshot({
      ...feed,
      validFrom: "2026-10-01T00:00:00Z",
      validUntil: "2026-10-31T23:59:59Z",
    });
    expect(dated).not.toBeNull();
    expect(gtfsSnapshotStatus(dated!, new Date("2026-10-15T12:00:00Z"))).toBe("current");
    expect(gtfsSnapshotStatus(dated!, new Date("2026-11-01T00:00:00Z"))).toBe("expired");
    expect(normalizeGtfsStaticSnapshot({
      ...feed,
      validFrom: "2026-11-01T00:00:00Z",
      validUntil: "2026-10-01T00:00:00Z",
    })).toBeNull();
  });

});
