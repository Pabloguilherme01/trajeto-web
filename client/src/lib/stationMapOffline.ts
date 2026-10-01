import { normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { idbGet, idbPut } from "@/lib/offlineDb";
import { searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { appUrl } from "@/lib/appUrl";

export type OfflineStationMapEntry = {
  id: string;
  placeId?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cnpj?: string | null;
  brand?: string | null;
  source?: "ANP" | "Google" | "local";
};

type OfflineAnpSnapshot = {
  retrievedAt: string | null;
  savedAt: string;
  rows: AnpFuelRow[];
};

type OfflineMapSnapshot = {
  savedAt: string;
  stations: OfflineStationMapEntry[];
};

const ANP_KEY = "trajeto-aguas-lindas-anp-offline-v1";
const MAP_KEY = "trajeto-aguas-lindas-map-offline-v1";
const MAX_MAP_STATIONS = 120;
const MAX_ANP_ROWS = 2500;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getOfflineAnpSnapshot(): OfflineAnpSnapshot {
  const value = readJson<unknown>(ANP_KEY, null);
  if (!value || typeof value !== "object") return { retrievedAt: null, savedAt: "", rows: [] };

  const rawRows = Array.isArray((value as { rows?: unknown }).rows) ? (value as { rows: unknown[] }).rows : [];
  const rows = rawRows
    .filter(item => item && typeof item === "object")
    .map(item => normalizeAnpFuelRow(item as Record<string, unknown>))
    .filter((row): row is AnpFuelRow => Boolean(row))
    .slice(0, MAX_ANP_ROWS);

  return {
    retrievedAt: typeof (value as { retrievedAt?: unknown }).retrievedAt === "string" ? (value as { retrievedAt: string }).retrievedAt : null,
    savedAt: typeof (value as { savedAt?: unknown }).savedAt === "string" ? (value as { savedAt: string }).savedAt : "",
    rows,
  };
}

export function cacheOfflineAnpSnapshot(rows: AnpFuelRow[], retrievedAt?: string | null) {
  if (!rows.length) return false;
  const snapshot = {
    retrievedAt: retrievedAt ?? new Date().toISOString(),
    savedAt: new Date().toISOString(),
    rows: rows.slice(0, MAX_ANP_ROWS),
  };
  writeJson(ANP_KEY, snapshot);
  void idbPut("data", ANP_KEY, snapshot);
  return true;
}

export async function hydrateOfflineAnpSnapshot() {
  const snapshot = await idbGet<OfflineAnpSnapshot>("data", ANP_KEY);
  if (snapshot?.rows?.length) {
    writeJson(ANP_KEY, snapshot);
    return snapshot;
  }
  return getOfflineAnpSnapshot();
}

function isOfflineMapEntry(value: unknown): value is OfflineStationMapEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.address === "string" &&
    typeof item.lat === "number" &&
    Number.isFinite(item.lat) &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lng);
}

export function getOfflineMapStations(): OfflineMapSnapshot {
  const value = readJson<unknown>(MAP_KEY, null);
  if (!value || typeof value !== "object") return { savedAt: "", stations: [] };
  const raw = Array.isArray((value as { stations?: unknown }).stations) ? (value as { stations: unknown[] }).stations : [];
  return {
    savedAt: typeof (value as { savedAt?: unknown }).savedAt === "string" ? (value as { savedAt: string }).savedAt : "",
    stations: raw.filter(isOfflineMapEntry).filter(station => station.source !== "Google").slice(0, MAX_MAP_STATIONS),
  };
}

export function cacheOfflineMapStations(stations: OfflineStationMapEntry[]) {
  if (!stations.length) return false;

  const current = getOfflineMapStations().stations;
  const merged = [...stations.filter(station => station.source !== "Google"), ...current.filter(station => station.source !== "Google")];
  const seen = new Set<string>();
  const deduped = merged.filter(station => {
    const key = station.cnpj
      ? "cnpj:" + station.cnpj
      : "place:" + (station.placeId || station.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_MAP_STATIONS);

  const snapshot = { savedAt: new Date().toISOString(), stations: deduped };
  writeJson(MAP_KEY, snapshot);
  void idbPut("map", MAP_KEY, snapshot);
  return true;
}

export async function hydrateOfflineMapStations() {
  const snapshot = await idbGet<OfflineMapSnapshot>("map", MAP_KEY);
  if (snapshot?.stations?.length) {
    writeJson(MAP_KEY, snapshot);
    return snapshot;
  }
  return getOfflineMapStations();
}

export function prepareOfflineStationMapFromCatalog() {
  const localByCnpj = new Map(
    searchAguasLindasStations("postos").map(station => [station.cnpj, station])
  );
  const seen = new Set<string>();
  const stations = getOfflineAnpSnapshot().rows
    .filter(row => {
      if (
        !Number.isFinite(row.latitude) ||
        !Number.isFinite(row.longitude) ||
        seen.has(row.cnpj)
      )
        return false;
      seen.add(row.cnpj);
      return true;
    })
    .map(row => {
      const local = localByCnpj.get(row.cnpj);
      return {
        id: "anp-offline-" + row.cnpj,
        name: local?.displayName || row.razaoSocial || "Posto",
        address:
          local?.address ||
          [row.endereco, row.bairro, row.municipio, row.uf]
            .filter(Boolean)
            .join(", ") ||
          "Águas Lindas de Goiás, GO",
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        cnpj: row.cnpj,
        brand: local?.brand || row.distribuidora,
        source: "ANP" as const,
      };
    });
  return cacheOfflineMapStations(stations);
}

export async function prepareOfflineStationData() {
  let snapshot = getOfflineAnpSnapshot();

  if (!snapshot.rows.length && typeof fetch === "function") {
    try {
      const response = await fetch(appUrl("/data/aguas-lindas-anp.json"), {
        cache: "default",
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: unknown[];
          retrievedAt?: string;
        };
        const rows = (payload.data ?? [])
          .map(item =>
            item && typeof item === "object"
              ? normalizeAnpFuelRow(item as Record<string, unknown>)
              : null
          )
          .filter((row): row is AnpFuelRow => Boolean(row));
        if (rows.length) {
          cacheOfflineAnpSnapshot(
            rows,
            typeof payload.retrievedAt === "string"
              ? payload.retrievedAt
              : undefined
          );
          snapshot = getOfflineAnpSnapshot();
        }
      }
    } catch {
      // The existing local snapshot remains the fallback.
    }
  }

  const mapPrepared = prepareOfflineStationMapFromCatalog();
  return {
    anpRows: snapshot.rows.length,
    mapStations: getOfflineMapStations().stations.length,
    mapPrepared,
  };
}

export function getOfflineMapAgeLabel(savedAt: string) {
  if (!savedAt) return "sem cache local";
  const timestamp = Date.parse(savedAt);
  if (!Number.isFinite(timestamp)) return "cache local com data desconhecida";
  const ageDays = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (ageDays <= 0) return "salvo hoje neste aparelho";
  if (ageDays === 1) return "salvo ontem neste aparelho";
  return "salvo há " + ageDays + " dias neste aparelho";
}
