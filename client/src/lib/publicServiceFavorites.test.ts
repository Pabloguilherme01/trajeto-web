/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listPublicServiceFavorites, togglePublicServiceFavorite } from "./publicServiceFavorites";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("serviços públicos salvos", () => {
  it("persists additions and removals across reads", () => {
    expect(togglePublicServiceFavorite("sic").ok).toBe(true);
    expect(listPublicServiceFavorites()).toEqual(["sic"]);
    togglePublicServiceFavorite("ouvidoria-municipal");
    togglePublicServiceFavorite("sic");
    expect(listPublicServiceFavorites()).toEqual(["ouvidoria-municipal"]);
  });
  it("keeps existing favorites when storage rejects a write", () => {
    togglePublicServiceFavorite("sic");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(togglePublicServiceFavorite("saneago")).toMatchObject({ ok: false, saved: false, ids: ["sic"] });
    expect(togglePublicServiceFavorite("sic")).toMatchObject({ ok: false, saved: true, ids: ["sic"] });
    expect(listPublicServiceFavorites()).toEqual(["sic"]);
  });
  it("handles corrupt or unavailable storage", () => {
    localStorage.setItem("trajeto:public-service-favorites:v1", "invalid");
    expect(listPublicServiceFavorites()).toEqual([]);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(listPublicServiceFavorites()).toEqual([]);
  });
});
