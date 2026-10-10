import { expect, it } from "vitest";
import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { cachedGroupAnpFuelRows } from "./anpGroupCache";

function fixture(cnpj: string, name: string, fuel: string) {
  const row = normalizeAnpFuelRow({
    cnpj, razaoSocial: name, produto: fuel, bairro: "Centro",
    latitude: "-15,75", longitude: "-48,28",
  });
  if (!row) throw new Error("Invalid ANP test fixture");
  return row;
}

it("reuses one grouped result when map layers revisit an unchanged ANP snapshot", () => {
  const rows: AnpFuelRow[] = [
    fixture("12345678000199", "Posto Central", "Gasolina"),
    fixture("12345678000199", "Posto Central", "Etanol"),
    fixture("98765432000111", "Posto Norte", "Diesel"),
  ];
  const expected = groupAnpFuelRows(rows);
  const first = cachedGroupAnpFuelRows(rows);
  expect(first).toEqual(expected);
  expect(first).toHaveLength(2);
  expect(first.find(row => row.cnpj === "12345678000199")?.products).toHaveLength(2);
  expect(cachedGroupAnpFuelRows(rows)).toBe(first);
  expect(rows).toHaveLength(3);
});

it("rebuilds after a new snapshot without retaining stale stations or products", () => {
  const oldRows = [fixture("12345678000199", "Posto Antigo", "Gasolina")];
  const oldGrouped = cachedGroupAnpFuelRows(oldRows);
  const updatedRows = [fixture("12345678000199", "Posto Atualizado", "Etanol")];
  const updated = cachedGroupAnpFuelRows(updatedRows);
  expect(updated).not.toBe(oldGrouped);
  expect(updated[0].razaoSocial).toBe("Posto Atualizado");
  expect(updated[0].products[0].produto).toBe("Etanol");
  expect(cachedGroupAnpFuelRows(oldRows)).toBe(oldGrouped);
});

it("supports empty snapshots and keeps each array identity independent", () => {
  const empty: AnpFuelRow[] = [];
  const first = cachedGroupAnpFuelRows(empty);
  expect(first).toEqual([]);
  expect(cachedGroupAnpFuelRows(empty)).toBe(first);
  expect(cachedGroupAnpFuelRows([])).not.toBe(first);
});
