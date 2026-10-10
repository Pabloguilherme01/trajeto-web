import { describe, expect, it, vi } from "vitest";
import { declutterMapReferences } from "./mapReferenceDeclutter";

type Marker = { id: string; x: number; y: number; isReference: boolean };
const project = (item: Marker) => ({ x: item.x, y: item.y });
const legacy = (items: Marker[], distance = 44) => {
  const occupied = items.filter(item => !item.isReference).map(project);
  return items.filter(item => {
    if (!item.isReference) return true;
    const point = project(item);
    if (occupied.some(other => Math.hypot(point.x - other.x, point.y - other.y) < distance))
      return false;
    occupied.push(point);
    return true;
  });
};

describe("offline map reference decluttering", () => {
  it("never hides a primary endpoint even when it appears after a reference", () => {
    const items: Marker[] = [
      { id: "ref", x: -100, y: -100, isReference: true },
      { id: "origin", x: -100, y: -100, isReference: false },
      { id: "gps", x: 10, y: 10, isReference: false },
      { id: "far", x: 55, y: 10, isReference: true },
      { id: "overlap", x: 54, y: 10, isReference: true },
    ];
    expect(declutterMapReferences(items, project, item => item.isReference).map(item => item.id))
      .toEqual(["origin", "gps", "far"]);
  });

  it("preserves strict 44px boundary and handles negative grid cells", () => {
    const input: Marker[] = [
      { id: "anchor", x: 0, y: 0, isReference: false },
      { id: "on-boundary", x: -44, y: 0, isReference: true },
      { id: "inside", x: -43, y: 0, isReference: true },
      { id: "diagonal", x: -88, y: 44, isReference: true },
    ];
    expect(declutterMapReferences(input, project, item => item.isReference).map(x => x.id))
      .toEqual(legacy(input).map(x => x.id));
  });

  it("matches previous all-pairs behavior across 1200 spaced, overlapping, and dense points", () => {
    let seed = 48271;
    const random = () => {
      seed = seed * 16807 % 2147483647;
      return seed / 2147483647;
    };
    const items: Marker[] = Array.from({ length: 1200 }, (_, i) => ({
      id: "marker-" + i,
      x: Math.round((random() - 0.5) * 2400),
      y: Math.round((random() - 0.5) * 1900),
      isReference: i % 7 !== 0,
    }));
    expect(declutterMapReferences(items, project, item => item.isReference).map(x => x.id))
      .toEqual(legacy(items).map(x => x.id));
  });

  it("projects each marker at most once while using the spatial index", () => {
    const items: Marker[] = Array.from({ length: 2500 }, (_, i) => ({
      id: String(i),
      x: i % 20,
      y: Math.floor(i / 20) % 20,
      isReference: i !== 0,
    }));
    const projection = vi.fn(project);
    const result = declutterMapReferences(items, projection, item => item.isReference);
    expect(result).toEqual([items[0]]);
    expect(projection).toHaveBeenCalledTimes(items.length);
  });
});
