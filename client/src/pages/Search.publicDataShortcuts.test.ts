import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Search public data shortcuts", () => {
  const source = readFileSync(new URL("./Search.tsx", import.meta.url), "utf8");

  it("keeps high-value public data one tap away", () => {
    expect(source).toContain('"inmet-alertas"');
    expect(source).toContain('"anatel-cobertura"');
    expect(source).toContain('"bcb-correspondentes"');
    expect(source).toContain('"?recurso=" + encodeURIComponent(resourceId)');
  });
});
