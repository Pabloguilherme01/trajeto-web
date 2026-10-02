import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Stations nearby offline", () => {
  const source = readFileSync(new URL("./Stations.tsx", import.meta.url), "utf8");

  it("does not require network connectivity for nearby sorting", () => {
    expect(source).toContain('disabled={locating || typeof navigator === "undefined" || !navigator.geolocation}');
    expect(source).not.toContain("disabled={locating || !online}");
  });

  it("explains that GPS proximity is computed locally", () => {
    expect(source).toContain("continua funcionando offline com o GPS do aparelho e o catálogo local");
    expect(source).toContain("Sua posição não é enviada ao diretório");
  });
});
