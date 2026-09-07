import { describe, expect, it } from "vitest";
import { parseAnpRows } from "./anpImport";

describe("parseAnpRows", () => {
  it("imports only supported fuel products from the ANP spreadsheet structure", () => {
    const rows = [
      ["APRESENTAÇÃO"],
      ["CNPJ", "RAZÃO", "FANTASIA", "ENDEREÇO", "NÚMERO", "COMPLEMENTO", "BAIRRO", "CEP", "MUNICÍPIO", "ESTADO", "BANDEIRA", "PRODUTO", "UNIDADE DE MEDIDA", "PREÇO DE REVENDA", "DATA DA COLETA"],
      ["12.345.678/0001-99", "Empresa", "Posto Exemplo", "Rua A", 10, null, "Centro", "70000000", "Brasília", "DF", "Bandeira", "GASOLINA COMUM", "R$ / litro", 6.49, new Date("2026-08-10")],
      ["12.345.678/0001-99", "Empresa", "Posto Exemplo", "Rua A", 10, null, "Centro", "70000000", "Brasília", "DF", "Bandeira", "GLP", "R$ / 13 kg", 100, new Date("2026-08-10")],
    ];
    const parsed = parseAnpRows(rows, "https://www.gov.br/anp/pt-br/assuntos/a.xlsx");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ placeId: "anp-cnpj-12345678000199", product: "gasoline", price: "6.490", municipality: "Brasília", state: "DF" });
  });
});
