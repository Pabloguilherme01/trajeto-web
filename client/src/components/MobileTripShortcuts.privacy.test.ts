import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MobileTripShortcuts location privacy", () => {
  const source = readFileSync(
    new URL("./MobileTripShortcuts.tsx", import.meta.url),
    "utf8",
  );

  it("never serializes the device GPS into the planner URL", () => {
    expect(source).toContain("setPrivateLocationHandoff");
    expect(source).toContain('"?local=1&destino="');
    expect(source).not.toContain(
      "encodeURIComponent(position.coords.latitude",
    );
    expect(source).not.toContain(
      "position.coords.latitude + \", \" + position.coords.longitude",
    );
  });
});
