import { describe, expect, it } from "vitest";
import { shouldPersistRouteSearch } from "./routePrivacy";

describe("route privacy", () => {
  it("never persists anonymous route searches", () => {
    expect(shouldPersistRouteSearch(undefined)).toBe(false);
    expect(shouldPersistRouteSearch(null)).toBe(false);
    expect(shouldPersistRouteSearch(0)).toBe(false);
  });

  it("allows persistence only for a real authenticated user id", () => {
    expect(shouldPersistRouteSearch(42)).toBe(true);
  });
});
