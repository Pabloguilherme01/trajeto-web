// Derive the period from the selected file, never from an unrelated page heading.
export function selectWeeklyPriceSource(html, pageUrl) {
  const candidates = [];
  for (const match of String(html).matchAll(/href=["']([^"']+)["']/gi)) {
    const url = new URL(match[1].replace(/&amp;/g, "&"), pageUrl);
    if (url.protocol !== "https:" || url.hostname !== "www.gov.br") continue;
    const filename = decodeURIComponent(url.pathname).split("/").find(part => /\.(xlsx?|xlsm)$/i.test(part)) ?? "";
    if (!/\.(xlsx?|xlsm)$/i.test(filename) || !/posto|revend/i.test(filename)) continue;
    const dates = filename.match(/(\d{4}-\d{2}-\d{2})[_-](\d{4}-\d{2}-\d{2})/);
    if (!dates) continue;
    const [, start, end] = dates;
    if ([start, end].some(date => !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) || start > end) continue;
    const format = date => date.split("-").reverse().join("/");
    candidates.push({ sourceUrl: url.href, referencePeriod: format(start) + " a " + format(end), end, start });
  }
  candidates.sort((a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start));
  if (!candidates.length) throw new Error("Planilha semanal da ANP com período verificável não localizada na página.");
  const { sourceUrl, referencePeriod } = candidates[0];
  return { sourceUrl, referencePeriod };
}

export function isAguasLindasPriceRow(uf, municipality) {
  const normalized = String(municipality ?? "").trim().toLocaleLowerCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const state = String(uf ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (state === "go" || state === "goias") && normalized === "aguas lindas de goias";
}

export function findWeeklyPriceHeader(rows) {
  const normalize = value => String(value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const index = rows.findIndex(row => {
    const columns = row.map(normalize);
    return ["cnpj", "municipio", "estado", "produto", "preco de revenda"].every(column => columns.includes(column));
  });
  if (index < 0) throw new Error("Cabeçalho da planilha de revendas ANP não reconhecido; snapshot preservado.");
  return index;
}

export function normalizeAnpCnpj(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return "";
    const text = String(value);
    return text.length <= 14 ? text.padStart(14, "0") : "";
  }
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 14 && /[1-9]/.test(digits) ? digits : "";
}
