import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distanceKm } from "./offlineRouteMath";
import { stationCoordinatePoint } from "./stationListControls";
import { prepareVisibleStationDirectoryCards } from "./stationDirectoryVisibleCards";

type Card = {
  key: string;
  local: { anp: { latitude: number | null; longitude: number | null } | null } | null;
  anp: { latitude: number | null; longitude: number | null } | null;
};
type Saved = { placeId: string };

function previous(cards: Card[], max: number, location: {lat:number;lng:number}|null, saved: Saved[]) {
  return cards.slice(0, max).map((item, i) => {
    const point = stationCoordinatePoint(
      item.anp?.latitude ?? item.local?.anp?.latitude,
      item.anp?.longitude ?? item.local?.anp?.longitude,
    );
    return {
      item,
      index: i + 1,
      saved: saved.some(x => x.placeId === "aguas-lindas:" + item.key),
      point,
      distance: location && point ? distanceKm(location, point) : null,
    };
  });
}

describe("station directory visible card presentation", () => {
  const cards: Card[] = Array.from({ length: 600 }, (_, i) => ({
    key: String(10000000000000 + i),
    local: i % 8 === 0 ? null : { anp: { latitude: -15.76 + i / 100000, longitude: -48.28 } },
    anp: i % 7 === 0 ? null : { latitude: i % 13 === 0 ? 0 : -15.77 + i / 100000, longitude: i % 13 === 0 ? 0 : -48.29 },
  }));
  const saved: Saved[] = Array.from({ length: 40 }, (_, i) => ({ placeId: "aguas-lindas:" + cards[i * 8].key }));
  const ids = new Set(saved.map(item => item.placeId));

  it("preserves distances, coordinate validity, saved status, order, and pagination", () => {
    const source = cards.slice();
    for (const origin of [null, { lat: -15.7545, lng: -48.2816 }]) {
      for (const limit of [0, 1, 12, 24, 40, 600]) {
        expect(prepareVisibleStationDirectoryCards(cards, limit, origin, ids))
          .toEqual(previous(cards, limit, origin, saved));
      }
    }
    expect(cards).toEqual(source);
  });

  it("changes favorites and origins without mutating source rows", () => {
    const first = prepareVisibleStationDirectoryCards(cards, 24, null, ids);
    expect(first[0].saved).toBe(true);
    expect(first[0].distance).toBeNull();
    const cleared = prepareVisibleStationDirectoryCards(cards, 24, { lat: -15.75, lng: -48.28 }, new Set());
    expect(cleared[0].saved).toBe(false);
    expect(first[0].saved).toBe(true);
    expect(first[0].item).toBe(cards[0]);
  });

  it("connects page rendering to memoized saved membership and visible coordinates", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    expect(source).toContain("prepareVisibleStationDirectoryCards(");
    expect(source).toContain("new Set(saved.map(station => station.placeId))");
    expect(source).toContain("visibleDirectoryCards.map(({ item, index, saved: isSaved, point, distance })");
    expect(source).not.toContain('saved={saved.some(savedStation => savedStation.placeId === "aguas-lindas:" + item.key)}');
  });
});
