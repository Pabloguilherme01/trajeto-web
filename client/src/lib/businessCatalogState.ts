import type { CityAtlasItem } from "./cityAtlas";
let loaded: CityAtlasItem[] = [];
export function getLoadedBusinessCatalog() { return loaded; }
export function setLoadedBusinessCatalog(items: CityAtlasItem[]) { loaded = items; }

/** Strip a registry prefix for display, preserving the original legal fields. */
export function readableBusinessName(value: string) {
  const name = value.replace(/^\s*(?:CNPJ\s*[:·-]?\s*)?(?:\d{2}\.\d{3}\.\d{3}(?:\/\d{4}-\d{2})?|\d{14})(?:\s+|[:·-]\s*|$)/i, "").trim();
  const normalized = name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  if (!/\p{L}/u.test(name) || /^cnpj[\d\s:./-]*$/.test(normalized) || /^(?:empresa sem nome informado|sem nome(?: informado)?|nome nao informado|nao informado|empresa sem identificacao)$/.test(normalized)) return "";
  return name;
}

export function hasBusinessName(value: string) { return Boolean(readableBusinessName(value)); }

export type BusinessCatalogMode = "all" | "named" | "cnpj" | "unnamed";
export function readBusinessCatalogMode(value: string | null): BusinessCatalogMode {
  return value === "nome" ? "named" : value === "cnpj" ? "cnpj" : value === "sem-nome" ? "unnamed" : "all";
}
