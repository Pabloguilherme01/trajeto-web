export type FavoriteStationInput = {
  placeId: string;
  stationName: string;
  stationAddress: string;
  lat: number;
  lng: number;
};

export function favoriteStationValues(input: FavoriteStationInput) {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("A localização do posto favorito é inválida.");
  }
  return {
    placeId: input.placeId.trim(),
    stationName: input.stationName.trim(),
    stationAddress: input.stationAddress.trim(),
    lat: String(input.lat),
    lng: String(input.lng),
  };
}
