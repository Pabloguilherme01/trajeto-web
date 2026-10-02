import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home center shortcut", () => {
  const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

  it("opens the Trajeto search instead of an external map", () => {
    expect(source).toContain('setLocation(appUrl("/buscar") + "?q=centro")');
    expect(source).toContain('rememberIntent("search")');
    expect(source).not.toContain('openServiceSearch("Centro Águas Lindas de Goiás, GO")');
  });
});
