import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Planner saved private route semantics", () => {
  const source = readFileSync(new URL("./Planner.tsx", import.meta.url), "utf8");

  it("treats a saved current-location label as private across sharing and external navigation", () => {
    expect(source).toContain("originPrivate || isCurrentLocationLabel(origin)");
    expect(source).toContain("if (!routeOriginIsPrivate) params.set(\"origem\", origin.trim())");
    expect(source).toContain("routeOriginIsPrivate");
    expect(source).toContain("privateOriginForExternalNavigation(PRIVATE_LOCATION_LABEL)");
    expect(source).toContain("routeOriginIsPrivate ? \"\" : origin");
  });

  it("keeps private saved routes out of the network-backed route map", () => {
    expect(source).toContain("privateOrigin={routeOriginIsPrivate}");
  });
});
