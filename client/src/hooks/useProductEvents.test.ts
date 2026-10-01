// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { productDiagnosticsEnabled } from "./useProductEvents";

describe("product diagnostics privacy", () => {
  beforeEach(() => localStorage.clear());

  it("keeps telemetry disabled by default", () => {
    expect(productDiagnosticsEnabled()).toBe(false);
  });

  it("only enables telemetry after explicit local opt-in", () => {
    localStorage.setItem("trajeto:diagnostics-opt-in", "1");
    expect(productDiagnosticsEnabled()).toBe(true);
  });
});
