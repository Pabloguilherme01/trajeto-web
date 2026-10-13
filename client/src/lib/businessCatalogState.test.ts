import { expect, it } from "vitest";
import { hasBusinessName, readableBusinessName } from "./businessCatalogState";

it("rejects registry-only identities and unnamed placeholders", () => {
  for (const name of ["CNPJ: 12345678000190", "CNPJ 12 345 678 0001 90", "Empresa sem nome", "Nome não cadastrado", "Sem identificação", "S/N"]) {
    expect(hasBusinessName(name), name).toBe(false);
  }
});

it("puts the readable name first for alternate CNPJ prefixes", () => {
  expect(readableBusinessName("CNPJ: 12345678000190 · Mercado Aurora")).toBe("Mercado Aurora");
  expect(readableBusinessName("CNPJ 12 345 678 0001 90 - Farmácia Aurora")).toBe("Farmácia Aurora");
  expect(readableBusinessName("Loja 123")).toBe("Loja 123");
});
