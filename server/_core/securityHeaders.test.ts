import { expect, it } from "vitest";
import { productionContentSecurityPolicy } from "./securityHeaders";
it("allows the actual public map images and optional routing without opening script origins", () => {
  const directives = Object.fromEntries(productionContentSecurityPolicy.split(";").filter(Boolean).map(value => {
    const [key, ...sources] = value.trim().split(/\s+/);
    return [key, sources];
  }));
  expect(directives["img-src"]).toContain("https://tile.openstreetmap.org");
  expect(directives["connect-src"]).toContain("https://api.mapbox.com");
  expect(directives["script-src"]).not.toContain("'unsafe-inline'");
  expect(directives["script-src"]).not.toContain("https://tile.openstreetmap.org");
  expect(directives["frame-ancestors"]).toEqual(["'none'"]);
});
