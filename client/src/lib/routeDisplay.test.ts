import { describe, expect, it } from "vitest";
import { formatArrival, formatDistance, formatDuration } from "./routeDisplay";

describe("route presentation", () => {
  it("retains existing distance and duration labels, including missing data", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(-20)).toBe("—");
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("1 min");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(3660)).toBe("1h 1min");
    expect(formatDistance(undefined)).toBe("—");
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(1600)).toBe("1,6 km");
  });

  it("formats arrival using the same pt-BR clock without depending on local timezone", () => {
    const now = Date.parse("2026-10-10T15:00:00.000Z");
    const expected = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })
      .format(new Date(now + 600000));
    expect(formatArrival(600, now)).toBe(expected);
    expect(formatArrival(0, now)).toBe(new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(now)));
    expect(formatArrival(-1, now)).toBe("—");
    expect(formatArrival(Number.POSITIVE_INFINITY, now)).toBe("—");
  });
});
