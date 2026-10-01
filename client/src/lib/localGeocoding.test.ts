import { describe, expect, it } from "vitest";
import { LOCAL_GEOCODE_POINTS, resolveLocalGeocodePoint } from "./localGeocoding";

describe("local geocoding catalog", () => {
  it("resolves a prepared destination without network geocoding", () => {
    expect(resolveLocalGeocodePoint("UPA Mansões Odisseia")).toEqual({
      lat: -15.77665,
      lng: -48.27935,
    });
  });

  it("resolves route-preset text that continues with address context", () => {
    expect(
      resolveLocalGeocodePoint(
        "Hospital Municipal Bom Jesus, Q 109, Setor 10, Águas Lindas de Goiás, GO"
      )
    ).toEqual({
      lat: -15.73821,
      lng: -48.29041,
    });
  });

  it("keeps unknown or ambiguous text out of the prepared catalog", () => {
    expect(resolveLocalGeocodePoint("shopping")).toBeNull();
    expect(resolveLocalGeocodePoint("hospital")).toBeNull();
    expect(resolveLocalGeocodePoint("Rua desconhecida 123")).toBeNull();
  });

  it("keeps source and verification metadata for every prepared point", () => {
    expect(LOCAL_GEOCODE_POINTS.length).toBeGreaterThanOrEqual(6);
    for (const point of LOCAL_GEOCODE_POINTS) {
      expect(point.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(point.sourceLabel.length).toBeGreaterThan(3);
      expect(point.sourceUrl).toMatch(/^https:\/\//);
      expect(Number.isFinite(point.lat)).toBe(true);
      expect(Number.isFinite(point.lng)).toBe(true);
    }
  });
});
