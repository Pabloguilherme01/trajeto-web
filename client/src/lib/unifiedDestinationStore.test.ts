// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { listUnifiedDestinationFavorites, toggleGenericDestinationFavorite } from "./unifiedDestinationStore";
import { toggleMobileStationFavorite } from "./mobileStationStore";
import { mobileStationDestination } from "./unifiedDestination";
const station = { placeId: "station-a", name: "Posto A", address: "BR-070, Águas Lindas", lat: -15.76, lng: -48.28, openingHours: [] };
beforeEach(() => localStorage.clear());
it("keeps different station identities even when their address is identical", () => {
  toggleMobileStationFavorite(station);
  toggleMobileStationFavorite({ ...station, placeId: "station-b", name: "Posto B", lng: -48.29 });
  const items = listUnifiedDestinationFavorites();
  expect(items.map(item => item.name)).toEqual(["Posto B", "Posto A"]);
});
it("still collapses the same station saved through two surfaces", () => {
  toggleMobileStationFavorite(station);
  toggleGenericDestinationFavorite(mobileStationDestination(station));
  expect(listUnifiedDestinationFavorites()).toHaveLength(1);
});
it("preserves businesses with distinct CNPJs at the same address", () => {
  for (const id of ["business-42115689000140", "business-29979036172278"]) {
    toggleGenericDestinationFavorite({ id, kind: "place", name: id, address: station.address });
  }
  expect(listUnifiedDestinationFavorites()).toHaveLength(2);
});
