import { describe, expect, it } from "vitest";
import { estimatedDetourKm, recommendFuelStop } from "./stationRecommendation";

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
});
