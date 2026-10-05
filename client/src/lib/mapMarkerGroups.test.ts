import { expect, it } from "vitest";
import { mapMarkerGroups } from "./mapMarkerGroups";
it("groups crowded places while preserving the selected place and route endpoints", () => {
  const items = [{ id: "a", x: 10, y: 10 }, { id: "b", x: 12, y: 12 }, { id: "selected", x: 14, y: 14 }, { id: "origin", x: 15, y: 15 }, { id: "far", x: 200, y: 200 }];
  const result = mapMarkerGroups(items, item => item, item => ["selected", "origin"].includes(item.id));
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0].items.map(item => item.id)).toEqual(["a", "b"]);
  expect(result.singles.map(item => item.id)).toEqual(["selected", "origin", "far"]);
  expect(result.groups[0].x).toBe(11);
});
