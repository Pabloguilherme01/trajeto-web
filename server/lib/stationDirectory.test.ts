import { describe, expect, it } from "vitest";
import { publicStationInfo } from "./stationDirectory";

describe("publicStationInfo", () => {
  it("keeps only establishment information available for public consultation", () => {
    const station = publicStationInfo(
      { place_id: "place-1", name: "Posto Público", formatted_address: "Rua Central", geometry: { location: { lat: -15.8, lng: -47.9 } }, rating: 4.7, user_ratings_total: 99, types: ["gas_station"] },
      { result: { place_id: "place-1", name: "Posto Público", formatted_address: "Rua Central", formatted_phone_number: "+55 61 99999-9999", website: "https://example.com", opening_hours: { open_now: true, weekday_text: ["Segunda: 24 horas"] }, geometry: { location: { lat: -15.8, lng: -47.9 } }, reviews: [{ author_name: "Pessoa", rating: 5, text: "Comentário", time: 1 }] }, status: "OK" },
    );

    expect(station).toEqual({ placeId: "place-1", name: "Posto Público", address: "Rua Central", lat: -15.8, lng: -47.9, phone: "+55 61 99999-9999", website: "https://example.com", isOpen: true, openingHours: ["Segunda: 24 horas"], source: "google_maps" });
    expect(station).not.toHaveProperty("reviews");
    expect(station).not.toHaveProperty("rating");
  });
});
