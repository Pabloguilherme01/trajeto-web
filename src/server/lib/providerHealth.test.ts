import { describe, expect, it } from "vitest";
import { classifyProviderHealth } from "./providerHealth";

describe("provider health", () => {
  it("mantém amostras pequenas em observação", () => {
    expect(classifyProviderHealth({ count: 2, successRate: 0, p95Ms: 9_000 })).toMatchObject({ state: "observing" });
  });

  it("destaca queda crítica de sucesso ou p95 alto", () => {
    expect(classifyProviderHealth({ count: 10, successRate: 94, p95Ms: 100 })).toMatchObject({ state: "alert" });
    expect(classifyProviderHealth({ count: 10, successRate: 100, p95Ms: 3_000 })).toMatchObject({ state: "alert" });
  });

  it("separa atenção de operação saudável", () => {
    expect(classifyProviderHealth({ count: 10, successRate: 98, p95Ms: 800 })).toMatchObject({ state: "attention" });
    expect(classifyProviderHealth({ count: 10, successRate: 100, p95Ms: 800 })).toMatchObject({ state: "healthy" });
  });
});
