import { mkdir, readFile, writeFile } from "node:fs/promises";

const API_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const OFFICIAL_CSV_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv/@@download/file";
const OUTPUT = new URL("../client/public/data/aguas-lindas-anp.json", import.meta.url);
const MAX_PAGES = 4;
const PAGE_SIZE = 5000;
const MAX_CNPJ_ENRICHMENT = 80;
const ENRICH_CONCURRENCY = 4;

function flattenApiRow(row) {
  const base = { ...row };
  const products = Array.isArray(row.produtos) ? row.produtos : Array.isArray(row.PRODUTOS) ? row.PRODUTOS : [];
  if (!products.length) return [base];
  return products.map(product => ({
    ...base,
    produto: product.produto ?? product.Produto ?? product.PRODUTO ?? null,
    tancagem: product.tancagem ?? product.Tancagem ?? product.TANCAGEM ?? null,
    unidMedidaTancagem: product.unidMedidaTancagem ?? product.unidMedidaTancagem ?? product.UNIDADEMEDIDATANCAGEM ?? null,
    qtdeBicos: product.qtdeBicos ?? product.QuantidadeBicos ?? product.QUANTIDADEBICOS ?? null,
  }));
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload.flatMap(item => item && typeof item === "object" ? flattenApiRow(item) : []);
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["data", "Data", "items", "Items", "result", "Result"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === "object").flatMap(flattenApiRow);
  }
  return [];
}

async function fetchPage(page) {
  const params = new URLSearchParams({ municipio: "AGUASLINDASDEGOIAS", uf: "GO", tamanhoPagina: String(PAGE_SIZE), ...(page > 1 ? { numeropagina: String(page) } : {}) });
  const response = await fetch(API_URL + "?" + params.toString(), {
    headers: { accept: "application/json", "user-agent": "Trajeto-ANP-Sync/1.0" },
  });
  if (!response.ok) throw new Error("ANP HTTP " + response.status);
  return response.json();
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ";" && !quoted) {
      fields.push(field);
      field = "";
      continue;
    }
    field += char;
  }
  fields.push(field);
  return fields;
}

function parseOfficialCsv(csv) {
  const lines = String(csv).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(value => value.trim().toUpperCase());
  const rows = [];
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const municipio = String(row.MUNICIPIO ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
    const uf = String(row.UF ?? "").trim().toUpperCase();
    if (municipio === "AGUASLINDASDEGOIAS" && uf === "GO") rows.push(row);
  }
  return rows;
}

async function fetchApiByCnpj(cnpj) {
  const params = new URLSearchParams({ cnpj: String(cnpj).replace(/\\D/g, "") });
  const response = await fetch(API_URL + "?" + params.toString(), {
    headers: { accept: "application/json", "user-agent": "Trajeto-ANP-Sync/1.1" },
  });
  if (!response.ok) throw new Error("ANP CNPJ HTTP " + response.status);
  return response.json();
}

