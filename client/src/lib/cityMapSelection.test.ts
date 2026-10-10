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

it("keeps exactly the previous sampled marker identities with a large, mixed catalog and duplicate IDs", () => {
  const publicPoints = Array.from({ length: 110 }, (_, i) => ({
    id: "public-" + i, name: "Public " + i, lat: -15.75 + i / 100000, lng: -48.25,
  }));
  const companies = Array.from({ length: 21486 }, (_, i) => ({
    id: "business-" + i, name: "Company " + i, lat: -15.7, lng: -48.2,
  }));
  const replacement = { ...companies[100], name: "Updated company" };
  const groups = [publicPoints, companies, [replacement]];
  // Original behavior: dedupe by ID, keep the last record without moving its
  // insertion position; reserve up to 80 non-commercial landmarks and evenly
  // sample the remaining commercial markers.
  const unique = new Map<string, (typeof publicPoints)[number]>();
  for (const group of groups) for (const item of group) {
    const key = item.id.startsWith("business-") ? item.id : item.name.toLocaleLowerCase("pt-BR") + "|" + item.lat + "|" + item.lng;
    unique.set(key, item);
  }
  const all = [...unique.values()];
  const business = all.filter(item => item.id.startsWith("business-"));
  const landmarks = all.filter(item => !item.id.startsWith("business-")).slice(0, 80);
  const slots = Math.min(200 - landmarks.length, business.length);
  const previous = [
    ...landmarks,
    ...Array.from({ length: slots }, (_, i) => business[Math.floor(i * business.length / slots)]),
  ];
  const result = selectCityMapItems(groups);
  expect(result.total).toBe(110 + 21486);
  expect(result.items.map(item => item.id)).toEqual(previous.map(item => item.id));
  expect(result.items).toHaveLength(200);
  expect(result.items.some(item => item.id === "public-100")).toBe(false);
});
