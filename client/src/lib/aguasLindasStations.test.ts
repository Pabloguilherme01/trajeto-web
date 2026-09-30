import { describe, expect, it } from "vitest";
import {
  AGUAS_LINDAS_STATIONS,
  searchAguasLindasStations,
  stationMapsSearchUrl,
} from "./aguasLindasStations";

describe("diretório de postos de Águas Lindas", () => {
  it("mantém os 41 cadastros da coleta", () => {
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

  it("gera um link seguro para consulta do posto no Google Maps", () => {
    const station = AGUAS_LINDAS_STATIONS[0];
    expect(stationMapsSearchUrl(station)).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(stationMapsSearchUrl(station)).toContain(encodeURIComponent(station.displayName));
  });
});
