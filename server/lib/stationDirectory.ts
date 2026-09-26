import type { PlaceDetailsResult, PlacesSearchResult } from "../_core/map";

export type PublicStation = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  isOpen: boolean | null;
  openingHours: string[];
  source: "google_maps";
};

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.pathname === "/" && !url.search && !url.hash) url.pathname = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function publicStationInfo(search: PlacesSearchResult["results"][number], details?: PlaceDetailsResult): PublicStation {
  const source = details?.result;
  return {
    placeId: search.place_id,
    name: source?.name || search.name,
    address: source?.formatted_address || search.formatted_address,
    lat: source?.geometry.location.lat || search.geometry.location.lat,
    lng: source?.geometry.location.lng || search.geometry.location.lng,
    phone: source?.formatted_phone_number ?? null,
    website: safeExternalUrl(source?.website),
    isOpen: source?.opening_hours?.open_now ?? search.opening_hours?.open_now ?? null,
    openingHours: source?.opening_hours?.weekday_text ?? [],
    source: "google_maps",
  };
}

export function publicStationDetails(placeId: string, details: PlaceDetailsResult): PublicStation {
  const source = details.result;
  return {
    placeId,
    name: source.name,
    address: source.formatted_address,
    lat: source.geometry.location.lat,
    lng: source.geometry.location.lng,
    phone: source.formatted_phone_number ?? null,
    website: safeExternalUrl(source.website),
    isOpen: source.opening_hours?.open_now ?? null,
    openingHours: source.opening_hours?.weekday_text ?? [],
    source: "google_maps",
  };
}
