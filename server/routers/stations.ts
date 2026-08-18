import { z } from "zod";
import { makeRequest, type DistanceMatrixResult, type PlaceDetailsResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { getAuthorizedStationsForQuery } from "../db";
import { distanceMatrixBatches, mergeStationDistances } from "../lib/stationDistance";
import { publicStationInfo } from "../lib/stationDirectory";

export const stationSearchInput = z.object({ query: z.string().trim().min(3).max(240), cursor: z.string().trim().min(1).max(2_048).optional() });
const authorizedInput = z.object({ query: z.string().trim().min(3).max(240), neighborhood: z.string().trim().min(1).max(160).optional(), brand: z.string().trim().min(1).max(120).optional() });

export const stationsRouter = router({
  search: publicProcedure.input(stationSearchInput).query(async ({ input }) => {
    let search: PlacesSearchResult | undefined;
    const attempts = input.cursor ? 4 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (input.cursor) {
        // O token de continuação do Text Search pode levar alguns segundos para ficar ativo.
        await new Promise(resolve => setTimeout(resolve, 1800));
      }
      const response = await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", input.cursor ? { pagetoken: input.cursor, query: `posto de combustíveis em ${input.query}`, type: "gas_station" } : { query: `posto de combustíveis em ${input.query}`, type: "gas_station" });
      if (response.status === "OK" || response.status === "ZERO_RESULTS") {
        search = response;
        break;
      }
      if (!input.cursor || response.status !== "INVALID_REQUEST" || attempt === attempts - 1) {
        throw new Error(`Google Maps não liberou o próximo lote (${response.status}).`);
      }
    }
    if (!search) throw new Error("Não foi possível carregar o próximo lote de postos.");
    const candidates = search.results.slice(0, 20);
    const distanceBatches = distanceMatrixBatches(candidates);
    const [details, matrices] = await Promise.all([Promise.all(candidates.map(async station => {
      try {
        const result = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", { place_id: station.place_id, fields: "name,formatted_address,formatted_phone_number,website,opening_hours,geometry" });
        return publicStationInfo(station, result);
      } catch {
        return publicStationInfo(station);
      }
    })), Promise.all(distanceBatches.map(batch => makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", { origins: input.query, destinations: batch.map(station => `${station.geometry.location.lat},${station.geometry.location.lng}`).join("|"), mode: "driving", units: "metric" }).catch(() => null)))]);
    const distances = mergeStationDistances(matrices, details.length);
    return { query: input.query, queriedAt: Date.now(), stations: details.map((station, index) => ({ ...station, ...distances[index] })), nextCursor: search.next_page_token ?? null };
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
