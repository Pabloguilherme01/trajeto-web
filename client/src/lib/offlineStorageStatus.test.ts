import { afterEach, expect, it, vi } from "vitest";
import { formatStorageBytes, getOfflineStorageStatus, requestOfflineStoragePersistence } from "./offlineStorageStatus";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("reports browser storage quota without exposing location data", async () => {
  vi.stubGlobal("navigator", {
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage: 80, quota: 100 }),
      persisted: vi.fn().mockResolvedValue(true),
    },
  });

  const status = await getOfflineStorageStatus();
  expect(status.persisted).toBe(true);
  expect(status.usageRatio).toBe(0.8);
  expect(status.storageRisk).toBe("attention");
});

it("requests persistent storage only through an explicit call", async () => {
  const persist = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("navigator", { storage: { persist } });
  expect(persist).not.toHaveBeenCalled();
  expect(await requestOfflineStoragePersistence()).toBe(true);
  expect(persist).toHaveBeenCalledTimes(1);
});

it("formats storage sizes for people instead of raw bytes", () => {
  expect(formatStorageBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  expect(formatStorageBytes(null)).toBe("indisponível");
});
