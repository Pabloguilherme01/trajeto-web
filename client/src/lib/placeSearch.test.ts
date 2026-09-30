import {describe,expect,it} from "vitest";
import {categoryFromGoogleType,categoryToGoogleTypes,inferPlaceCategory,placeMatchesQuery} from "./placeSearch";
describe("placeSearch",()=>{
  it("infere categorias sem IA",()=>{expect(inferPlaceCategory("hospital perto de mim")).toBe("health");expect(inferPlaceCategory("Vapt Vupt")).toBe("government");expect(inferPlaceCategory("postos baratos")).toBe("fuel");});
  it("normaliza busca com acentos",()=>{expect(placeMatchesQuery(["Secretária Municipal"],"secretaria municipal")).toBe(true);});
  it("mapeia categorias para tipos do Google Places",()=>{expect(categoryToGoogleTypes("fuel")).toEqual(["gas_station"]);expect(categoryFromGoogleType(["hospital","point_of_interest"])).toBe("health");});
});
