import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps live route telemetry readable on a semantic dark surface", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  const rule = css.match(/\.route-navigation\[data-live="true"\]\s+\.route-telemetry\s*\{([^}]*)\}/)?.[1] ?? "";
  expect(rule).toContain("background: var(--card)");
  expect(rule).toContain("color: var(--card-foreground)");
  expect(rule).not.toMatch(/background:\s*(?:white|#fff)/i);
});
