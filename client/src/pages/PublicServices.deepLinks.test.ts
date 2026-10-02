import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PublicServices deep links", () => {
  const source = readFileSync(new URL("./PublicServices.tsx", import.meta.url), "utf8");

  it("moves focus to a selected service or emergency strip", () => {
    expect(source).toContain('"service-" + selectedService.id');
    expect(source).toContain('"emergency-strip"');
    expect(source).toContain("target.scrollIntoView");
    expect(source).toContain("target.focus({ preventScroll: true })");
  });

  it("respects reduced-motion preferences", () => {
    expect(source).toContain("(prefers-reduced-motion: reduce)");
    expect(source).toContain('behavior: reduceMotion ? "auto" : "smooth"');
  });
});
