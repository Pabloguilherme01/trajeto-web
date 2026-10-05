import { normalizeCatalogText } from "./catalogSearch";
import { LOCAL_GEOCODE_POINTS, resolveLocalGeocodePoint } from "./localGeocoding";
import { PUBLIC_SERVICES } from "./publicServices";

/** Match an explicit destination, never an unrelated service near its coordinates. */
export function routePublicService(destination: string) {
  const query = normalizeCatalogText(destination);
  if (!query) return null;
  const exact = PUBLIC_SERVICES.filter(service =>
    [service.name, service.mapQuery].some(value => value && normalizeCatalogText(value) === query),
  );
  if (exact.length === 1) return exact[0];
  const point = resolveLocalGeocodePoint(destination);
  if (!point) return null;
  const reference = LOCAL_GEOCODE_POINTS.find(item => item.lat === point.lat && item.lng === point.lng);
  return PUBLIC_SERVICES.find(service => service.id === reference?.id) ?? null;
}
