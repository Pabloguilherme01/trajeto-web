import { expect, it } from "vitest";
import { selectCityMapItems } from "./cityMapSelection";

it("samples the full catalog before creating markers and retains public landmarks", () => {
  const landmark = { id: "upa", name: "UPA", lat: -15.77, lng: -48.28 };
  const companies = Array.from({ length: 21486 }, (_, index) => ({ id: "business-" + index, name: "Empresa " + index, lat: -15.77, lng: -48.28 }));
  const result = selectCityMapItems([[landmark], companies]);
  expect(result.total).toBe(21487);
  expect(result.items).toHaveLength(200);
  expect(result.items[0]).toBe(landmark);
  expect(new Set(result.items.map(item => item.id)).size).toBe(200);
  expect(result.items.at(-1)!.id).not.toBe(companies[198].id);
});

it("keeps distinct CNPJs at the same approximate location and rejects invalid coordinates", () => {
  const first = { id: "business-1", name: "Mercado", lat: -15.77, lng: -48.28 };
  const second = { ...first, id: "business-2" };
  const result = selectCityMapItems([[first, second, first, { ...first, id: "missing", lat: NaN }, { ...first, id: "invalid", lng: Infinity }, { ...first, id: "zero", lat: 0, lng: 0 }]]);
  expect(result.items).toEqual([first, second]);
  expect(result.total).toBe(2);
});
