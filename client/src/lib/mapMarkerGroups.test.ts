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

it("projects each grouped marker only once and skips projection for preserved markers", () => {
  const items = [{ id: "a", x: 10, y: 10 }, { id: "b", x: 12, y: 12 }, { id: "selected", x: 14, y: 14 }];
  let projections = 0;
  const result = mapMarkerGroups(
    items,
    item => {
      projections += 1;
      return item;
    },
    item => item.id === "selected"
  );
  expect(projections).toBe(2);
  expect(result.groups[0].items.map(item => item.id)).toEqual(["a", "b"]);
  expect(result.singles.map(item => item.id)).toContain("selected");
});

it("keeps the chosen marker and both route endpoints unclustered at mobile cell sizes", () => {
  const markers = [
    { id: "business-1", x: 8, y: 8 },
    { id: "business-2", x: 12, y: 12 },
    { id: "selected", x: 14, y: 14 },
    { id: "origin", x: 16, y: 16 },
    { id: "destination", x: 18, y: 18 },
    { id: "far", x: 400, y: 400 },
  ];
  const selectedKey = "selected";
  const keep = (item: typeof markers[number]) =>
    item.id === selectedKey || item.id === "origin" || item.id === "destination";
  const result = mapMarkerGroups(markers, item => item, keep, 96);
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0].items.map(item => item.id)).toEqual(["business-1", "business-2"]);
  expect(result.singles.map(item => item.id)).toEqual(["selected", "origin", "destination", "far"]);
  expect(result.groups[0].x).toBe(10);
  expect(result.groups[0].y).toBe(10);
});
