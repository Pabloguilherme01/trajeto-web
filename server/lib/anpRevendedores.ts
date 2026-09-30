import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";

const API_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const MAX_PAGES = 4;
const PAGE_SIZE = 5000;
const cache = new Map<string, { expiresAt: number; value: { retrievedAt: string; totalRawRows: number; totalStations: number; rows: AnpFuelRow[] } }>();

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  for (const key of ["data", "Data", "items", "Items", "result", "Result"]) {
    const value = root[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  return [];
}

async function requestPage(municipio: string, uf: string, page: number) {
  const params = new URLSearchParams({ municipio, uf, ...(page > 1 ? { numeropagina: String(page) } : {}) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(API_URL + "?" + params.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Trajeto/1.0" },
    });
    if (!response.ok) throw new Error("ANP retornou HTTP " + response.status);
    return await response.json() as unknown;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAnpStations(municipio = "AGUASLINDASDEGOIAS", uf = "GO") {
  const cacheKey = municipio + "|" + uf;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const rows: AnpFuelRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await requestPage(municipio, uf, page);
    const rawRows = extractRows(payload);
    for (const raw of rawRows) {
      const normalized = normalizeAnpFuelRow(raw);
      if (normalized) rows.push(normalized);
    }
    if (rawRows.length < PAGE_SIZE) break;
  }

  const value = {
    retrievedAt: new Date().toISOString(),
    totalRawRows: rows.length,
    totalStations: groupAnpFuelRows(rows).length,
    rows,
  };
  cache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, value });
  return value;
}
