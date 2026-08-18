export const DEFAULT_ANP_AUTHORIZED_STATIONS_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv";

export type AuthorizedStationImport = {
  authorization: string;
  legalName: string;
  address: string;
  complement: string;
  neighborhood: string;
  zipCode: string;
  municipality: string;
  state: string;
  brand: string;
  sourceReference: string;
  sourceUpdatedAt: Date;
};

const canonical = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

export type AnpMunicipalityTarget = { municipality: string; state: "DF" | "GO" };

export const CORRIDOR_ANP_MUNICIPALITIES: AnpMunicipalityTarget[] = [
  { municipality: "Águas Lindas de Goiás", state: "GO" },
  { municipality: "Ceilândia", state: "DF" },
  { municipality: "Taguatinga", state: "DF" },
  { municipality: "Brasília", state: "DF" },
  { municipality: "Valparaíso de Goiás", state: "GO" },
  { municipality: "Cidade Ocidental", state: "GO" },
  { municipality: "Luziânia", state: "GO" },
  { municipality: "Formosa", state: "GO" },
  { municipality: "Planaltina", state: "GO" },
  { municipality: "Santo Antônio do Descoberto", state: "GO" },
];

export type AuthorizedStationsDownloadOptions = {
  maxAttempts?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
};

const wait = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

export async function downloadAuthorizedStations(sourceUrl = DEFAULT_ANP_AUTHORIZED_STATIONS_URL, targets = CORRIDOR_ANP_MUNICIPALITIES, options: AuthorizedStationsDownloadOptions = {}) {
  const maxAttempts = Math.min(3, Math.max(1, options.maxAttempts ?? 3));
  const retryDelayMs = Math.max(100, options.retryDelayMs ?? 800);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? wait;
  let response: Response | null = null;
  let lastError: unknown = null;
  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const candidate = await fetchImpl(sourceUrl, { signal: AbortSignal.timeout(60_000) });
      if (candidate.ok) {
        response = candidate;
        break;
      }
      lastError = new Error(`Cadastro ANP indisponível (${candidate.status})`);
      if (![408, 429, 500, 502, 503, 504].includes(candidate.status)) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxAttempts) await sleep(retryDelayMs * attempt);
  }
  if (!response) throw lastError instanceof Error ? lastError : new Error("Cadastro ANP indisponível após tentativas limitadas.");
  const raw = new TextDecoder("windows-1252").decode(await response.arrayBuffer());
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = lines.shift()?.split(";") ?? [];
  const expected = ["AUTORIZACAO", "RAZAOSOCIAL", "ENDERECO", "UF", "MUNICIPIO", "BANDEIRA"];
  if (!expected.every(header => headers.includes(header))) throw new Error("O arquivo cadastral da ANP não possui os campos esperados.");
  const indexOf = (header: string) => headers.indexOf(header);
  const targetKeys = new Set(targets.map(target => `${canonical(target.state)}:${canonical(target.municipality)}`));
  const queriedAt = new Date();
  const stations = lines.map(line => line.split(";")).filter(columns => targetKeys.has(`${canonical(columns[indexOf("UF")] ?? "")}:${canonical(columns[indexOf("MUNICIPIO")] ?? "")}`)).map(columns => ({
    authorization: (columns[indexOf("AUTORIZACAO")] ?? "").trim(),
    legalName: (columns[indexOf("RAZAOSOCIAL")] ?? "").trim(),
    address: (columns[indexOf("ENDERECO")] ?? "").trim(),
    complement: (columns[indexOf("COMPLEMENTO")] ?? "").trim(),
    neighborhood: (columns[indexOf("BAIRRO")] ?? "").trim(),
    zipCode: (columns[indexOf("CEP")] ?? "").trim(),
    municipality: canonical(columns[indexOf("MUNICIPIO")] ?? ""),
    state: canonical(columns[indexOf("UF")] ?? "") as "DF" | "GO",
    brand: (columns[indexOf("BANDEIRA")] ?? "").trim() || "NÃO INFORMADA",
    sourceReference: sourceUrl,
    sourceUpdatedAt: queriedAt,
  })).filter(station => station.authorization && station.legalName && station.address);
  return { stations, queriedAt, attempts };
}
