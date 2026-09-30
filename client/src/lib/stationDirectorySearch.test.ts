import { describe, expect, it } from "vitest";
import { getDistanceKm, haversineKm, normalizeStationSearchText, stationMatchesSearch } from "./stationDirectorySearch";

describe("stationDirectorySearch", () => {
  it("normaliza acentos e pontuação", () => {
    expect(normalizeStationSearchText("Posto Águas Lindas/GO")).toBe("posto aguas lindas go");
  });

  it("faz busca por todos os termos sem depender de caixa", () => {
    expect(stationMatchesSearch(["Auto Posto Shell", "Jardim Brasília"], "shell brasilia")).toBe(true);
    expect(stationMatchesSearch(["Auto Posto Shell", "Jardim Brasília"], "shell centro")).toBe(false);
  });

  it("calcula distância geográfica localmente", () => {
    const distance = haversineKm({ lat: -15.76, lng: -48.28 }, { lat: -15.77, lng: -48.28 });
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(2);
  });

  it("retorna nulo quando falta coordenada", () => {
    expect(getDistanceKm(null, { lat: -15, lng: -48 })).toBeNull();
  });
});
