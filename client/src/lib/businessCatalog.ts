import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";

import { setLoadedBusinessCatalog, readableBusinessName } from "./businessCatalogState";
import { loadCatalogChunks } from "./catalogChunks";
import { resolveBusinessPointFromCatalog } from "./businessPointIndex";

const parts = import.meta.glob("../data/businesses/part-*.json", { import: "default" });
export const BUSINESS_CATALOG_TOTAL = 21486;
let catalog: CityAtlasItem[] = [];
let pending: Promise<CityAtlasItem[]> | null = null;

function categoryForSector(sector: string): CityAtlasLayer {
  if (sector === "Saúde e assistência social") return "saude";
  if (sector === "Educação") return "educacao";
  if (sector === "Alimentação (bares e restaurantes)") return "alimentacao";
  if (sector === "Transporte e logística") return "transporte";
  if (sector.startsWith("Comércio")) return "compras";
  if (sector === "Água, esgoto e resíduos" || sector === "Agropecuária") return "meio-ambiente";
  return "servicos";
}

export function normalizeBusinessRows(value: unknown): CityAtlasItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const input = value as { schema?: unknown; strings?: unknown; rows?: unknown };
  if (input.schema !== 1 || !Array.isArray(input.strings) ||
      !input.strings.every(v => typeof v === "string") || !Array.isArray(input.rows)) return [];
  const strings = input.strings as string[];
  const result: CityAtlasItem[] = [];
  // Decode each row directly. Avoid flatMap's per-row arrays, a temporary
  // 17-column decoded array and a second validation array for 21k records.
  for (const encoded of input.rows) {
    if (!Array.isArray(encoded) || encoded.length !== 17) continue;
    const field = (index: number): string | undefined => {
      const key: unknown = encoded[index];
      return typeof key === "number" && Number.isInteger(key) ? strings[key] : undefined;
    };
    const cnpj = field(0), name = field(1), legalName = field(2);
    const tradeName = field(3), sector = field(4), cnae = field(5);
    const activity = field(6), address = field(7);
    const lat: unknown = encoded[8], lng: unknown = encoded[9];
    const precision = field(10), opened = field(11), statusDate = field(12);
    const size = field(13), mei = field(14), simples = field(15), nature = field(16);
    if (typeof cnpj !== "string" || typeof name !== "string" ||
        typeof legalName !== "string" || typeof tradeName !== "string" ||
        typeof sector !== "string" || typeof cnae !== "string" ||
        typeof activity !== "string" || typeof address !== "string" ||
        typeof precision !== "string" || typeof opened !== "string" ||
        typeof statusDate !== "string" || typeof size !== "string" ||
        typeof mei !== "string" || typeof simples !== "string" ||
        typeof nature !== "string" ||
        !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj)) continue;

    const identifiedName = readableBusinessName(tradeName) || readableBusinessName(name) || readableBusinessName(legalName);
    const hasPoint = Boolean(identifiedName) && typeof lat === "number" && Number.isFinite(lat) && lat > -16.1 && lat < -15.3 &&
      typeof lng === "number" && Number.isFinite(lng) && lng > -48.7 && lng < -47.9;
    const displayName = identifiedName || "CNPJ " + cnpj;
    result.push({
      id: "business-" + cnpj.replace(/\D/g, ""), name: displayName,
      category: categoryForSector(sector), address, destination: address,
      detail: sector + " · " + activity + " · CNPJ " + cnpj + " · Ativa no arquivo importado",
      sourceLabel: "CSV fornecido · coordenadas atribuídas ao CNEFE no arquivo",
      keywords: [cnpj, cnpj.replace(/\D/g, ""), legalName, tradeName, cnae, sector],
      lat: hasPoint ? lat : undefined, lng: hasPoint ? lng : undefined,
      coordinateKind: hasPoint ? "area-reference" as const : undefined,
      coordinateLabel: hasPoint ? "Referência aproximada: " + precision + "; confirme a entrada" : "Sem coordenadas no arquivo",
      business: { cnpj, legalName, tradeName, sector, cnae, opened, statusDate, size, mei, simples, nature },
    });
  }
  return result;
}

export function loadBusinessCatalog(): Promise<CityAtlasItem[]> {
  // The user can browse companies by category/map without performing an
  // eager full-text pass over every imported record. cityAtlasSearchText()
  // creates indexes only for records touched by an actual text search.
  if (!pending) pending = loadCatalogChunks(Object.values(parts), normalizeBusinessRows, item => item.id).then(items => {
    catalog = items;
    setLoadedBusinessCatalog(catalog);
    return catalog;
  }).catch(error => { pending = null; throw error; });
  return pending;
}

export { getLoadedBusinessCatalog } from "./businessCatalogState";

/** Exact unique business identity only: a shared street/CEP never identifies an entrance. */
export function resolveBusinessPoint(value: string) {
  return resolveBusinessPointFromCatalog(catalog, value);
}
