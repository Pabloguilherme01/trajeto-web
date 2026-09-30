export type PlaceCategory = "fuel" | "health" | "education" | "transport" | "government" | "security" | "leisure" | "accessibility" | "territory";
export type PlaceSource = "ANP" | "IBGE" | "Google" | "Local";
export type PlaceEvidence = { label:string; source:PlaceSource; updatedAt?:string|null; value?:string|null };
export type PlaceEntity = {
  id:string; name:string; category:PlaceCategory; subcategory?:string|null;
  coordinates?:{lat:number;lng:number}|null; address?:string|null; neighborhood?:string|null;
  source:PlaceSource; sourceDate?:string|null;
  status?:"operational"|"temporarily_closed"|"unknown";
  phone?:string|null; mapsUrl?:string|null; evidence?:PlaceEvidence[]; isEnrichment?:boolean;
};
export const PLACE_CATEGORY_LABELS:Record<PlaceCategory,string> = {
  fuel:"Combustíveis", health:"Saúde", education:"Educação", transport:"Transporte",
  government:"Serviços públicos", security:"Segurança", leisure:"Lazer", accessibility:"Acessibilidade",
};
export const PLACE_CATEGORY_ICONS:Record<PlaceCategory,string> = {
  fuel:"⛽", health:"🏥", education:"🏫", transport:"🚌", government:"🏛", security:"🚓", leisure:"🌳", accessibility:"♿",
};
export function placeSourceLabel(source:PlaceSource){ return source==="Google" ? "MAPA" : source; }
