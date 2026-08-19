import { beforeEach, describe, expect, it, vi } from "vitest";

const persisted = { current: { mappedBrand: "all", hoursStatus: "all", sortBy: "distance", anpNeighborhood: "all", anpBrand: "all", resultsPerView: 10 as 5 | 10 | 20, economicMode: false } };
const vehicles = { current: [] as Array<{ id: number; nickname: string; fuelType: string }> };

vi.mock("../db", () => ({
  addFavoriteStation: vi.fn(),
  createConsentEvent: vi.fn(),
  createProductEvent: vi.fn(),
  createTrafficNotifications: vi.fn(async () => []),
  createUserVehicle: vi.fn(async (_userId, input) => {
    vehicles.current = [{ id: 1, nickname: input.nickname, fuelType: input.fuelType }];
    return vehicles.current;
  }),
  updateUserVehicle: vi.fn(async (_userId, id, input) => {
    vehicles.current = [{ id, nickname: input.nickname, fuelType: input.fuelType }];
    return vehicles.current;
  }),
  deleteUserVehicle: vi.fn(async () => ({ removed: true })),
  getFavoritePlaceIds: vi.fn(async () => []),
  getPersonalOverview: vi.fn(),
  getRouteAlertPreferences: vi.fn(async () => []),
  getStationSearchPreferences: vi.fn(async () => persisted.current),
  getTrafficNotifications: vi.fn(async () => []),
  getUserVehicles: vi.fn(async () => vehicles.current),
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
    persisted.current = { mappedBrand: "all", hoursStatus: "all", sortBy: "distance", anpNeighborhood: "all", anpBrand: "all", resultsPerView: 10, economicMode: false };
    vehicles.current = [];
  });

  it("salva filtros do usuário e os devolve na próxima abertura da consulta", async () => {
    const caller = personalRouter.createCaller({ user: { id: 42 } } as never);
    const chosen = { mappedBrand: "Shell", hoursStatus: "open" as const, sortBy: "hours" as const, anpNeighborhood: "CAMPING CLUBE", anpBrand: "BANDEIRA BRANCA", resultsPerView: 5 as const, economicMode: true };

    await caller.saveStationSearchPreferences(chosen);

    await expect(caller.stationSearchPreferences()).resolves.toEqual(chosen);
  });

  it("guarda veículos somente na conta autenticada e sem exigir placa", async () => {
    const caller = personalRouter.createCaller({ user: { id: 42 } } as never);
    await caller.createVehicle({ nickname: "Meu carro", fuelType: "flex", tankLiters: 45, cityKmPerLiter: 10 });
    await expect(caller.vehicles()).resolves.toEqual([{ id: 1, nickname: "Meu carro", fuelType: "flex" }]);
  });

  it("atualiza somente o veículo pertencente à conta autenticada", async () => {
    const caller = personalRouter.createCaller({ user: { id: 42 } } as never);
    await caller.updateVehicle({ id: 1, nickname: "Meu carro revisado", fuelType: "gasoline", tankLiters: 45, cityKmPerLiter: 11 });
    await expect(caller.vehicles()).resolves.toEqual([{ id: 1, nickname: "Meu carro revisado", fuelType: "gasoline" }]);
  });
});
