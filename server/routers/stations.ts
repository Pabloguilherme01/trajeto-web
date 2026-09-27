import { z } from "zod";
import { makeRequest, type DistanceMatrixResult, type PlaceDetailsResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { createProductEvent, getAuthorizedStationsForQuery, rememberGooglePlaceIds } from "../db";
import { distanceMatrixBatches, mergeStationDistances } from "../lib/stationDistance";
import { publicStationDetails, publicStationInfo, type PublicStation } from "../lib/stationDirectory";
import { cacheStationSearch, getCachedStationSearch } from "../lib/stationSearchCache";
import { resolveStationIdentity, type StationIdentityMatch } from "../lib/stationIdentityResolver";
import { isGooglePageTokenUnavailable, requestGoogleNextPage } from "../lib/googlePlacesPagination";
import { dedupePlaceDetailsRequest } from "../lib/placeDetailsRequest";
import { stationPaginationMetricRegion } from "../lib/stationPaginationMetrics";

export const stationSearchInput = z.object({ query: z.string().trim().min(3).max(240), cursor: z.string().trim().min(1).max(2_048).optional(), lat: z.number().finite().min(-90).max(90).optional(), lng: z.number().finite().min(-180).max(180).optional() });
const detailsInput = z.object({ placeId: z.string().trim().min(1).max(255) });
type StationSearchPage = {
  query: string;
  queriedAt: number;
  stations: Array<PublicStation & { distanceMeters: number | null; distanceLabel: string | null; anpMatch: StationIdentityMatch }>;
  nextCursor: string | null;
  paginationWarning?: string | null;
};

export const stationsRouter = router({
  search: publicProcedure.input(stationSearchInput).query(async ({ input }) => {
    if (!input.cursor) {
      const cached = getCachedStationSearch<StationSearchPage>(input.query);
      if (cached) return cached;
    }
    let sawUnavailableToken = false;
    const search = input.cursor
      ? await requestGoogleNextPage(async () => {
        const page = await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", { pagetoken: input.cursor! });
        sawUnavailableToken ||= isGooglePageTokenUnavailable(page.status);
        return page;
      })
      : await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", input.lat != null && input.lng != null ? { query: input.query, type: "gas_station", location: `${input.lat},${input.lng}`, radius: 25_000 } : { query: `posto de combustíveis em ${input.query}`, type: "gas_station" });
    if (sawUnavailableToken) void createProductEvent({ event: "google_page_token_invalid", region: stationPaginationMetricRegion(input.query) });
    if (search.status === "INVALID_REQUEST" && input.cursor) {
      return {
        query: input.query,
        queriedAt: Date.now(),
        stations: [],
        nextCursor: input.cursor,
        paginationWarning: "O Google Maps ainda não liberou este lote. Os postos já carregados permanecem disponíveis; tente carregar novamente em alguns instantes.",
      } satisfies StationSearchPage;
    }
    if (search.status !== "OK" && search.status !== "ZERO_RESULTS") throw new Error("Não foi possível carregar mais postos agora.");
    const candidates = search.results.slice(0, 20);
    void rememberGooglePlaceIds(candidates.map(station => station.place_id));
    const stations = candidates.map(station => publicStationInfo(station));
    const authorizedStations = await getAuthorizedStationsForQuery(input.query);
    const distanceBatches = distanceMatrixBatches(candidates);
    const matrices = await Promise.all(distanceBatches.map(batch => makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", { origins: input.lat != null && input.lng != null ? `${input.lat},${input.lng}` : input.query, destinations: batch.map(station => `${station.geometry.location.lat},${station.geometry.location.lng}`).join("|"), mode: "driving", units: "metric" }).catch(() => null)));
    const distances = mergeStationDistances(matrices, stations.length);
    const result: StationSearchPage = { query: input.query, queriedAt: Date.now(), stations: stations.map((station, index) => ({ ...station, ...distances[index], anpMatch: resolveStationIdentity(station, authorizedStations) })), nextCursor: search.next_page_token ?? null, paginationWarning: null };
    return input.cursor ? result : cacheStationSearch(input.query, result, Date.now(), input.lat, input.lng);
  }),
  details: publicProcedure.input(detailsInput).query(async ({ input }) => {
    const details = await dedupePlaceDetailsRequest(input.placeId, () => makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", { place_id: input.placeId, fields: "name,formatted_address,formatted_phone_number,website,opening_hours,geometry" }));
    return publicStationDetails(input.placeId, details);
  }),
});
