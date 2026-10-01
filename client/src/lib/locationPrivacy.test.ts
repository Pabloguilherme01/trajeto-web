// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  clearPrivateLocationHistory,
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

  it("clears local location history and routing caches without touching unrelated data", () => {
    localStorage.setItem("trajeto-recent-searches", JSON.stringify(["Casa"]));
    localStorage.setItem("trajeto-route-usage", JSON.stringify({ "casa::trabalho": 2 }));
    localStorage.setItem("trajeto:public-routing:geocode:casa", JSON.stringify({ lat: -15.7, lng: -48.2 }));
    localStorage.setItem("trajeto-mobile-station-favorites", "keep");
    sessionStorage.setItem("trajeto:public-routing:route:test", "cached");

    expect(clearPrivateLocationHistory()).toBe(true);
    expect(localStorage.getItem("trajeto-recent-searches")).toBeNull();
    expect(localStorage.getItem("trajeto-route-usage")).toBeNull();
    expect(localStorage.getItem("trajeto:public-routing:geocode:casa")).toBeNull();
    expect(sessionStorage.getItem("trajeto:public-routing:route:test")).toBeNull();
    expect(localStorage.getItem("trajeto-mobile-station-favorites")).toBe("keep");
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
