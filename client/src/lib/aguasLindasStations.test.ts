import { describe, expect, it } from "vitest";
import {
  AGUAS_LINDAS_STATIONS,
  searchAguasLindasStations,
  stationMapsSearchUrl,
  AGUAS_LINDAS_MAP_ONLY_DISCOVERIES,
  AGUAS_LINDAS_MAP_ONLY_DISCOVERIES_COUNT,
  searchAguasLindasMapDiscoveries,
  mapDiscoverySearchUrl,
} from "./aguasLindasStations";

describe("diretório de postos de Águas Lindas", () => {
  it("mantém os 41 cadastros da coleta e não confunde presença com verificação ANP", () => {
    expect(AGUAS_LINDAS_STATIONS).toHaveLength(41);
    expect(new Set(AGUAS_LINDAS_STATIONS.map(item => item.cnpj)).size).toBe(41);
    expect(AGUAS_LINDAS_STATIONS.every(item => item.dataQuality === "catalog-only")).toBe(true);
    expect(AGUAS_LINDAS_STATIONS.every(item => item.dataOrigin === "local-catalog")).toBe(true);
    expect(AGUAS_LINDAS_STATIONS.every(item => !item.verificationFlags?.address && !item.verificationFlags?.brand)).toBe(true);
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

  it("gera um link seguro para consulta do posto no Google Maps", () => {
    const station = AGUAS_LINDAS_STATIONS[0];
    expect(stationMapsSearchUrl(station)).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(stationMapsSearchUrl(station)).toContain(encodeURIComponent(station.displayName));
  });
});

describe("descobertas públicas complementares de mapas", () => {
  it("mantém as descobertas separadas do catálogo cadastral", () => {
    expect(AGUAS_LINDAS_MAP_ONLY_DISCOVERIES_COUNT).toBe(AGUAS_LINDAS_MAP_ONLY_DISCOVERIES.length);
    expect(AGUAS_LINDAS_MAP_ONLY_DISCOVERIES_COUNT).toBeGreaterThan(0);
  });

  it("permite localizar descobertas por consulta", () => {
    expect(searchAguasLindasMapDiscoveries("postos")).toHaveLength(AGUAS_LINDAS_MAP_ONLY_DISCOVERIES_COUNT);
    expect(searchAguasLindasMapDiscoveries("ZM Combustíveis")[0]?.displayName).toBe("ZM Combustíveis");
  });

  it("gera URL do mapa para uma descoberta", () => {
    expect(mapDiscoverySearchUrl(AGUAS_LINDAS_MAP_ONLY_DISCOVERIES[0])).toContain("https://www.google.com/maps/search/?api=1&query=");
  });
});
