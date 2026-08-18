import { afterEach, describe, expect, it } from "vitest";
import { cacheStationSearch, clearStationSearchCache, getCachedStationSearch } from "./stationSearchCache";

describe("stationSearchCache", () => {
  afterEach(clearStationSearchCache);

  it("normaliza a chave da primeira busca e expira o resultado rapidamente", () => {
    cacheStationSearch("Águas  Lindas de Goiás", { stations: 20 }, 1_000);
    expect(getCachedStationSearch<{ stations: number }>("aguas lindas de goias", 1_001)).toEqual({ stations: 20 });
    expect(getCachedStationSearch("Águas Lindas de Goiás", 61_000)).toBeNull();
  });
});
