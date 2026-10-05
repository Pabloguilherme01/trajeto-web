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
  it("keeps service categories compact and keyboard accessible on mobile", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Categorias de serviços"');
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("shrink-0 snap-start");
  });

  it("uses shared semantic theme tokens instead of a page-specific palette", () => {
    expect(source).not.toMatch(/#0B1014|#121B22|#C7FF3C|#3DE3FF/);
    expect(source).toContain("bg-background");
    expect(source).toContain("bg-card");
    expect(source).toContain("text-primary");
  });

});
