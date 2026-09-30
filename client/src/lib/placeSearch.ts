import type { PlaceCategory } from "@/lib/placeEntity";
export function normalizePlaceSearchText(value:string){
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
export function inferPlaceCategory(query:string):PlaceCategory|"all"{
  const text=normalizePlaceSearchText(query);
  if(!text) return "all";
  if(/(posto|combustivel|gasolina|etanol|diesel|abastecer)/.test(text)) return "fuel";
  if(/(hospital|upa|clinica|saude|farmacia|pronto)/.test(text)) return "health";
  if(/(escola|colegio|creche|faculdade|universidade|educacao)/.test(text)) return "education";
  if(/(onibus|terminal|rodoviaria|transporte|ponto)/.test(text)) return "transport";
  if(/(prefeitura|vapt|secretaria|cras|creas|orgao|servico publico)/.test(text)) return "government";
  if(/(policia|delegacia|bombeiro|seguranca)/.test(text)) return "security";
  if(/(parque|praca|lazer|esporte|quadra|area verde)/.test(text)) return "leisure";
  if(/(acessivel|acessibilidade|rampa)/.test(text)) return "accessibility";
  if(/(bairro|setor|rua|avenida|quadra|cep|endereco|br[- ]?\d+)/.test(text)) return "territory";
  return "all";
}
export function placeMatchesQuery(fields:Array<string|null|undefined>,query:string){
  const tokens=normalizePlaceSearchText(query).split(" ").filter(Boolean);
  if(!tokens.length) return true;
  const haystack=normalizePlaceSearchText(fields.filter(Boolean).join(" "));
  return tokens.every(token=>haystack.includes(token));
}
export function categoryToGoogleTypes(category:PlaceCategory):string[]{
  switch(category){
    case "fuel": return ["gas_station"];
    case "health": return ["hospital","medical_clinic","pharmacy","doctor"];
    case "education": return ["school","primary_school","secondary_school","university"];
    case "transport": return ["bus_station","transit_station","train_station"];
    case "government": return ["city_hall","local_government_office","courthouse","post_office"];
    case "security": return ["police","fire_station"];
    case "leisure": return ["park","playground","stadium"];
    case "accessibility": return [];
  }
}
export function categoryFromGoogleType(types:string[]|undefined):PlaceCategory|null{
  const joined=(types??[]).join(" ");
  if(/gas_station/.test(joined)) return "fuel";
  if(/hospital|medical|pharmacy|doctor|clinic/.test(joined)) return "health";
  if(/school|university|education/.test(joined)) return "education";
  if(/bus_station|transit|train_station/.test(joined)) return "transport";
  if(/city_hall|government|courthouse|post_office/.test(joined)) return "government";
  if(/police|fire_station/.test(joined)) return "security";
  if(/neighborhood|locality|administrative_area|postal_code|route|street_address/.test(joined)) return "territory";
  return null;
}
