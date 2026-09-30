import { describe, expect, it } from "vitest";
import { CITY_FEATURED_PLACE_IDS, CITY_PLACES, CITY_SERVICES, getCityPlaceSuggestions, searchCityPlaces } from "./aguasLindasCity";

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
    expect(searchCityPlaces("BR 070", "via")[0]?.id).toBe("br-070");
    expect(searchCityPlaces("cadastro único", "servico")[0]?.id).toBe("cadunico-perola-02");
    expect(searchCityPlaces("inexistente")).toEqual([]);
  });

  it("usa pontos principais únicos e sugestões para todo o diretório", () => {
    expect(new Set(CITY_PLACES.map(place => place.id)).size).toBe(CITY_PLACES.length);
    expect(new Set(CITY_FEATURED_PLACE_IDS).size).toBe(CITY_FEATURED_PLACE_IDS.length);
    expect(getCityPlaceSuggestions()).toHaveLength(8);
    expect(getCityPlaceSuggestions("br-070")[0]?.id).toBe("br-070");
    expect(getCityPlaceSuggestions("unidade inexistente")).toEqual([]);
  });
});
