import { describe, expect, it } from "vitest";
import { LOCAL_PLACES, getLocalPlaces, searchLocalPlaces } from "./localPlaces";

describe("local place catalog", () => {
  it("contains food, shopping and useful local references", () => {
    expect(LOCAL_PLACES.length).toBeGreaterThanOrEqual(20);
    expect(searchLocalPlaces("restaurante").some(item => item.id === "giraffas-shopping" || item.id === "spoleto-shopping")).toBe(true);
    expect(searchLocalPlaces("roupas").some(item => item.id === "maria-fifi-store")).toBe(true);
    expect(searchLocalPlaces("eletrônicos").some(item => item.id === "neo-cell")).toBe(true);
  });

  it("supports category filtering without inventing remote data", () => {
    expect(getLocalPlaces("alimentacao").every(item => item.category === "alimentacao")).toBe(true);
    expect(getLocalPlaces("compras").every(item => item.category === "compras")).toBe(true);
  });
});
