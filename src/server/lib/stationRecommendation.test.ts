import { describe, expect, it } from "vitest";
import { estimatedDetourKm, recommendFuelStop, selectFuelRecommendationCandidates } from "./stationRecommendation";

const origin = { lat: -15.8, lng: -48.0 };
const destination = { lat: -15.8, lng: -47.0 };

describe("station recommendation", () => {
  it("prioriza preço referenciado com peso maior que o desvio estimado", () => {
    const recommendation = recommendFuelStop([
      { placeId: "a", name: "Mais caro", address: "A", lat: -15.8, lng: -47.5, priceReference: { price: "6.00" } },
      { placeId: "b", name: "Melhor preço", address: "B", lat: -15.81, lng: -47.5, priceReference: { price: "5.20" } },
    ], origin, destination);
    expect(recommendation).toMatchObject({ placeId: "b", price: 5.2, comparedStops: 2 });
  });

  it("não cria recomendação quando os postos não têm preço referenciado", () => {
    expect(recommendFuelStop([{ placeId: "a", name: "Sem preço", address: "A", lat: -15.8, lng: -47.5 }], origin, destination)).toBeNull();
  });

  it("calcula desvio aproximado nulo para ponto sobre o segmento", () => {
    expect(estimatedDetourKm({ lat: -15.8, lng: -47.5 }, origin, destination)).toBe(0);
  });

  it("permite priorizar preço ou desvio real sem alterar a lista de elegíveis", () => {
    const candidates = [
      { placeId: "a", name: "Menor desvio", address: "A", lat: -15.8, lng: -47.5, priceReference: { price: "6.00" } },
      { placeId: "b", name: "Menor preço", address: "B", lat: -15.81, lng: -47.5, priceReference: { price: "5.00" } },
    ];
    const realDetoursKm = { a: 0.2, b: 5 };
    expect(recommendFuelStop(candidates, origin, destination, { priceWeight: 100, realDetoursKm })).toMatchObject({ placeId: "b", detourKm: 5, detourSource: "real" });
    expect(recommendFuelStop(candidates, origin, destination, { priceWeight: 0, realDetoursKm })).toMatchObject({ placeId: "a", detourKm: 0.2, detourSource: "real" });
  });

  it("limita a consulta Directions a três candidatos com preço", () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({ placeId: String(index), name: `Posto ${index}`, address: "A", lat: -15.8, lng: -47.9 + index / 100, priceReference: { price: String(5 + index / 10) } }));
    expect(selectFuelRecommendationCandidates(candidates, origin, destination)).toHaveLength(3);
  });

  it("calcula economia líquida somente quando há consumo declarado e desvio real", () => {
    const recommendation = recommendFuelStop([
      { placeId: "a", name: "Mais barato", address: "A", lat: -15.8, lng: -47.5, priceReference: { price: "5.50" } },
      { placeId: "b", name: "Referência maior", address: "B", lat: -15.81, lng: -47.5, priceReference: { price: "6.00" } },
    ], origin, destination, { priceWeight: 70, realDetoursKm: { a: 2, b: 1 }, netSavings: { routeDistanceKm: 100, gasolineKmPerLiter: 10 } });

    expect(recommendation?.netSavings).toEqual({ grossFuelSaving: 5, detourFuelCost: 1.1, value: 3.9, routeLiters: 10 });
    expect(recommendation?.netSavingsMethod).toContain("maior referência avaliada");
  });

  it("omite economia líquida quando o desvio ainda é aproximado", () => {
    const recommendation = recommendFuelStop([{ placeId: "a", name: "Sem rota confirmada", address: "A", lat: -15.8, lng: -47.5, priceReference: { price: "5.50" } }], origin, destination, { netSavings: { routeDistanceKm: 100, gasolineKmPerLiter: 10 } });

    expect(recommendation?.netSavings).toBeNull();
  });
});
