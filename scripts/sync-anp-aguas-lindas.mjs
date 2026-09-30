import { mkdir, readFile, writeFile } from "node:fs/promises";

const API_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const OFFICIAL_CSV_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv/@@download/file";
const OUTPUT = new URL("../client/public/data/aguas-lindas-anp.json", import.meta.url);
const MAX_PAGES = 4;
const PAGE_SIZE = 5000;

function extractRows(payload) {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["data", "Data", "items", "Items", "result", "Result"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === "object");
  }
  return [];
}

async function fetchPage(page) {
  const params = new URLSearchParams({ municipio: "AGUASLINDASDEGOIAS", uf: "GO", ...(page > 1 ? { numeropagina: String(page) } : {}) });
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

await mkdir(new URL("../client/public/data/", import.meta.url), { recursive: true });
if (rows.length === 0) {
  try {
    const previous = JSON.parse(await readFile(OUTPUT, "utf8"));
    const previousRows = extractRows(previous?.data ?? previous);
    if (previousRows.length > 0) {
      console.warn(JSON.stringify({
        warning: "ANP retornou zero registros; snapshot anterior preservado.",
        previousRawRows: previousRows.length,
        output: OUTPUT.pathname,
      }));
      process.exit(0);
    }
  } catch {
    // Não existe snapshot anterior utilizável; falha para não publicar uma base vazia.
  }
  console.warn("ANP sem dados utilizáveis. O snapshot não será substituído por um arquivo vazio.");
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
