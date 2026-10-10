import { expect, it } from "vitest";
import fullMap from "../../public/data/aguas-lindas-offline-map.json";
import streetMap from "../../public/data/aguas-lindas-offline-map.json?named-roads";

it("keeps exact named road geometry while omitting unused map geometry from the catalog", () => {
  const named = fullMap.roads.filter(road => road.name.trim() && road.points.length)
    .map(({ id, name, kind, points }) => ({ id, name, kind, points }));
  expect(streetMap).toEqual({ retrievedAt: fullMap.retrievedAt, roads: named });
  expect(JSON.stringify(streetMap).length).toBeLessThan(JSON.stringify(fullMap).length * 0.4);
});
