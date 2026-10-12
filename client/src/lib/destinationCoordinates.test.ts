import { expect, it } from "vitest";
import { createDestinationPointResolver } from "./destinationCoordinates";
import { BUNDLED_CITY_ATLAS } from "./cityAtlas";

it("resolves only public catalog points, leaves unknown destinations unresolved and uses a fresh snapshot", () => {
  const resolve = createDestinationPointResolver(BUNDLED_CITY_ATLAS);
  expect(resolve("UPA Mansões Odisseia, Águas Lindas de Goiás, GO")).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
  expect(resolve("zzzx-destino-sem-posicao")).toBeNull();
  const snapshot = { ...BUNDLED_CITY_ATLAS!, items: [{ id: "fixture", name: "Referência teste", detail: "teste", category: "referencia" as const, sourceId: "osm-planilha-20261002", destination: "Referência teste", lat: -15.75, lng: -48.28 }] };
  expect(createDestinationPointResolver(snapshot)("Referência teste")).toEqual({ lat: -15.75, lng: -48.28 });
  for (const point of [{ lat: 0, lng: 0 }, { lat: 100, lng: -48 }, { lat: NaN, lng: -48 }]) {
    const invalid = { ...snapshot, items: [{ ...snapshot.items[0], ...point }] };
    expect(createDestinationPointResolver(invalid)("Referência teste")).toBeNull();
  }
});
