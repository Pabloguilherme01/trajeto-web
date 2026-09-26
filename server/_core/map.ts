/**
 * Google Maps API integration.
 *
 * The server injects the provider credential and keeps it out of the browser.
 */

import { ENV } from "./env";
import { recordProviderMetric } from "../db";

type MapsConfig = {
  baseUrl: string;
  apiKey: string;
};

const MAPS_REQUEST_TIMEOUT_MS = 15_000;

function getMapsConfig(): MapsConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("Google Maps service is not configured");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

export type LatLng = { lat: number; lng: number };

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: LatLng;
      end_location: LatLng;
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        travel_mode: string;
        start_location: LatLng;
        end_location: LatLng;
      }>;
    }>;
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }>;
  status: string;
};

export type DistanceMatrixResult = {
  rows: Array<{ elements: Array<{ distance: { text: string; value: number }; duration: { text: string; value: number }; status: string }> }>;
  origin_addresses: string[];
  destination_addresses: string[];
  status: string;
};

export type GeocodingResult = {
  results: Array<{
    address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
    formatted_address: string;
    geometry: { location: LatLng; location_type: string; viewport: { northeast: LatLng; southwest: LatLng } };
    place_id: string;
    types: string[];
  }>;
  status: string;
};

export type PlacesSearchResult = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: { location: LatLng };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    opening_hours?: { open_now?: boolean };
    types: string[];
  }>;
  next_page_token?: string;
  status: string;
};

export type PlaceDetailsResult = {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{ author_name: string; rating: number; text: string; time: number }>;
    opening_hours?: { open_now: boolean; weekday_text: string[] };
    geometry: { location: LatLng };
  };
  status: string;
};


export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  const startedAt = Date.now();
  const operation = endpoint.replace(/^\/maps\/api\//, "").replace(/\/json$/, "").slice(0, 80);
  let metricRecorded = false;
  const { baseUrl, apiKey } = getMapsConfig();
  const url = new URL(`${baseUrl}/v1/maps/proxy${endpoint}`);

  url.searchParams.append("key", apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(MAPS_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      metricRecorded = true;
      void recordProviderMetric({ provider: "google_maps", operation, durationMs: Date.now() - startedAt, success: false, statusCode: response.status });
      throw new Error(`Google Maps API request failed (${response.status})`);
    }

    const payload = await response.json() as T;
    metricRecorded = true;
    void recordProviderMetric({ provider: "google_maps", operation, durationMs: Date.now() - startedAt, success: true, statusCode: response.status });
    return payload;
  } catch (error) {
    if (!metricRecorded) void recordProviderMetric({ provider: "google_maps", operation, durationMs: Date.now() - startedAt, success: false });
    throw error;
  }
}
