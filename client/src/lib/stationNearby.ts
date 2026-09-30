export type NearbyStation = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  businessStatus: string | null;
};

export type NearbySearchAdapter = {
  searchNearby: (request: {
    fields: string[];
    includedPrimaryTypes: string[];
    locationRestriction: { center: { lat: number; lng: number }; radius: number };
    maxResultCount: number;
    rankPreference: "DISTANCE";
  }) => Promise<{ places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { lat?: number; lng?: number };
    googleMapsURI?: string;
    businessStatus?: string;
  }> }>;
};

export async function findNearbyStations(
  adapter: NearbySearchAdapter,
  center: { lat: number; lng: number },
  radius = 5000,
): Promise<NearbyStation[]> {
  const response = await adapter.searchNearby({
    fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "businessStatus"],
    includedPrimaryTypes: ["gas_station"],
    locationRestriction: { center, radius: Math.min(Math.max(radius, 250), 50000) },
    maxResultCount: 20,
    rankPreference: "DISTANCE",
  });

  return (response.places ?? []).flatMap((place) => {
    if (!place.id || !place.displayName?.text) return [];
    return [{
      id: place.id,
      name: place.displayName.text,
      address: place.formattedAddress ?? null,
      lat: Number.isFinite(place.location?.lat) ? place.location!.lat! : null,
      lng: Number.isFinite(place.location?.lng) ? place.location!.lng! : null,
      mapsUrl: place.googleMapsURI ?? null,
      businessStatus: place.businessStatus ?? null,
    }];
  });
}
