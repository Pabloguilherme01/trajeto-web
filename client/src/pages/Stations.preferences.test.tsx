import { describe, expect, it } from "vitest";
import { applyStationSearchPreferences } from "@/lib/stationListControls";

describe("preferências da lista de postos", () => {
  const saved = {
    mappedBrand: "Shell",
    hoursStatus: "open" as const,
    sortBy: "hours" as const,
    anpNeighborhood: "all",
    anpBrand: "all",
    resultsPerView: 10 as const,
    economicMode: false,
  };

  it("reaplica os filtros e a paginação salvos", () => {
    expect(applyStationSearchPreferences(saved)).toEqual({
      brandFilter: "Shell",
      hoursFilter: "open",
      sortBy: "hours",
      resultsPerView: 10,
      visibleResultCount: 10,
    });
  });

  it("força cinco resultados quando o modo econômico está ativo", () => {
    expect(applyStationSearchPreferences({ ...saved, economicMode: true })).toMatchObject({
      resultsPerView: 5,
      visibleResultCount: 5,
    });
  });
});
