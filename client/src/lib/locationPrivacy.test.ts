import { describe, expect, it } from "vitest";
import {
  coarsenCoordinatePoint,
  coarsenCoordinateText,
  isPreciseLocationText,
  privateOriginForExternalNavigation,
  privateOriginForHistory,
  privateOriginForRouting,
  privateOriginForUrl,
} from "./locationPrivacy";

describe("location privacy", () => {
  it("recognizes precise coordinate text", () => {
    expect(isPreciseLocationText("-15.76123, -48.28123")).toBe(true);
    expect(isPreciseLocationText("Minha localização")).toBe(true);
    expect(isPreciseLocationText("Jardim Brasília")).toBe(false);
  });

  it("keeps precise GPS out of urls history and external links", () => {
    const gps = "-15.76123, -48.28123";
    expect(privateOriginForUrl(gps)).toBe("");
    expect(privateOriginForExternalNavigation(gps)).toBe("");
    expect(privateOriginForHistory(gps)).toBe("Minha localização");
  });

  it("reduces precision before online routing and maps", () => {
    expect(coarsenCoordinateText("-15.76123, -48.28123", 4)).toBe("-15.7612, -48.2812");
    expect(privateOriginForRouting("-15.76123, -48.28123")).toBe("-15.761, -48.281");
    expect(coarsenCoordinatePoint({ lat: -15.76123, lng: -48.28123 }, 3)).toEqual({
      lat: -15.761,
      lng: -48.281,
    });
  });
});
