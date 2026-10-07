import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PublicServices deep links", () => {
  const source = readFileSync(
    new URL("./PublicServices.tsx", import.meta.url),
    "utf8"
  );

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
  it("keeps all service categories visible without requiring horizontal discovery", () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Categorias de serviços"');
    expect(source).toContain('className="mt-3 flex flex-wrap gap-2"');
  });

  it("keeps the three emergency numbers visible without squeezing 320px screens", () => {
    expect(source).toContain("PUBLIC_SERVICE_CATEGORIES.length - 1");
    expect(source).toContain("sm:inline-flex");
    expect(source).toContain('className="mt-3 grid grid-cols-1 gap-2 min-[340px]:grid-cols-3"');
  });

  it("puts primary actions before metadata and preparation details", () => {
    expect(source.indexOf('aria-label="Ações principais do serviço"')).toBeGreaterThan(-1);
    expect(source.indexOf('aria-label="Ações principais do serviço"')).toBeLessThan(
      source.indexOf('aria-label="Recursos deste serviço"')
    );
    expect(source.indexOf('aria-label="Ações principais do serviço"')).toBeLessThan(
      source.indexOf("servicePreparationHint(service)")
    );
  });

  it("prioritizes route and the main contact while making daily shortcuts immediately discoverable", () => {
    expect(source).toContain("const primaryContact = contacts[0]");
    expect(source).toContain("const secondaryContacts = contacts.slice(1)");
    expect(source).toContain("Mais opções");
    expect(source).toContain("PUBLIC_SERVICE_SHORTCUTS.slice(0, 7).map");
    expect(source).toContain("PUBLIC_SERVICE_SHORTCUTS.slice(7).map");
    expect(source).toContain("Mais atalhos úteis");
    expect(source).toContain("grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4");
  });

  it("keeps essential actions visible even when offline navigation loses deep-link expansion", () => {
    expect(source).toContain(
      "const expandedActions = selectedService?.id === service.id"
    );
    expect(source).toContain("const emergencyDirect = contacts.some");
    expect(source).toContain("const showSecondaryContacts");
    expect(source).toContain("expandedActions || emergencyDirect");
    expect(source).toContain("const showOfficialAction");
    expect(source).toContain('resource === "online"');
    expect(source).toContain("(!primaryContact && !service.mapQuery)");
    expect(source).toContain("const hasMoreOptions");
    expect(source).toContain("!showOfficialAction");
    expect(source).toContain("!showSecondaryContacts");
  });

  it("does not make the informational header a keyboard-inaccessible scroll region", () => {
    expect(source).toContain('className="mt-3 flex flex-wrap gap-2"');
  });

  it("does not promote Saneago as a ready destination without verified local routing data", () => {
    expect(source).not.toContain('"saneago",');
  });

  it("shows dynamic counts in the ready-route filters", () => {
    expect(source).toContain("Todas as rotas prontas · ${READY_SERVICE_ROUTES.length} destinos");
    expect(source).toContain("const groupCount = READY_SERVICE_ROUTES.filter");
    expect(source).toContain("Filtrar rotas: ${group.label} · ${groupCount} destinos");
  });

  it("keeps ready-route counts dynamic and includes the full local destination catalog", () => {
    expect(source).toContain("ALL_LOCAL_ROUTE_DESTINATIONS.find");
    expect(source).toContain("{READY_SERVICE_ROUTES.length} destinos públicos");
    expect(source).not.toContain("23 destinos públicos");
    expect(source).toContain("policia-civil-2");
    expect(source).toContain("deam-depai-dpca");
  });

  it("offers Organic Maps directly from ready-route cards without nesting actions", () => {
    expect(source).toContain("openOrganicDestination(route.destination, route.label)");
    expect(source).toContain('aria-label={"Abrir " + route.label + " no Organic Maps"}');
    expect(source).toContain(">Organic Maps</span>");
    expect(source).toContain(">Planejar</span>");
    expect(source).toContain("snap-x snap-mandatory");
    expect(source).toContain("snap-start");
    expect(source).toContain("offlineReadyRouteIds");
    expect(source).toContain('data-route-readiness={offlineReadyRouteIds.has(route.id) ? "offline" : "online"}');
    expect(source).toContain("Destino offline");
    expect(source).toContain("Localizar online");
    expect(source).toContain("readyRouteOfflineOnly");
    expect(source).toContain("Mostrar somente destinos offline");
    expect(source).toContain("availabilityRoutes");
    expect(source).toContain('aria-label="Resumo da Central"');
    expect(source).toContain('[READY_SERVICE_ROUTES.length, "rotas prontas"]');
    expect(source).toContain('[offlineReadyRouteIds.size, "destinos offline"]');
  });

  it("offers the official Organic Maps install fallback without exposing GPS", () => {
    expect(source).toContain("ORGANIC_MAPS_INSTALL_URL");
    expect(source).toContain("Instalar ou atualizar Organic Maps");
    expect(source).toContain("window.location.href = url");
  });

  it("uses shared semantic theme tokens instead of a page-specific palette", () => {
    expect(source).not.toMatch(/#0B1014|#121B22|#C7FF3C|#3DE3FF/);
    expect(source).toContain("bg-background");
    expect(source).toContain("bg-card");
    expect(source).toContain("text-primary");
  });
});
