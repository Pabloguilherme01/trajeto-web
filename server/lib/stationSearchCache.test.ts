import { afterEach, describe, expect, it } from "vitest";
import { cacheStationSearch, clearStationSearchCache, getCachedStationSearch } from "./stationSearchCache";

describe("stationSearchCache", () => {
  afterEach(clearStationSearchCache);

  it("limita o cache para evitar crescimento sem limite com consultas únicas", () => {
    for (let index = 0; index < 101; index += 1) {
      cacheStationSearch(`consulta-${index}`, { index }, 1_000);
    }
    expect(getCachedStationSearch("consulta-0", 1_001)).toBeNull();
    expect(getCachedStationSearch<{ index: number }>("consulta-100", 1_001)).toEqual({ index: 100 });
  });

  it("normaliza a chave da primeira busca e expira o resultado rapidamente", () => {
    cacheStationSearch("Águas  Lindas de Goiás", { stations: 20 }, 1_000);
    expect(getCachedStationSearch<{ stations: number }>("aguas lindas de goias", 1_001)).toEqual({ stations: 20 });
    expect(getCachedStationSearch("Águas Lindas de Goiás", 61_000)).toBeNull();
  });

  it("isola resultados de GPS por localização aproximada", () => {
    cacheStationSearch("postos", { marker: "A" }, 1_000, -15.83, -48.95);
    cacheStationSearch("postos", { marker: "B" }, 1_000, -15.84, -48.96);
    expect(getCachedStationSearch<{ marker: string }>("postos", -15.83, -48.95, 1_001)).toEqual({ marker: "A" });
    expect(getCachedStationSearch<{ marker: string }>("postos", -15.84, -48.96, 1_001)).toEqual({ marker: "B" });
  });

  it("isola o cache por tamanho do lote", () => {
    cacheStationSearch("postos", { limit: 20 }, 1_000, undefined, undefined, 20);
    cacheStationSearch("postos", { limit: 8 }, 1_000, undefined, undefined, 8);
    expect(getCachedStationSearch<{ limit: number }>("postos", undefined, undefined, 1_001, 20)).toEqual({ limit: 20 });
    expect(getCachedStationSearch<{ limit: number }>("postos", undefined, undefined, 1_001, 8)).toEqual({ limit: 8 });
  });
});
