// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { saveMobileDestination } from "./mobileDestinations";
import { toggleMobileStationFavorite } from "./mobileStationStore";
import {
  mobileStationDestination,
  personalDestination,
  readyRouteDestination,
  routePresetDestination,
} from "./unifiedDestination";
import {
  listUnifiedDestinationFavorites,
  toggleGenericDestinationFavorite,
} from "./unifiedDestinationStore";

describe("unified destination model", () => {
  beforeEach(() => localStorage.clear());

  it("adapts catalog, station, personal and ready-route data to one shape", () => {
    expect(routePresetDestination({
      id: "upa",
      label: "UPA",
      detail: "24h",
      destination: "UPA Águas Lindas",
      category: "saude",
    })).toMatchObject({ id: "place:upa", kind: "place", name: "UPA", address: "UPA Águas Lindas" });

    expect(mobileStationDestination({
      placeId: "p1",
      name: "Posto",
      address: "BR-070",
      lat: -15.7,
      lng: -48.2,
      openingHours: [],
    })).toMatchObject({ id: "station:p1", kind: "station", coordinates: { lat: -15.7, lng: -48.2 } });

    expect(personalDestination({ id: "casa", label: "Casa", value: "Jardim Brasília" }))
      .toMatchObject({ id: "personal:casa", kind: "personal", address: "Jardim Brasília" });

    expect(readyRouteDestination({
      id: "centro-to-upa",
      origin: "Centro",
      destination: "UPA Águas Lindas",
      label: "Centro → UPA",
      detail: "Origem preenchida",
    })).toMatchObject({ id: "route:centro-to-upa", kind: "route", address: "UPA Águas Lindas", routeOrigin: "Centro" });
  });

  it("aggregates old favorites and new favorites without duplicating an address", () => {
    saveMobileDestination("casa", "Rua 10, Águas Lindas de Goiás");
    toggleMobileStationFavorite({
      placeId: "posto-1",
      name: "Posto Um",
      address: "BR-070, Águas Lindas de Goiás",
      lat: -15.7,
      lng: -48.2,
      openingHours: [],
    });
    toggleGenericDestinationFavorite({
      id: "place:duplicado",
      kind: "place",
      name: "Minha casa duplicada",
      address: "Rua 10, Aguas Lindas de Goias",
      source: "catalog",
    });

    const favorites = listUnifiedDestinationFavorites();
    expect(favorites.some(item => item.kind === "personal" && item.name === "Casa")).toBe(true);
    expect(favorites.some(item => item.kind === "station" && item.name === "Posto Um")).toBe(true);
    expect(favorites.filter(item => item.address.toLocaleLowerCase("pt-BR").includes("rua 10"))).toHaveLength(1);
  });
});
