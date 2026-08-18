import { beforeEach, describe, expect, it, vi } from "vitest";

const persisted = { current: { mappedBrand: "all", hoursStatus: "all", sortBy: "distance", anpNeighborhood: "all", anpBrand: "all" } };

vi.mock("../db", () => ({
  addFavoriteStation: vi.fn(),
  createConsentEvent: vi.fn(),
  createProductEvent: vi.fn(),
  createTrafficNotifications: vi.fn(async () => []),
  getFavoritePlaceIds: vi.fn(async () => []),
  getPersonalOverview: vi.fn(),
  getRouteAlertPreferences: vi.fn(async () => []),
  getStationSearchPreferences: vi.fn(async () => persisted.current),
  getTrafficNotifications: vi.fn(async () => []),
  markTrafficNotificationsRead: vi.fn(),
  removeFavoriteStation: vi.fn(),
  removeRouteAlertPreference: vi.fn(),
  upsertRouteAlertPreference: vi.fn(),
  upsertStationSearchPreferences: vi.fn(async (_userId, input) => {
    persisted.current = input;
    return input;
  }),
}));

import { personalRouter } from "./personal";

describe("preferências de busca autenticadas", () => {
  beforeEach(() => {
    persisted.current = { mappedBrand: "all", hoursStatus: "all", sortBy: "distance", anpNeighborhood: "all", anpBrand: "all" };
  });

  it("salva filtros do usuário e os devolve na próxima abertura da consulta", async () => {
    const caller = personalRouter.createCaller({ user: { id: 42 } } as never);
    const chosen = { mappedBrand: "Shell", hoursStatus: "open" as const, sortBy: "hours" as const, anpNeighborhood: "CAMPING CLUBE", anpBrand: "BANDEIRA BRANCA" };

    await caller.saveStationSearchPreferences(chosen);

    await expect(caller.stationSearchPreferences()).resolves.toEqual(chosen);
  });
});
