import { z } from "zod";
import { makeRequest, type PlaceDetailsResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { publicStationInfo } from "../lib/stationDirectory";

const searchInput = z.object({ query: z.string().trim().min(3).max(240) });

export const stationsRouter = router({
  search: publicProcedure.input(searchInput).query(async ({ input }) => {
    const search = await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", { query: `posto de combustíveis em ${input.query}`, type: "gas_station" });
    const candidates = search.results.slice(0, 8);
    const details = await Promise.all(candidates.map(async station => {
      try {
        const result = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", { place_id: station.place_id, fields: "name,formatted_address,formatted_phone_number,website,opening_hours,geometry" });
        return publicStationInfo(station, result);
      } catch {
        return publicStationInfo(station);
      }
    }));
    return { query: input.query, stations: details };
  }),
});
