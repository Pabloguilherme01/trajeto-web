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

  it("keeps the service header and emergency actions compact on narrow screens", () => {
    expect(source).toContain("PUBLIC_SERVICE_CATEGORIES.length - 1");
    expect(source).toContain("sm:inline-flex");
    expect(source).toContain('w-[8.5rem]');
    expect(source).toContain("sm:grid sm:grid-cols-4");
  });

  it("prioritizes route and the main contact while keeping secondary options compact", () => {
    expect(source).toContain("const primaryContact = contacts[0]");
    expect(source).toContain("const secondaryContacts = contacts.slice(1)");
    expect(source).toContain("Mais opções");
    expect(source).toContain("PUBLIC_SERVICE_SHORTCUTS.map");
    expect(source).toContain("w-[min(74vw,18rem)]");
  });

  it("keeps every essential action visible when a service is opened directly", () => {
    expect(source).toContain("const expandedActions = selectedService?.id === service.id || results.length === 1");
    expect(source).toContain("expandedActions && secondaryContacts.length > 0");
    expect(source).toContain("expandedActions && service.actionUrl");
    expect(source).toContain("expandedActions && service.email");
    expect(source).toContain("expandedActions && primaryContact");
    expect(source).toContain("!expandedActions && (");
  });

  it("uses shared semantic theme tokens instead of a page-specific palette", () => {
    expect(source).not.toMatch(/#0B1014|#121B22|#C7FF3C|#3DE3FF/);
    expect(source).toContain("bg-background");
    expect(source).toContain("bg-card");
    expect(source).toContain("text-primary");
  });

});
