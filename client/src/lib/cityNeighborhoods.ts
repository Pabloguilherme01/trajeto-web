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
const ROMAN_NUMBERS: Readonly<Record<string, string>> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5",
  vi: "6", vii: "7", viii: "8", ix: "9", x: "10",
};

export function neighborhoodSearchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bjd\b/g, "jardim")
    .replace(/\bpq\b/g, "parque")
    .replace(/\b(?:da|de|do|das|dos)\b/g, " ")
    .replace(/\b0+(\d+)\b/g, "$1")
    .replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, word => ROMAN_NUMBERS[word])
    .trim()
    .replace(/\s+/g, " ");
}

// Name normalization is done once when loading the small static index,
// rather than again for every result on each keystroke.
const SEARCHABLE_NEIGHBORHOODS = CITY_NEIGHBORHOODS.map(item => ({
  item,
  key: neighborhoodSearchKey(item.name),
}));

export function searchCityNeighborhoods(query: string): readonly CityNeighborhood[] {
  const key = neighborhoodSearchKey(query);
  if (!key) return CITY_NEIGHBORHOODS;
  return SEARCHABLE_NEIGHBORHOODS
    .filter(entry => entry.key.includes(key))
    .map(entry => entry.item);
}
type ScreenPoint = { x: number; y: number };
/**
 * Keep every geographically referenced neighborhood discoverable in the current
 * viewport, even when the map hides overlapping text labels. This list is
 * based only on provided reference coordinates, never inferred centroids.
 */
export function neighborhoodsInViewport(
  items: readonly (CityNeighborhood & { lat: number; lng: number })[],
  project: (item: { lat: number; lng: number }) => ScreenPoint,
  width: number,
  height: number,
): Array<CityNeighborhood & { lat: number; lng: number }> {
  if (width <= 0 || height <= 0) return [];
  return items.filter(item => {
    const { x, y } = project(item);
    return Number.isFinite(x) && Number.isFinite(y) &&
      x >= 0 && x <= width && y >= 0 && y <= height;
  });
}

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
