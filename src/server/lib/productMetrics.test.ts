import { describe, it, expect } from "vitest";
import {
  calcRouteToRedemptionConversion,
  calcAnpCoverage,
  calcRecommendationAdoption,
  calcP95,
  calcSuccessRate,
  classifyProviderHealth,
  summarizeMetricsPeriod,
} from "./productMetrics";

describe("calcRouteToRedemptionConversion", () => {
  it("retorna 0 quando não há rotas", () => {
    expect(calcRouteToRedemptionConversion(0, 5)).toBe(0);
    expect(calcRouteToRedemptionConversion(0, 0)).toBe(0);
  });

  it("retorna 0 quando redemptions é negativo", () => {
    expect(calcRouteToRedemptionConversion(10, -1)).toBe(0);
  });

  it("calcula conversão corretamente com valores válidos", () => {
    expect(calcRouteToRedemptionConversion(100, 10)).toBe(10);
    expect(calcRouteToRedemptionConversion(50, 25)).toBe(50);
    expect(calcRouteToRedemptionConversion(200, 40)).toBe(20);
  });

  it("limita valor máximo a 100", () => {
    expect(calcRouteToRedemptionConversion(10, 50)).toBe(100);
  });

  it("não retorna NaN", () => {
    const result = calcRouteToRedemptionConversion(0, 0);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBe(0);
  });
});

describe("calcAnpCoverage", () => {
  it("retorna 0 quando não há paradas", () => {
    expect(calcAnpCoverage(0, 0)).toBe(0);
    expect(calcAnpCoverage(5, 0)).toBe(0);
  });

  it("retorna 0 quando pricedStops é negativo", () => {
    expect(calcAnpCoverage(-1, 10)).toBe(0);
  });

  it("calcula cobertura corretamente com valores válidos", () => {
    expect(calcAnpCoverage(50, 100)).toBe(50);
    expect(calcAnpCoverage(25, 50)).toBe(50);
    expect(calcAnpCoverage(10, 20)).toBe(50);
    expect(calcAnpCoverage(75, 100)).toBe(75);
  });

  it("limita valor máximo a 100", () => {
    expect(calcAnpCoverage(150, 100)).toBe(100);
  });

  it("não retorna NaN", () => {
    const result = calcAnpCoverage(0, 0);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBe(0);
  });
});

describe("calcRecommendationAdoption", () => {
  it("retorna 0 quando não há recommendation_shown", () => {
    expect(calcRecommendationAdoption(5, 0)).toBe(0);
    expect(calcRecommendationAdoption(0, 0)).toBe(0);
  });

  it("retorna 0 quando recommendationRequested é negativo", () => {
    expect(calcRecommendationAdoption(-1, 10)).toBe(0);
  });

  it("calcula adoção corretamente com valores válidos", () => {
    expect(calcRecommendationAdoption(20, 100)).toBe(20);
    expect(calcRecommendationAdoption(50, 100)).toBe(50);
    expect(calcRecommendationAdoption(10, 50)).toBe(20);
  });

  it("limita valor máximo a 100", () => {
    expect(calcRecommendationAdoption(150, 100)).toBe(100);
  });

  it("não retorna NaN", () => {
    const result = calcRecommendationAdoption(0, 0);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBe(0);
  });
});

describe("calcP95", () => {
  it("retorna 0 para array vazio", () => {
    expect(calcP95([])).toBe(0);
  });

  it("calcula p95 corretamente para array com valores", () => {
    const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const p95 = calcP95(values);
    expect(p95).toBeGreaterThanOrEqual(900);
    expect(p95).toBeLessThanOrEqual(1000);
  });

  it("funciona com array de um elemento", () => {
    expect(calcP95([500])).toBe(500);
  });

  it("lida com valores negativos", () => {
    const values = [-100, -50, 0, 50, 100];
    const p95 = calcP95(values);
    expect(p95).toBeGreaterThanOrEqual(50);
  });
});

describe("calcSuccessRate", () => {
  it("retorna 0 quando não há amostras", () => {
    expect(calcSuccessRate(0, 0)).toBe(0);
    expect(calcSuccessRate(0, 5)).toBe(0);
  });

  it("retorna 0 quando successSamples é negativo", () => {
    expect(calcSuccessRate(10, -1)).toBe(0);
  });

  it("calcula taxa de sucesso corretamente", () => {
    expect(calcSuccessRate(100, 95)).toBe(95);
    expect(calcSuccessRate(100, 99)).toBe(99);
    expect(calcSuccessRate(50, 45)).toBe(90);
  });

  it("retorna 100 quando todas as requisições foram bem-sucedidas", () => {
    expect(calcSuccessRate(100, 100)).toBe(100);
  });

  it("limita valor máximo a 100", () => {
    expect(calcSuccessRate(10, 50)).toBe(100);
  });
});

