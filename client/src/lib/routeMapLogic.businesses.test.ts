import { expect, it } from "vitest";
import type { CityAtlasItem } from "./cityAtlas";
import { nearbyBusinessReferences } from "./routeMapLogic";

function company(id: string, name: string, lat?: number, lng?: number): CityAtlasItem {
  return { id: "business-" + id, name, category: "compras", detail: "", sourceLabel: "Catálogo local", lat, lng };
}

it("keeps only the six nearest named companies, preserving source order at equal distances", () => {
  const destination = { lat: -15.77, lng: -48.28 };
  const entries = [
    company("far", "Loja Longe", -15.776, -48.28),
    company("near-a", "Loja A", -15.7701, -48.28),
    company("near-b", "Loja B", -15.7701, -48.28),
    ...Array.from({ length: 2500 }, (_, i) =>
      company("distant-" + i, "Loja " + i, -15.74, -48.24)),
    company("near-c", "Loja C", -15.7702, -48.28),
    company("near-d", "Loja D", -15.7703, -48.28),
    company("near-e", "Loja E", -15.7704, -48.28),
    company("near-f", "Loja F", -15.7705, -48.28),
    company("near-g", "Loja G", -15.7706, -48.28),
  ];
  const refs = nearbyBusinessReferences(entries, destination);
  expect(refs.map(item => item.id)).toEqual([
    "business-near-a", "business-near-b", "business-near-c",
    "business-near-d", "business-near-e", "business-near-f",
  ]);
  expect(refs.every(item => item.label === "R")).toBe(true);
  expect(nearbyBusinessReferences(entries, undefined)).toEqual([]);
});

it("does not show CNPJ-only names, invalid points or distant locations in route references", () => {
  const destination = { lat: -15.77, lng: -48.28 };
  const entries = [
    company("unnamed", "CNPJ 12.345.678/0001-90", -15.77, -48.28),
    company("placeholder", "Empresa sem nome informado", -15.77, -48.28),
    company("nan", "Empresa NaN", NaN, -48.28),
    company("inf", "Empresa Infinity", -15.77, Infinity),
    company("out-of-box", "Empresa Distante", -15.77, -48.269),
    company("out-of-radius", "Empresa Fora do Raio", -15.778, -48.28),
    company("valid", "Comércio Identificado", -15.7702, -48.2801),
  ];
  expect(nearbyBusinessReferences(entries, destination).map(item => item.id))
    .toEqual(["business-valid"]);
});
