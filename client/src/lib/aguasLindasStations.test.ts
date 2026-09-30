import { describe, expect, it } from "vitest";
import {
  AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE,
  AGUAS_LINDAS_PRICE_REFERENCE,
  AGUAS_LINDAS_STATION_STATS,
  AGUAS_LINDAS_STATIONS,
  AGUAS_LINDAS_STATIONS_COUNT,
  getTopAguasLindasNeighborhoods,
  searchAguasLindasStations,
  stationMapsSearchUrl,
} from "./aguasLindasStations";

describe("diretório de postos de Águas Lindas", () => {
  it("mantém os 41 cadastros da coleta e referências externas separadas", () => {
    expect(AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE.count).toBe(31);
    expect(AGUAS_LINDAS_PRICE_REFERENCE.gasolineCommon.average).toBe(6.78);
    expect(AGUAS_LINDAS_STATION_STATS.total).toBe(41);
    expect(AGUAS_LINDAS_STATIONS_COUNT).toBe(41);
    expect(AGUAS_LINDAS_STATIONS).toHaveLength(41);
    expect(new Set(AGUAS_LINDAS_STATIONS.map(item => item.cnpj)).size).toBe(41);
  });

  it("retorna a base completa para buscas genéricas e variações da cidade", () => {
    expect(searchAguasLindasStations("postos")).toHaveLength(41);
    expect(searchAguasLindasStations("combustíveis")).toHaveLength(41);
    expect(searchAguasLindasStations("Águas Lindas de Goiás, GO")).toHaveLength(41);
    expect(searchAguasLindasStations("postos em Águas Lindas de Goiás")).toHaveLength(41);
  });

  it("permite localizar por nome, alias, CNPJ e texto sem acento", () => {
    expect(searchAguasLindasStations("ponteio")[0]?.displayName).toContain("Ponteio");
    expect(searchAguasLindasStations("00.375.386/0002-05")[0]?.displayName).toContain("Mizuno");
    expect(searchAguasLindasStations("Jardim Querência").length).toBeGreaterThan(0);
    expect(searchAguasLindasStations("perola")[0]?.displayName).toContain("Pérola");
  });

  it("ordena atalhos de bairro pelo número real de cadastros e respeita o limite", () => {
    const shortcuts = getTopAguasLindasNeighborhoods(4);
    expect(shortcuts).toHaveLength(4);
    expect(shortcuts.every(item => item.name && item.count > 0)).toBe(true);
    expect(shortcuts[0]!.count).toBeGreaterThanOrEqual(shortcuts[1]!.count);
    expect(getTopAguasLindasNeighborhoods(0)).toEqual([]);
  });

  it("mantém referências de mapas separadas da confirmação ANP", () => {
    expect(AGUAS_LINDAS_STATION_STATS.mapEnriched).toBeGreaterThan(0);
    expect(AGUAS_LINDAS_STATIONS.some(item => item.dataOrigin === "cross-check")).toBe(true);
    expect(AGUAS_LINDAS_STATIONS.some(item => item.dataOrigin === "ANP")).toBe(false);
    expect(AGUAS_LINDAS_STATIONS.filter(item => item.dataOrigin === "cross-check").length).toBe(
      AGUAS_LINDAS_STATION_STATS.mapEnriched,
    );
    expect(AGUAS_LINDAS_STATIONS.find(item => item.id === "jardim-brasilia")?.mapData?.operationalStatus).toBe("closed");
  });

  it("gera um link seguro para consulta do posto no Google Maps", () => {
    const station = AGUAS_LINDAS_STATIONS[0];
    expect(stationMapsSearchUrl(station)).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(stationMapsSearchUrl(station)).toContain(encodeURIComponent(station.displayName));
  });
});
