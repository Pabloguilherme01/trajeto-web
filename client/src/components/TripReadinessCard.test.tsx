import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import TripReadinessCard from "./TripReadinessCard";
import { clearLocalAppData } from "@/lib/localData";
import { type OfflineRoute } from "@/lib/offlineStore";

const offline = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/lib/offlineStore", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/offlineStore")>(),
  listOfflineRoutes: offline.list,
  clearOfflineRoutes: async () => 0,
}));

beforeEach(() => {
  vi.stubGlobal("React", React);
  localStorage.clear();
  offline.list.mockReset().mockResolvedValue([]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("removes visible vehicle data immediately when device data is cleared", async () => {
  localStorage.setItem("trajeto-mobile-vehicle", JSON.stringify({ name: "Carro particular", fuel: "gasolina", consumption: 10, tank: 50 }));
  render(<TripReadinessCard />);
  expect(screen.getByText("Carro particular")).toBeTruthy();
  await act(async () => { await clearLocalAppData(); });
  expect(screen.queryByText("Carro particular")).toBeNull();
  expect(screen.getByText("Nenhum veículo cadastrado.")).toBeTruthy();
});

it("ignores an older offline read that completes after device data is cleared", async () => {
  let finishOld!: (routes: OfflineRoute[]) => void;
  offline.list.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  render(<TripReadinessCard />);
  await waitFor(() => expect(offline.list).toHaveBeenCalledOnce());
  await act(async () => { await clearLocalAppData(); });
  await act(async () => finishOld([{
    id: "old", origin: "Centro", destination: "Hospital antigo",
    savedAt: new Date().toISOString(), payload: {},
  }]));
  expect(screen.getByText("Nenhuma viagem preparada.")).toBeTruthy();
  expect(screen.queryByText(/salva há/)).toBeNull();
});
