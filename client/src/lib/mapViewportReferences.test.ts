import { describe, expect, it, vi } from "vitest";
import { cullOffscreenMapReferences } from "./mapViewportReferences";
import { declutterMapReferences } from "./mapReferenceDeclutter";
import { mapMarkerGroups } from "./mapMarkerGroups";

type Marker = { id: string; x: number; y: number; reference?: boolean };
const project = (marker: Marker) => ({ x: marker.x, y: marker.y });
const clip = (items: Marker[], pan = { x: 0, y: 0 }, selected = "") =>
  cullOffscreenMapReferences(items, project, item => Boolean(item.reference), item => item.id === selected, { width: 320, height: 360 }, pan);

describe("offline map reference viewport culling", () => {
  it("avoids clustering thousands of distant references on a 320px screen", () => {
    const primary: Marker[] = [
      { id: "origin", x: -2000, y: 10 },
      { id: "destination", x: 100, y: 100 },
      { id: "gps", x: -8000, y: -8000 },
    ];
    const offscreen: Marker[] = Array.from({ length: 4000 }, (_, i) => ({
      id: "ref-" + i, x: 600 + i, y: i % 60, reference: true,
    }));
    const near: Marker = { id: "near", x: 315, y: 300, reference: true };
    const markers = [...primary, ...offscreen, near];
    const result = clip(markers);
    expect(result.map(item => item.id)).toEqual([...primary.map(item => item.id), "near"]);
    const projection = vi.fn(project);
    const groups = mapMarkerGroups(result, projection, () => false);
    expect(groups.singles.length + groups.groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(4);
    expect(projection).toHaveBeenCalledTimes(4);
    expect(markers).toHaveLength(4004);
  });

  it("preserves references near all edges, selection and input order", () => {
    const markers: Marker[] = [
      { id: "left", x: -150, y: 20, reference: true },
      { id: "right", x: 477, y: 20, reference: true },
      { id: "top", x: 10, y: -159, reference: true },
      { id: "bottom", x: 10, y: 519, reference: true },
      { id: "outside", x: 600, y: 400, reference: true },
      { id: "selected", x: 800, y: 800, reference: true },
    ];
    expect(clip(markers, { x: 0, y: 0 }, "selected").map(m => m.id))
      .toEqual(["left", "right", "top", "bottom", "selected"]);
  });

  it("restores panned-in references without mutating the source or losing selected pins", () => {
    const markers: Marker[] = [
      { id: "origin", x: 20, y: 30 },
      { id: "distant", x: 900, y: 60, reference: true },
      { id: "neighbor", x: 910, y: 60, reference: true },
    ];
    expect(clip(markers).map(m => m.id)).toEqual(["origin"]);
    const panned = clip(markers, { x: -800, y: 0 });
    expect(panned.map(m => m.id)).toEqual(["origin", "distant", "neighbor"]);
    expect(declutterMapReferences(panned, m => ({ x: m.x - 800, y: m.y }), m => Boolean(m.reference)).map(m => m.id))
      .toEqual(["origin", "distant"]);
    expect(clip(markers).map(m => m.id)).toEqual(["origin"]);
  });

  it("falls back to original list before layout measurement", () => {
    const data: Marker[] = [{ id: "far", x: 8000, y: 0, reference: true }];
    expect(cullOffscreenMapReferences(data, project, m => Boolean(m.reference), () => false, { width: 0, height: 0 }, { x: 0, y: 0 }))
      .toEqual(data);
  });
});
