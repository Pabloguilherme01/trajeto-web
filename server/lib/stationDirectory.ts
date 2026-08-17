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
};

export function publicStationInfo(search: PlacesSearchResult["results"][number], details?: PlaceDetailsResult): PublicStation {
  const source = details?.result;
  return {
    placeId: search.place_id,
    name: source?.name || search.name,
    address: source?.formatted_address || search.formatted_address,
    lat: source?.geometry.location.lat || search.geometry.location.lat,
    lng: source?.geometry.location.lng || search.geometry.location.lng,
    phone: source?.formatted_phone_number ?? null,
    website: source?.website ?? null,
    isOpen: source?.opening_hours?.open_now ?? null,
    openingHours: source?.opening_hours?.weekday_text ?? [],
  };
}
