import cityAtlasData from "../../public/data/aguas-lindas-city-atlas.json";
import { normalizeCatalogText } from "./catalogSearch";

/** Names only, sourced from the municipality's PMGIRS entries. No boundaries are inferred. */
export const DESTINATION_AREAS = cityAtlasData.items
  .filter(item => item.id.startsWith("bairro-") && item.sourceId === "prefeitura-pmgirs")
  .map(item => ({ id: item.id, name: item.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const areasById = new Map(DESTINATION_AREAS.map(area => [area.id, area]));
const normalizedNames = new Map(DESTINATION_AREAS.map(area =>
  [area.id, normalizeCatalogText(area.name).replace(/[^a-z0-9]+/g, " ").trim()]
));

/** Accept only official known names in URLs; never take coordinate or GPS input. */
export function readDestinationArea(value: string | null | undefined): string {
  return value && areasById.has(value) ? value : "";
}

export function destinationAreaLabel(id: string) {
  return areasById.get(id)?.name ?? "";
}

/**
 * Matches a bairro/setor explicitly named in a record's public address/text.
 * A substring of another sector number (Setor 01 / Setor 010) is not a match.
 * This does not imply the record has verified coordinates or lies in a polygon.
 */
export function mentionsDestinationArea(id: string, ...fields: Array<string | null | undefined>) {
  if (!id) return true;
  const name = normalizedNames.get(id);
  if (!name) return false;
  return fields.some(field => {
    if (!field) return false;
    const normalized = normalizeCatalogText(field).replace(/[^a-z0-9]+/g, " ").trim();
    return (" " + normalized + " ").includes(" " + name + " ");
  });
}