describe("classifyProviderHealth", () => {
  it("classifica como observing quando amostras < 3", () => {
    const result = classifyProviderHealth({ count: 2, successRate: 100, p95Ms: 500 });
    expect(result.state).toBe("observing");
    expect(result.label).toBe("Amostra inicial");
  });

  it("classifica como alert quando sucesso < 95%", () => {
    const result = classifyProviderHealth({ count: 10, successRate: 94, p95Ms: 1000 });
    expect(result.state).toBe("alert");
    expect(result.label).toBe("Alerta");
  });

  it("classifica como alert quando p95 >= 3000ms", () => {
    const result = classifyProviderHealth({ count: 10, successRate: 100, p95Ms: 3000 });
    expect(result.state).toBe("alert");
    expect(result.label).toBe("Alerta");
  });

  it("classifica como attention quando sucesso < 99%", () => {
    const result = classifyProviderHealth({ count: 10, successRate: 98, p95Ms: 1000 });
    expect(result.state).toBe("attention");
    expect(result.label).toBe("Atenção");
  });

  it("classifica como attention quando p95 >= 1500ms", () => {
    const result = classifyProviderHealth({ count: 10, successRate: 100, p95Ms: 1500 });
    expect(result.state).toBe("attention");
    expect(result.label).toBe("Atenção");
  });

  it("classifica como healthy quando dentro dos thresholds", () => {
    const result = classifyProviderHealth({ count: 10, successRate: 100, p95Ms: 1000 });
    expect(result.state).toBe("healthy");
    expect(result.label).toBe("Saudável");
  });
});

describe("summarizeMetricsPeriod", () => {
  it("retorna estrutura estável com dados vazios", () => {
    const result = summarizeMetricsPeriod({
      periodDays: 7,
      routes: [],
      redemptions: [],
      events: [],
      providerSamples: [],
      anpSyncs: [],
    });

    expect(result.periodDays).toBe(7);
    expect(result.routeSearches).toBe(0);
    expect(result.redemptions).toBe(0);
    expect(result.routeToRedemptionConversion).toBe(0);
    expect(result.anpCoverage).toBe(0);
    expect(result.recommendationAdoption).toBe(0);
    expect(result.providerHealth).toEqual([]);
    expect(result.anpSync).toBe(null);
  });

  it("calcula métricas corretamente com dados válidos", () => {
    const result = summarizeMetricsPeriod({
      periodDays: 7,
      routes: [{ id: 1, createdAt: new Date() }, { id: 2, createdAt: new Date() }, { id: 3, createdAt: new Date() }],
      redemptions: [{ id: 1, requestedAt: new Date(), routeSearchId: 1 }],
      events: [
        { event: "recommendation_shown", createdAt: new Date() },
        { event: "recommendation_shown", createdAt: new Date() },
        { event: "recommendation_requested", createdAt: new Date() },
      ],
      providerSamples: [],
      anpSyncs: [],
    });

    expect(result.routeSearches).toBe(3);
    expect(result.redemptions).toBe(1);
    expect(result.routeToRedemptionConversion).toBeGreaterThan(33);
    expect(result.routeToRedemptionConversion).toBeLessThan(34);
    expect(result.recommendationAdoption).toBe(50);
  });

  it("funciona com período de 14 dias", () => {
    const result = summarizeMetricsPeriod({
      periodDays: 14,
      routes: [{ id: 1, createdAt: new Date() }],
      redemptions: [],
      events: [],
      providerSamples: [],
      anpSyncs: [],
    });

    expect(result.periodDays).toBe(14);
  });

  it("funciona com período de 30 dias", () => {
    const result = summarizeMetricsPeriod({
      periodDays: 30,
      routes: [{ id: 1, createdAt: new Date() }],
      redemptions: [],
      events: [],
      providerSamples: [],
      anpSyncs: [],
    });

    expect(result.periodDays).toBe(30);
  });

  it("processa providerHealth corretamente", () => {
    const now = new Date();
    const result = summarizeMetricsPeriod({
      periodDays: 7,
      routes: [],
      redemptions: [],
      events: [],
      providerSamples: [
        { provider: "google_maps", operation: "directions", durationMs: 500, success: true, createdAt: now },
        { provider: "google_maps", operation: "directions", durationMs: 600, success: true, createdAt: now },
        { provider: "google_maps", operation: "directions", durationMs: 700, success: false, createdAt: now },
      ],
      anpSyncs: [],
    });

    expect(result.providerHealth.length).toBe(1);
    expect(result.providerHealth[0].provider).toBe("google_maps");
    expect(result.providerHealth[0].operation).toBe("directions");
    expect(result.providerHealth[0].count).toBe(3);
    expect(result.providerHealth[0].successRate).toBeLessThan(100);
  });

  it("processa anpSync corretamente", () => {
    const now = new Date();
    const result = summarizeMetricsPeriod({
      periodDays: 7,
      routes: [],
      redemptions: [],
      events: [],
      providerSamples: [],
      anpSyncs: [
        { dataset: "price_references", status: "updated", imported: 100, attemptedAt: now },
      ],
    });

    expect(result.anpSync).not.toBe(null);
    expect(result.anpSync?.lastStatus).toBe("updated");
    expect(result.anpSync?.lastImported).toBe(100);
  });
});
