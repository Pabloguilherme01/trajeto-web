import { readFile, writeFile, mkdir } from "node:fs/promises";
import * as XLSX from "xlsx";

const PAGE_URL = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";
const OUTPUT = new URL("../client/public/data/aguas-lindas-anp-precos.json", import.meta.url);

const norm = value => String(value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();


function normalizeProduct(value) {
  const key = norm(value);
  if (key.includes("gasolina comum") || key === "gasolina") return "gasolina-comum";
  if (key.includes("gasolina aditivada")) return "gasolina-aditivada";
  if (key.includes("etanol")) return "etanol";
  if (key.includes("diesel s10")) return "diesel-s10";
  if (key.includes("diesel s500")) return "diesel-s500";
  if (key.includes("glp") || key.includes("13 kg") || key.includes("p13")) return "glp-p13";
  if (key.includes("gnv") || key.includes("gas natural")) return "gnv";
  return "outro";
}
function unitFor(productKey) {
  if (productKey === "glp-p13") return "13kg";
  if (productKey === "gnv") return "m3";
  return "L";
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim().replace(/R\$\s*/gi, "").replace(/\./g, "").replace(",", ".");
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function pick(row, aliases) {
  const keys = Object.keys(row);
  const wanted = aliases.map(norm);
  const key = keys.find(candidate => {
    const normalized = norm(candidate);
    return wanted.some(alias => normalized === alias || normalized.includes(alias));
  });
  return key ? row[key] : null;
}

function extractPeriod(html) {
  const match = String(html).match(/(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/);
  return match ? match[1] + " a " + match[2] : "última semana publicada";
}

function latestSpreadsheetUrl(html) {
  const hrefs = [...String(html).matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1].replace(/&amp;/g, "&"));
  const candidates = hrefs.filter(href => /\.(xlsx?|xlsm)(?:[/?#]|$)/i.test(href) && /posto|revendedor|preco/i.test(href));
  if (!candidates.length) throw new Error("Planilha semanal da ANP não localizada na página.");
  return new URL(candidates[0], PAGE_URL).href;
}

function dateToIso(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  const br = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  return br ? br[3] + "-" + br[2] + "-" + br[1] : text || null;
}

const pageResponse = await fetch(PAGE_URL, { headers: { "user-agent": "Trajeto-ANP-Price-Sync/1.0", accept: "text/html" } });
if (!pageResponse.ok) throw new Error("ANP preços HTTP " + pageResponse.status);
const html = await pageResponse.text();
const referencePeriod = extractPeriod(html);
const sourceUrl = latestSpreadsheetUrl(html);

const workbookResponse = await fetch(sourceUrl, { headers: { "user-agent": "Trajeto-ANP-Price-Sync/1.0", accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" } });
if (!workbookResponse.ok) throw new Error("Planilha ANP HTTP " + workbookResponse.status);
const workbook = XLSX.read(new Uint8Array(await workbookResponse.arrayBuffer()), { type: "array", cellDates: true });

const output = [];
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  for (const row of rows) {
    const cnpj = String(pick(row, ["cnpj"]) ?? "").replace(/\D/g, "");
    const uf = String(pick(row, ["uf", "estado"]) ?? "").trim().toUpperCase();
    const municipality = String(pick(row, ["municipio", "município", "municipio do posto"]) ?? "").trim();
    const municipalityNorm = norm(municipality);
    if (cnpj.length !== 14 || (uf && uf !== "GO") || (municipalityNorm && !municipalityNorm.includes("aguas lindas de goias"))) continue;

    const product = String(pick(row, ["produto", "combustivel", "combustível"]) ?? "").trim();
    const price = parseNumber(pick(row, ["preco de revenda", "preco revenda", "preço de revenda", "valor de venda", "preco"]) );
    if (!product || price == null) continue;

    const productKey = normalizeProduct(product);
    const collectionDate = dateToIso(pick(row, ["data da coleta", "data coleta", "data coleta preço"]));
    output.push({
      cnpj,
      razaoSocial: String(pick(row, ["razao social", "razão social"]) ?? "").trim() || null,
      endereco: String(pick(row, ["endereco", "endereço", "logradouro"]) ?? "").trim() || null,
      bairro: String(pick(row, ["bairro"]) ?? "").trim() || null,
      municipio: municipality || null,
      uf: uf || null,
      produto: product,
      productKey,
      salePrice: price,
      unit: unitFor(productKey),
      collectionDate,
      referencePeriod,
      source: "ANP",
    });
  }
}

const deduped = new Map();
for (const record of output) {
  const key = [record.cnpj, record.productKey, record.collectionDate ?? referencePeriod].join("|");
  if (!deduped.has(key)) deduped.set(key, record);
}
const data = [...deduped.values()];

if (!data.length) {
  await mkdir(new URL("../client/public/data/", import.meta.url), { recursive: true });
  const retrievedAt = new Date().toISOString();
  const emptySnapshot = {
    source: "ANP",
    sourceUrl,
    retrievedAt,
    referencePeriod,
    totalRows: 0,
    totalStations: 0,
    data: [],
    warning: "A fonte semanal foi acessada, mas nenhum registro municipal foi reconhecido. Não exibir preço como atual."
  };

  try {
    const previous = JSON.parse(await readFile(OUTPUT, "utf8"));
    const sameEmptySnapshot =
      previous?.source === "ANP" &&
      previous?.sourceUrl === sourceUrl &&
      previous?.referencePeriod === referencePeriod &&
      previous?.totalRows === 0 &&
      previous?.totalStations === 0 &&
      Array.isArray(previous?.data) &&
      previous.data.length === 0;

    if (sameEmptySnapshot) {
      console.warn(JSON.stringify({
        warning: "Nenhum preço individual ANP reconhecido; snapshot vazio já está atualizado.",
        referencePeriod
      }));
      process.exit(0);
    }
  } catch {}

  await writeFile(OUTPUT, JSON.stringify(emptySnapshot, null, 2) + "\n", "utf8");
  console.warn(JSON.stringify({
    warning: "Nenhum preço individual ANP reconhecido; snapshot vazio materializado para impedir preço antigo como atual.",
    referencePeriod
  }));
  process.exit(0);
}

const snapshot = {
  source: "ANP",
  sourceUrl,
  retrievedAt: new Date().toISOString(),
  referencePeriod,
  totalRows: data.length,
  totalStations: new Set(data.map(item => item.cnpj)).size,
  data,
};

await mkdir(new URL("../client/public/data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ referencePeriod, totalRows: data.length, totalStations: snapshot.totalStations, sourceUrl }));
