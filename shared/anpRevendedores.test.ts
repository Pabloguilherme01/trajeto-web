import { describe, expect, it } from "vitest";
import { groupAnpFuelRows, normalizeAnpFuelRow } from "./anpRevendedores";

describe("normalização da API ANP", () => {
  it("normaliza campos do JSON da ANP e remove máscara do CNPJ", () => {
    const row = normalizeAnpFuelRow({
      codigoSIMP: "123",
      autorizacao: "PR/GO123",
      razaoSocial: "POSTO TESTE LTDA",
      CNPJ: "12.345.678/0001-90",
      produto: "GASOLINA C",
      tancagem: "10.500,50",
      quantidadeBicos: "8",
      latitude: "-15.70",
      longitude: "-48.20",
      statusSIGAF: "Desinterdição",
    });
    expect(row).toMatchObject({
      codigoSimp: "123",
      autorizacao: "PR/GO123",
      cnpj: "12345678000190",
      produto: "GASOLINA C",
      tancagem: 10500.5,
      quantidadeBicos: 8,
      latitude: -15.7,
      longitude: -48.2,
      statusSigaf: "Desinterdição",
    });
  });

  it("agrupa múltiplas linhas de produto no mesmo CNPJ sem perder tancagem e bicos", () => {
    const rows = [
      { CNPJ: "12345678000190", RAZAOSOCIAL: "POSTO TESTE", PRODUTO: "GASOLINA C", TANCAGEM: "20,00", QUANTIDADEBICOS: 4 },
      { CNPJ: "12345678000190", RAZAOSOCIAL: "POSTO TESTE", PRODUTO: "ETANOL", TANCAGEM: "15,00", QUANTIDADEBICOS: 2 },
    ].map(item => normalizeAnpFuelRow(item)!);
    const [station] = groupAnpFuelRows(rows);
    expect(station.cnpj).toBe("12345678000190");
    expect(station.products).toHaveLength(2);
    expect(station.products.map(item => item.produto)).toEqual(["GASOLINA C", "ETANOL"]);
  });
});
