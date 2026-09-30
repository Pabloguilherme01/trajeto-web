import { describe, expect, it } from "vitest";
import { CITY_PLACES, CITY_SERVICES, searchCityPlaces } from "./aguasLindasCity";

describe("guia urbano de Águas Lindas", () => {
  it("mantém unidades de saúde, referências de transporte e vias com fontes HTTPS", () => {
    expect(CITY_PLACES.filter(place => place.category === "saude")).toHaveLength(19);
    expect(CITY_PLACES.some(place => place.id === "terminal-nelson-alves" && place.checkedAt === "2020-12-28")).toBe(true);
    expect(CITY_PLACES.some(place => place.id === "br-070" && place.source.includes("Lei 341/2002"))).toBe(true);
    expect(CITY_PLACES.every(place => place.sourceUrl.startsWith("https://"))).toBe(true);
    expect(CITY_SERVICES).toHaveLength(5);
  });

  it("filtra sem acento por nome, bairro e categoria", () => {
    expect(searchCityPlaces("barragem", "saude").length).toBeGreaterThan(0);
    expect(searchCityPlaces("hospital estadual")[0]?.id).toBe("heal");
    expect(searchCityPlaces("estruturantes", "via").length).toBeGreaterThan(0);
    expect(searchCityPlaces("inexistente")).toEqual([]);
  });
});
