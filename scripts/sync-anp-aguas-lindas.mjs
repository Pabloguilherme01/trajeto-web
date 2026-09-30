import { mkdir, readFile, writeFile } from "node:fs/promises";

const API_URL = "https://revendedoresapi.anp.gov.br/v1/combustivel";
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

const rows = [];
for (let page = 1; page <= MAX_PAGES; page += 1) {
  const payload = await fetchPage(page);
  const pageRows = extractRows(payload);
  rows.push(...pageRows);
  if (pageRows.length < PAGE_SIZE) break;
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
  console.warn("ANP retornou zero registros e não existe snapshot anterior utilizável. O site seguirá com a base local/cache.");
}

const snapshot = {
  source: API_URL,
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
