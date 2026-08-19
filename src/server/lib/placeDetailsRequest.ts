const inFlightDetails = new Map<string, Promise<unknown>>();

export function dedupePlaceDetailsRequest<T>(placeId: string, load: () => Promise<T>) {
  const existing = inFlightDetails.get(placeId) as Promise<T> | undefined;
  if (existing) return existing;
  const request = load().finally(() => inFlightDetails.delete(placeId));
  inFlightDetails.set(placeId, request);
  return request;
}
