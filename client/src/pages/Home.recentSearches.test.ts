import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home recent searches", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("reopens recent queries in universal search instead of turning them into route destinations", () => {
    expect(source).toContain('rememberIntent("search")');
    expect(source).toContain('appUrl("/buscar") + "?q=" + encodeURIComponent(item)');
    expect(source).toContain('aria-label={"Buscar novamente: " + item}');
    expect(source).not.toContain("setDestination(item); rememberSearch(item)");
  });
});
