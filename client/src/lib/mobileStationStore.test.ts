import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listMobileStationFavorites,
  mobileStationStoreEvent,
  toggleMobileStationFavorite,
  type MobileStation,
} from "./mobileStationStore";

const station: MobileStation = {
  placeId: "test:1",
  name: "Posto Teste",
  address: "Rua Teste, 1",
  lat: -15.83,
  lng: -48.24,
  openingHours: [],
};

describe("mobileStationStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and removes a station", () => {
    expect(toggleMobileStationFavorite(station).saved).toBe(true);
    expect(listMobileStationFavorites()).toHaveLength(1);

    expect(toggleMobileStationFavorite(station).saved).toBe(false);
    expect(listMobileStationFavorites()).toHaveLength(0);
  });

  it("emits an event after saving", () => {
    const listener = vi.fn();
    window.addEventListener(mobileStationStoreEvent, listener);

    toggleMobileStationFavorite(station);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(mobileStationStoreEvent, listener);
  });
});
