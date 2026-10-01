export function normalizeCatalogText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
}

export function matchesCatalogText(query: string, values: Array<string | undefined>) {
  const text = normalizeCatalogText(values.filter(Boolean).join(" "));
  return normalizeCatalogText(query).split(" ").filter(Boolean).every(term => text.includes(term));
}
