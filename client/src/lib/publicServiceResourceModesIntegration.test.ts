import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public services resource mode integration", () => {
  const source = readFileSync(new URL("../pages/PublicServices.tsx", import.meta.url), "utf8");
  const modes = readFileSync(new URL("../components/PublicServiceResourceModes.tsx", import.meta.url), "utf8");

  it("shows just one resource group outside the collapsed advanced categories", () => {
    expect(source.match(/<PublicServiceResourceModes/g)).toHaveLength(1);
    expect(source).not.toContain('aria-label="Recursos disponíveis"');
    const preset = source.indexOf("<PublicServiceResourceModes");
    const disclosure = source.indexOf('<details ref={filterRef}');
    expect(preset).toBeGreaterThan(-1);
    expect(disclosure).toBeGreaterThan(preset);
    expect(modes.match(/aria-label="Recursos disponíveis"/g)).toHaveLength(1);
    expect(modes).toContain("grid-cols-2");
  });

  it("keeps resource selection in the same URL-driven filter flow", () => {
    expect(source).toContain("resource={resource}");
    expect(source).toMatch(/onChange=\{next => \{\s*setResource\(next\);\s*applyFilters\(query, category, false, savedOnly, next\);/);
    expect(source).toContain("publicServiceListUrl({ query: value, category: next, savedOnly: onlySaved, resource: nextResource })");
    for (const expected of ['value: "todos"', 'value: "contato"', 'value: "rota"', 'value: "online"'])
      expect(modes).toContain(expected);
  });
});
