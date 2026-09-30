import { describe, expect, it } from "vitest";
import {
  AGUAS_LINDAS_STATIONS,
  searchAguasLindasStations,
  stationMapsSearchUrl,
} from "./aguasLindasStations";

describe("diretório de postos de Águas Lindas", () => {
  it("mantém os 31 cadastros da coleta", () => {
    expect(AGUAS_LINDAS_STATIONS).toHaveLength(31);
    expect(new Set(AGUAS_LINDAS_STATIONS.map(item => item.cnpj)).size).toBe(31);
  });

  it("retorna a base completa para a busca genérica de postos", () => {
    expect(searchAguasLindasStations("postos")).toHaveLength(31);
    expect(searchAguasLindasStations("combustíveis")).toHaveLength(31);
  });

  it("permite localizar por nome, alias ou CNPJ", () => {
    expect(searchAguasLindasStations("ponteio")[0]?.displayName).toContain("Ponteio");
    expect(searchAguasLindasStations("00.375.386/0002-05")[0]?.displayName).toContain("Mizuno");
  });

  it("gera um link seguro para consulta do posto no Google Maps", () => {
    const station = AGUAS_LINDAS_STATIONS[0];
    expect(stationMapsSearchUrl(station)).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(stationMapsSearchUrl(station)).toContain(encodeURIComponent(station.displayName));
  });
});
