import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PublicData deep links", () => {
  const source = readFileSync(new URL("./PublicData.tsx", import.meta.url), "utf8");

  it("scrolls and focuses selected resource deep links", () => {
    expect(source).toContain('"resource-" + selectedResource');
    expect(source).toContain('window.location.hash === "#transporte"');
    expect(source).toContain("target.scrollIntoView");
    expect(source).toContain("target.focus({ preventScroll: true })");
  });

  it("respects reduced-motion preference", () => {
    expect(source).toContain("(prefers-reduced-motion: reduce)");
    expect(source).toContain('behavior: reduceMotion ? "auto" : "smooth"');
  });
});
