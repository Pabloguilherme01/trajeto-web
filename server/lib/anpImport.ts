import * as XLSX from "xlsx";

export const DEFAULT_ANP_SOURCE_URL = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/revendas_lpc_2026-08-09_2026-08-15.xlsx";

type AnpProduct = "gasoline" | "ethanol" | "diesel_s10" | "diesel_s500" | "gnv";

export type AnpPriceRow = {
  placeId: string;
  stationName: string;
  product: AnpProduct;
  price: string;
  municipality: string;
  state: string;
  sourceReference: string;
  collectedAt: Date;
};

const productMap: Record<string, AnpProduct | undefined> = {
  "GASOLINA COMUM": "gasoline",
  "ETANOL": "ethanol",
  "ETANOL HIDRATADO": "ethanol",
  "DIESEL S10": "diesel_s10",
  "DIESEL S500": "diesel_s500",
  "GNV": "gnv",
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseAnpRows(rows: unknown[][], sourceReference: string): AnpPriceRow[] {
  const headerIndex = rows.findIndex(row => text(row[0]).toUpperCase() === "CNPJ" && text(row[11]).toUpperCase() === "PRODUTO");
  if (headerIndex < 0) throw new Error("A planilha não contém o cabeçalho esperado da ANP.");

  const parsed: AnpPriceRow[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const cnpj = text(row[0]).replace(/\D/g, "");
    const product = productMap[text(row[11]).toUpperCase()];
    const price = Number(row[13]);
    const collectedAt = parseDate(row[14]);
    const municipality = text(row[8]);
    const state = text(row[9]).slice(0, 2).toUpperCase();
    const stationName = text(row[2]) || text(row[1]);
    if (!cnpj || !product || !Number.isFinite(price) || price <= 0 || !collectedAt || !municipality || state.length !== 2 || !stationName) continue;
    parsed.push({
      placeId: `anp-cnpj-${cnpj}`,
      stationName,
      product,
      price: price.toFixed(3),
      municipality,
      state,
      sourceReference,
      collectedAt,
    });
  }
  return parsed;
}

export async function downloadAndParseAnp(sourceReference: string) {
  const source = new URL(sourceReference);
  if (source.protocol !== "https:" || source.hostname !== "www.gov.br" || !source.pathname.includes("/arquivos-lpc/") || !source.pathname.endsWith(".xlsx")) {
    throw new Error("Use uma planilha .xlsx oficial da ANP hospedada em www.gov.br/anp/pt-br/assuntos/.../arquivos-lpc/.");
  }
  const response = await fetch(sourceReference, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("Não foi possível baixar a planilha oficial da ANP informada.");
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer", cellDates: true, dense: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("A planilha oficial não contém uma aba de dados.");
  return parseAnpRows(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null }), sourceReference);
}
