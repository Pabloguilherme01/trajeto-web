import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OfflineRouteVault privacy", () => {
  const source = readFileSync(new URL("./OfflineRouteVault.tsx", import.meta.url), "utf8");

  it("opens saved routes only by id", () => {
    expect(source).toContain("buildSavedRoutePlannerUrl(route.id)");
    expect(source).not.toContain('"&origem=" + encodeURIComponent(route.origin)');
    expect(source).not.toContain('"&destino=" + encodeURIComponent(route.destination)');
  });

  it("delegates share text and URL to privacy-safe helpers", () => {
    expect(source).toContain("offlineRouteShareText(route)");
    expect(source).toContain("offlineRouteShareUrl(route)");
  });
});
