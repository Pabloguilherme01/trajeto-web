import snapshot from "../../public/data/aguas-lindas-neighborhoods.json";

export type CityNeighborhood = {
  id: string; name: string; nameSource: string; precision: string;
  lat?: number; lng?: number; referenceCount?: number;
};
export const CITY_NEIGHBORHOODS: readonly CityNeighborhood[] = snapshot.items;
export const LOCATED_NEIGHBORHOODS = CITY_NEIGHBORHOODS.filter(
  (item): item is CityNeighborhood & { lat: number; lng: number } =>
    typeof item.lat === "number" && Number.isFinite(item.lat) && typeof item.lng === "number" && Number.isFinite(item.lng)
);
export function neighborhoodSearchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1");
}
type ScreenPoint = { x: number; y: number };
export function layoutNeighborhoodLabels(
  items: readonly (CityNeighborhood & { lat: number; lng: number })[],
  project: (item: { lat: number; lng: number }) => ScreenPoint,
  width: number, height: number, selectedId: string | null, occupied: readonly ScreenPoint[] = []
) {
  const labels: Array<CityNeighborhood & ScreenPoint & { width: number }> = [];
  const candidates = items.map(item=>({item,...project(item)})).sort((a,b)=>
    Number(b.item.id===selectedId)-Number(a.item.id===selectedId) ||
    Math.hypot(a.x-width/2,a.y-height/2)-Math.hypot(b.x-width/2,b.y-height/2) || a.item.id.localeCompare(b.item.id));
  for(const point of candidates) {
    const labelWidth=Math.min(220,Math.max(50,point.item.name.length*7));
    if(point.x<labelWidth/2+8||point.x>width-labelWidth/2-8||point.y<64||point.y>height-64)continue;
    if(point.item.id!==selectedId && point.y<260 && point.x+labelWidth/2>width-64)continue;
    if(point.item.id!==selectedId && occupied.some(p=>Math.abs(p.x-point.x)<labelWidth/2+28&&Math.abs(p.y-point.y)<48))continue;
    if(labels.some(p=>Math.abs(p.x-point.x)<(p.width+labelWidth)/2+10&&Math.abs(p.y-point.y)<42))continue;
    labels.push({...point.item,x:point.x,y:point.y,width:labelWidth});
  }
  return labels;
}
