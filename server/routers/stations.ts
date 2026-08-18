import { z } from "zod";
import { makeRequest, type DistanceMatrixResult, type PlaceDetailsResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { getAuthorizedStationsForQuery, rememberGooglePlaceIds } from "../db";
import { distanceMatrixBatches, mergeStationDistances } from "../lib/stationDistance";
import { publicStationDetails, publicStationInfo, type PublicStation } from "../lib/stationDirectory";
import { cacheStationSearch, getCachedStationSearch } from "../lib/stationSearchCache";
import { resolveStationIdentity, type StationIdentityMatch } from "../lib/stationIdentityResolver";
import { requestGoogleNextPage } from "../lib/googlePlacesPagination";
import { dedupePlaceDetailsRequest } from "../lib/placeDetailsRequest";

export const stationSearchInput = z.object({ query: z.string().trim().min(3).max(240), cursor: z.string().trim().min(1).max(2_048).optional() });
const authorizedInput = z.object({ query: z.string().trim().min(3).max(240), neighborhood: z.string().trim().min(1).max(160).optional(), brand: z.string().trim().min(1).max(120).optional() });
const detailsInput = z.object({ placeId: z.string().trim().min(1).max(255) });
type StationSearchPage = {
  query: string;
  queriedAt: number;
  stations: Array<PublicStation & { distanceMeters: number | null; distanceLabel: string | null; anpMatch: StationIdentityMatch }>;
  nextCursor: string | null;
};

export const stationsRouter = router({
  search: publicProcedure.input(stationSearchInput).query(async ({ input }) => {
    if (!input.cursor) {
      const cached = getCachedStationSearch<StationSearchPage>(input.query);
      if (cached) return cached;
    }
    const search = input.cursor
      ? await requestGoogleNextPage(() => makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", { pagetoken: input.cursor }))
      : await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", { query: `posto de combustíveis em ${input.query}`, type: "gas_station" });
    if (search.status !== "OK" && search.status !== "ZERO_RESULTS") throw new Error(`Google Maps não liberou o próximo lote (${search.status}).`);
    const candidates = search.results.slice(0, 20);
    void rememberGooglePlaceIds(candidates.map(station => station.place_id));
    const stations = candidates.map(station => publicStationInfo(station));
    const authorizedStations = await getAuthorizedStationsForQuery(input.query);
    const distanceBatches = distanceMatrixBatches(candidates);
    const matrices = await Promise.all(distanceBatches.map(batch => makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", { origins: input.query, destinations: batch.map(station => `${station.geometry.location.lat},${station.geometry.location.lng}`).join("|"), mode: "driving", units: "metric" }).catch(() => null)));
    const distances = mergeStationDistances(matrices, stations.length);
    const result: StationSearchPage = { query: input.query, queriedAt: Date.now(), stations: stations.map((station, index) => ({ ...station, ...distances[index], anpMatch: resolveStationIdentity(station, authorizedStations) })), nextCursor: search.next_page_token ?? null };
    return input.cursor ? result : cacheStationSearch(input.query, result);
  }),
  details: publicProcedure.input(detailsInput).query(async ({ input }) => {
    const details = await dedupePlaceDetailsRequest(input.placeId, () => makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", { place_id: input.placeId, fields: "name,formatted_address,formatted_phone_number,website,opening_hours,geometry" }));
    return publicStationDetails(input.placeId, details);
  }),
  authorizedSearch: publicProcedure.input(authorizedInput).query(async ({ input }) => {
    const all = await getAuthorizedStationsForQuery(input.query);
    const stations = await getAuthorizedStationsForQuery(input.query, { neighborhood: input.neighborhood, brand: input.brand });
    return {
      stations,
      total: all.length,
      neighborhoods: Array.from(new Set(all.map(station => station.neighborhood).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
      brands: Array.from(new Set(all.map(station => station.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }),
});