async function enrichCsvRowsWithApi(csvRows) {
  const targets = csvRows.slice(0, MAX_CNPJ_ENRICHMENT);
  const enriched = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const currentIndex = cursor++;
      const row = targets[currentIndex];
      const cnpj = row.CNPJ;
      try {
        const payload = await fetchApiByCnpj(cnpj);
        const rows = extractRows(payload);
        if (rows.length) enriched.push(...rows);
      } catch {
        // Mantém a planilha cadastral quando a consulta individual não estiver disponível.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(ENRICH_CONCURRENCY, targets.length) }, worker));
  return enriched;
}

async function fetchOfficialCsvRows() {
  const response = await fetch(OFFICIAL_CSV_URL, {
    headers: { accept: "text/csv,*/*", "user-agent": "Trajeto-ANP-Sync/1.0" },
  });
  if (!response.ok) throw new Error("ANP CSV HTTP " + response.status);
  return parseOfficialCsv(await response.text());
}

let rows = [];
let source = API_URL;
try {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchPage(page);
    const pageRows = extractRows(payload);
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
} catch (error) {
  console.warn(JSON.stringify({ warning: "ANP API indisponível; tentando CSV oficial.", error: String(error) }));
}

if (rows.length === 0) {
  try {
    rows = await fetchOfficialCsvRows();
    source = OFFICIAL_CSV_URL;
    console.log(JSON.stringify({ fallback: "official-csv", filteredRows: rows.length }));
  } catch (error) {
    console.warn(JSON.stringify({ warning: "ANP API e CSV oficial indisponíveis.", error: String(error) }));
  }
}

const officialCsvRows = await fetchOfficialCsvRows().catch(() => []);
if (officialCsvRows.length > 0) {
  const apiEnrichedRows = await enrichCsvRowsWithApi(officialCsvRows);
  if (apiEnrichedRows.length > 0) {
    const csvByCnpj = new Map(officialCsvRows.map(row => [String(row.CNPJ).replace(/\\D/g, ""), row]));
    const mergedRows = [];
    const seenCnpj = new Set();
    for (const apiRow of apiEnrichedRows) {
      const cnpj = String(apiRow.cnpj ?? apiRow.CNPJ ?? "").replace(/\\D/g, "");
      if (!cnpj || !csvByCnpj.has(cnpj)) continue;
      mergedRows.push(apiRow);
      seenCnpj.add(cnpj);
    }
    for (const row of officialCsvRows) {
      const cnpj = String(row.CNPJ ?? "").replace(/\\D/g, "");
      if (!seenCnpj.has(cnpj)) mergedRows.push(row);
    }
    rows = mergedRows;
    source = API_URL + " por CNPJ + CSV oficial";
    console.log(JSON.stringify({ enrichment: "official-api-by-cnpj", apiRows: apiEnrichedRows.length, mergedRows: rows.length, stations: new Set(mergedRows.map(row => String(row.cnpj ?? row.CNPJ ?? "").replace(/\\D/g, "")).filter(Boolean)).size }));
  }
}

await mkdir(new URL("../client/public/data/", import.meta.url), { recursive: true });
let previousSnapshot = null;
try {
  previousSnapshot = JSON.parse(await readFile(OUTPUT, "utf8"));
} catch {
  previousSnapshot = null;
}

if (rows.length === 0) {
  const previousRows = extractRows(previousSnapshot?.data ?? previousSnapshot);
  if (previousRows.length > 0) {
    console.warn(JSON.stringify({
      warning: "ANP retornou zero registros; snapshot anterior preservado.",
      previousRawRows: previousRows.length,
      output: OUTPUT.pathname,
    }));
    process.exit(0);
  }
  console.warn("ANP sem dados utilizáveis. O snapshot não será substituído por um arquivo vazio.");
  process.exit(0);
}

const currentStations = new Set(
  rows
    .map(row => String(row.cnpj ?? row.CNPJ ?? "").replace(/\D/g, ""))
    .filter(Boolean),
).size;
const previousStations = new Set(
  extractRows(previousSnapshot?.data ?? previousSnapshot)
    .map(row => String(row.cnpj ?? row.CNPJ ?? "").replace(/\D/g, ""))
    .filter(Boolean),
).size;

if (previousStations >= 10 && currentStations < previousStations * 0.5) {
  console.warn(JSON.stringify({
    warning: "Queda anormal na cobertura ANP; snapshot anterior preservado.",
    previousStations,
    currentStations,
  }));
  process.exit(0);
}

const snapshot = {
  source,
  municipality: "Águas Lindas de Goiás",
  uf: "GO",
  retrievedAt: new Date().toISOString(),
  totalRawRows: rows.length,
  totalStations: new Set(rows.map(row => String(row.cnpj ?? row.CNPJ ?? "")).filter(Boolean)).size,
  data: rows,
};
await writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  municipality: snapshot.municipality,
  retrievedAt: snapshot.retrievedAt,
  totalRawRows: snapshot.totalRawRows,
  output: OUTPUT.pathname,
}));
