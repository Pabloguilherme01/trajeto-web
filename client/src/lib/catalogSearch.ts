export function normalizeCatalogText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
}

export function matchesCatalogText(query: string, values: Array<string | undefined>) {
  const text = normalizeCatalogText(values.filter(Boolean).join(" ")).replace(/[ºª]/g, "");
  const terms = normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);
  const tokens = new Set(text.split(/[^a-z0-9]+/i).filter(Boolean));

  return terms.every(term => {
    const requireWholeToken = term.length <= 3 || /^\d+$/.test(term);
    return requireWholeToken ? tokens.has(term) : text.includes(term);
  });
}
