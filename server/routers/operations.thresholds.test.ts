import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsertPaginationAlertThreshold: vi.fn() }));

vi.mock("../db", () => ({
  createRedemption: vi.fn(),
  getOperationalOverview: vi.fn(async () => ({})),
  recordAnpSyncRun: vi.fn(),
  replaceAnpPriceSnapshots: vi.fn(),
  replaceAuthorizedStations: vi.fn(),
  upsertPaginationAlertThreshold: mocks.upsertPaginationAlertThreshold,
}));

vi.mock("../lib/anpImport", () => ({ DEFAULT_ANP_SOURCE_URL: "https://example.com/anp.xlsx", downloadAndParseAnp: vi.fn() }));
vi.mock("../lib/anpAuthorizedStations", () => ({ DEFAULT_ANP_AUTHORIZED_STATIONS_URL: "https://example.com/authorized.csv", downloadAuthorizedStations: vi.fn() }));

import { operationsRouter } from "./operations";

describe("limites regionais auditáveis", () => {
  beforeEach(() => mocks.upsertPaginationAlertThreshold.mockReset());

  it("atribui a alteração à conta administradora autenticada", async () => {
    mocks.upsertPaginationAlertThreshold.mockResolvedValue({ region: "Águas Lindas de Goiás, GO", threshold: 4, changed: true });
    const caller = operationsRouter.createCaller({ user: { id: 77, role: "admin" } } as never);

    await caller.savePaginationAlertThreshold({ region: "Águas Lindas de Goiás, GO", threshold: 4 });

    expect(mocks.upsertPaginationAlertThreshold).toHaveBeenCalledWith({ region: "Águas Lindas de Goiás, GO", threshold: 4, changedByUserId: 77 });
  });
});
