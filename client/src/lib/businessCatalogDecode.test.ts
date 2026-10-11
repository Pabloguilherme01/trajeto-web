import { expect, it } from "vitest";
import { hasBusinessName } from "./businessCatalogState";
import { normalizeBusinessRows } from "./businessCatalog";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";

// Previous converter: an independent full-output regression oracle.
function previous(value: unknown): CityAtlasItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const input = value as { schema?: unknown; strings?: unknown; rows?: unknown };
  if (input.schema !== 1 || !Array.isArray(input.strings) ||
      !input.strings.every(v => typeof v === "string") || !Array.isArray(input.rows)) return [];
  const strings = input.strings as string[];
  const categoryForSector = (sector: string): CityAtlasLayer => {
    if (sector === "Saúde e assistência social") return "saude";
    if (sector === "Educação") return "educacao";
    if (sector === "Alimentação (bares e restaurantes)") return "alimentacao";
    if (sector === "Transporte e logística") return "transporte";
    if (sector.startsWith("Comércio")) return "compras";
    if (sector === "Água, esgoto e resíduos" || sector === "Agropecuária") return "meio-ambiente";
    return "servicos";
  };
  return input.rows.flatMap((encoded: unknown) => {
    if (!Array.isArray(encoded) || encoded.length !== 17) return [];
    const row = encoded.map((v, i) => i === 8 || i === 9 ? v :
      typeof v === "number" && Number.isInteger(v) ? strings[v] : undefined);
    const [cnpj, name, legalName, tradeName, sector, cnae, activity, address,
      lat, lng, precision, opened, statusDate, size, mei, simples, nature] = row;
    if (![cnpj, name, legalName, tradeName, sector, cnae, activity, address, precision,
      opened, statusDate, size, mei, simples, nature].every(v => typeof v === "string") ||
      !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj) || !name.trim()) return [];
    const hasPoint = typeof lat === "number" && Number.isFinite(lat) && lat > -16.1 &&
      lat < -15.3 && typeof lng === "number" && Number.isFinite(lng) && lng > -48.7 && lng < -47.9;
    return [{
      id: "business-" + cnpj.replace(/\D/g, ""),
      name: [tradeName, name, legalName].find(hasBusinessName)?.trim() ?? "Empresa sem nome informado",
      category: categoryForSector(sector), address, destination: address,
      detail: sector + " · " + activity + " · CNPJ " + cnpj + " · Ativa no arquivo importado",
      sourceLabel: "CSV fornecido · coordenadas atribuídas ao CNEFE no arquivo",
      keywords: [cnpj, cnpj.replace(/\D/g, ""), legalName, tradeName, cnae, sector],
      lat: hasPoint ? lat : undefined, lng: hasPoint ? lng : undefined,
      coordinateKind: hasPoint ? "area-reference" as const : undefined,
      coordinateLabel: hasPoint ? "Referência aproximada: " + precision + "; confirme a entrada" : "Sem coordenadas no arquivo",
      business: { cnpj, legalName, tradeName, sector, cnae, opened, statusDate, size, mei, simples, nature },
    }];
  });
}

it("keeps exactly the old records, identities, name fallback, addresses, and coordinate caveats", () => {
  const pool = ["11.222.333/0001-44", "Clínica Saúde", "Clínica LTDA", "",
    "Saúde e assistência social", "1234", "Atendimento", "Rua 1", "Quadra (CNEFE)",
    "2020", "2026", "ME", "Sim", "Não", "Limitada", "Escola São José",
    "Educação", "Comércio varejista", "Mercado Central", "Rua 2", "Z", "12345"];
  const key = (value: string) => pool.indexOf(value);
  const makeRow = (name: string, sector: string, trade: string, lat: unknown, lng: unknown) => [
    key("11.222.333/0001-44"), key(name), key("Clínica LTDA"), key(trade),
    key(sector), key("1234"), key("Atendimento"), key("Rua 1"),
    lat, lng, key("Quadra (CNEFE)"), key("2020"), key("2026"),
    key("ME"), key("Sim"), key("Não"), key("Limitada"),
  ];
  const rows = [
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.782635, -48.294036),
    makeRow("Escola São José", "Educação", "", -15.6, -48.4),
    makeRow("Clínica Saúde", "Comércio varejista", "Mercado Central", -17.0, -48.4),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", Number.NaN, -48.4),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.7, null),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.7, Infinity),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.7, -48.8),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.7, -47.9),
    makeRow("Clínica Saúde", "Saúde e assistência social", "", -16.1, -48.4),
    [...makeRow("Clínica Saúde", "Saúde e assistência social", "", -15.7, -48.2).slice(0, 16)],
    Array(17).fill(9999),
    "not a row",
  ];
  const snapshot = { schema: 1, strings: pool, rows };
  const originalRows = rows.slice();
  const actual = normalizeBusinessRows(snapshot);
  expect(actual).toEqual(previous(snapshot));
  expect(actual).toHaveLength(9);
  expect(actual[0].name).toBe("Clínica Saúde");
  expect(actual[0].lat).toBe(-15.782635);
  expect(actual[2].name).toBe("Mercado Central");
  expect(actual[2].lat).toBeUndefined();
  expect(rows).toEqual(originalRows);
});

it("preserves malformed input rejection and behavior for a larger decoded chunk", () => {
  const base = ["00.111.222/0001-33", "Empresa", "Razão Social", "",
    "Transporte e logística", "10", "Transportes", "Rua 1", "Quadra", "2000", "2026",
    "ME", "Sim", "Não", "Empresário"];
  const rows = Array.from({ length: 2800 }, (_, i) =>
    [0, 1, 2, 3, 4, 5, 6, 7, i % 4 ? -15.75 : "sem ponto", -48.27,
      8, 9, 10, 11, 12, 13, 14]);
  const input = { schema: 1, strings: base, rows };
  expect(normalizeBusinessRows(input)).toEqual(previous(input));
  expect(normalizeBusinessRows({ ...input, schema: 2 })).toEqual([]);
  expect(normalizeBusinessRows({ ...input, strings: [...base, null] })).toEqual([]);
  expect(normalizeBusinessRows({ ...input, rows: [[3.5, ...rows[0].slice(1)]] })).toEqual([]);
});
