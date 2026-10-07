import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Stations nearby offline", () => {
  const source = readFileSync(new URL("./Stations.tsx", import.meta.url), "utf8");

  it("does not require network connectivity for nearby sorting", () => {
    expect(source).toContain('disabled={locating || typeof navigator === "undefined" || !navigator.geolocation}');
    expect(source).not.toContain("disabled={locating || !online}");
  });

  it("explains that GPS proximity is computed locally", () => {
    expect(source).toContain("continua funcionando offline com o GPS do aparelho e o catálogo local");
    expect(source).toContain("Sua posição não é enviada ao diretório");
  });

  it("minimizes device GPS precision before keeping it in session memory", () => {
    expect(source).toContain("coarsenCoordinatePoint");
    expect(source).toContain("enableHighAccuracy: false");
    expect(source).not.toContain("enableHighAccuracy: true");
    expect(source).not.toContain("setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude })");
  });

  it("makes station deep links accessible and motion-aware", () => {
    expect(source).toContain("(prefers-reduced-motion: reduce)");
    expect(source).toContain("element.focus({ preventScroll: true })");
    expect(source).toContain('behavior: reduceMotion ? "auto" : "smooth"');
  });
});
