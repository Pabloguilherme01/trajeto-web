import { normalizeCatalogText } from "./catalogSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";
import { prepareCityAtlasSearch } from "./cityAtlas";
import { loadCatalogChunks } from "./catalogChunks";

const parts = import.meta.glob("../data/businesses/part-*.json", { import: "default" });
export const BUSINESS_CATALOG_TOTAL = 21486;
let catalog: CityAtlasItem[] = [];
let pending: Promise<CityAtlasItem[]> | null = null;

function categoryForSector(sector: string): CityAtlasLayer {
  if (sector === "Saúde e assistência social") return "saude";
  if (sector === "Educação") return "educacao";
  if (sector === "Alimentação (bares e restaurantes)" || sector === "Hospedagem") return "alimentacao";
  if (sector === "Transporte e logística") return "transporte";
  if (sector.startsWith("Comércio")) return "compras";
  if (sector === "Água, esgoto e resíduos" || sector === "Agropecuária") return "meio-ambiente";
  return "servicos";
}

export function normalizeBusinessRows(value: unknown): CityAtlasItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const input = value as { schema?: unknown; strings?: unknown; rows?: unknown };
  if (input.schema !== 1 || !Array.isArray(input.strings) || !input.strings.every(v => typeof v === "string") || !Array.isArray(input.rows)) return [];
  const strings = input.strings as string[];
  return input.rows.flatMap((encoded: unknown) => {
    if (!Array.isArray(encoded) || encoded.length !== 17) return [];
    const row = encoded.map((v, i) => i === 8 || i === 9 ? v : typeof v === "number" && Number.isInteger(v) ? strings[v] : undefined);
    if (!Array.isArray(row) || row.length !== 17) return [];
    const [cnpj, name, legalName, tradeName, sector, cnae, activity, address, lat, lng, precision, opened, statusDate, size, mei, simples, nature] = row;
    if (![cnpj, name, legalName, tradeName, sector, cnae, activity, address, precision, opened, statusDate, size, mei, simples, nature].every(v => typeof v === "string") || !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj) || !name.trim()) return [];
    const hasPoint = typeof lat === "number" && Number.isFinite(lat) && lat > -16.1 && lat < -15.3 && typeof lng === "number" && Number.isFinite(lng) && lng > -48.7 && lng < -47.9;
    return [{
      id: "business-" + cnpj.replace(/\D/g, ""), name, category: categoryForSector(sector),
      address, destination: address,
      detail: sector + " · " + activity + " · CNPJ " + cnpj + " · Ativa no arquivo importado",
      sourceLabel: "CSV fornecido · coordenadas atribuídas ao CNEFE no arquivo",
      keywords: [cnpj, cnpj.replace(/\D/g, ""), legalName, tradeName, cnae, sector],
      lat: hasPoint ? lat : undefined, lng: hasPoint ? lng : undefined,
      coordinateKind: hasPoint ? "area-reference" as const : undefined,
      coordinateLabel: hasPoint ? "Referência aproximada: " + precision + "; confirme a entrada" : "Sem coordenadas no arquivo",
      business: { cnpj, legalName, tradeName, sector, cnae, opened, statusDate, size, mei, simples, nature },
    }];
  });
}

export function loadBusinessCatalog(): Promise<CityAtlasItem[]> {
  if (!pending) pending = loadCatalogChunks(Object.values(parts), chunk => {
    const items = normalizeBusinessRows(chunk);
    prepareCityAtlasSearch(items);
    return items;
  }, item => item.id).then(items => {
    catalog = items;
    return catalog;
  }).catch(error => { pending = null; throw error; });
  return pending;
}

/** Exact unique business identity only: a shared street/CEP never identifies an entrance. */
export function resolveBusinessPoint(value: string) {
  const query = normalizeCatalogText(value);
  if (!query) return null;
  const digits = value.replace(/\D/g, "");
  const matches = catalog.filter(item => item.business && (
    (digits.length === 14 && digits === item.business.cnpj.replace(/\D/g, "")) ||
    [item.name, item.business.legalName, item.business.tradeName].some(name => name && normalizeCatalogText(name) === query)
  ));
  if (matches.length !== 1 || typeof matches[0].lat !== "number" || typeof matches[0].lng !== "number") return null;
  return { lat: matches[0].lat, lng: matches[0].lng };
}
