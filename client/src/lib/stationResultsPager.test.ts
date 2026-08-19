import { describe, expect, it } from "vitest";
import { nextVisibleStationCount, visibleStationResults } from "./stationResultsPager";

describe("station results pager", () => {
  it("mostra somente a quantidade escolhida e nunca ultrapassa os resultados carregados", () => {
    expect(visibleStationResults([1, 2, 3, 4, 5, 6], 5)).toEqual([1, 2, 3, 4, 5]);
    expect(nextVisibleStationCount(5, 5, 6)).toBe(6);
  });
});
