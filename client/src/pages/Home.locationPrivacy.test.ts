import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home location privacy", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("uses an in-memory handoff instead of serializing device GPS", () => {
    expect(source).toContain("setPrivateLocationHandoff");
    expect(source).toContain('params.set("local", "1")');
    expect(source).toContain("PRIVATE_LOCATION_LABEL");
    expect(source).not.toContain(
      'setOrigin(position.coords.latitude.toFixed(5) + ", " + position.coords.longitude.toFixed(5))'
    );
  });

  it("passes only nearby intent from Home", () => {
    expect(source).toContain('setLocation(buildNearbyStationsUrl(appUrl("/postos")))');
    expect(source).not.toContain(
      'buildNearbyStationsUrl(appUrl("/postos"), position.coords.latitude, position.coords.longitude)'
    );
  });
});
