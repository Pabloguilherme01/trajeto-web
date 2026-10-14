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

it("keeps invalid storage estimates unknown rather than displaying false spare capacity", async () => {
  vi.stubGlobal("navigator", {
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage: Number.NaN, quota: Number.POSITIVE_INFINITY }),
      persisted: vi.fn().mockResolvedValue(false),
    },
  });
  const status = await getOfflineStorageStatus();
  expect(status.usageBytes).toBeNull();
  expect(status.quotaBytes).toBeNull();
  expect(status.usageRatio).toBeNull();
  expect(status.storageRisk).toBe("unknown");
  expect(formatStorageBytes(status.usageBytes)).toBe("indisponível");
});

it("requests persistent storage only through an explicit call", async () => {
  const persist = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("navigator", { storage: { persist } });
  expect(persist).not.toHaveBeenCalled();
  expect(await requestOfflineStoragePersistence()).toBe(true);
  expect(persist).toHaveBeenCalledTimes(1);
});

it("formats storage sizes without inventing 1 KB for zero bytes", () => {
  expect(formatStorageBytes(0)).toBe("0 B");
  expect(formatStorageBytes(512)).toBe("512 B");
  expect(formatStorageBytes(1024)).toBe("1 KB");
  expect(formatStorageBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  expect(formatStorageBytes(null)).toBe("indisponível");
});

it("keeps persistence refusal from becoming an unhandled action error", async () => {
  vi.stubGlobal("navigator", { storage: { persist: vi.fn().mockRejectedValue(new Error("SecurityError")) } });
  expect(await requestOfflineStoragePersistence()).toBe(false);
});

it("checks quota and persistence without making one wait for the other", async () => {
  let finishEstimate!: (value: StorageEstimate) => void;
  let finishPersistence!: (value: boolean) => void;
  const estimate = vi.fn(() => new Promise<StorageEstimate>(resolve => { finishEstimate = resolve; }));
  const persisted = vi.fn(() => new Promise<boolean>(resolve => { finishPersistence = resolve; }));
  vi.stubGlobal("navigator", { storage: { estimate, persisted } });

  const pending = getOfflineStorageStatus();
  await vi.waitFor(() => {
    expect(estimate).toHaveBeenCalledOnce();
    expect(persisted).toHaveBeenCalledOnce();
  });
  finishEstimate({ usage: 20, quota: 100 });
  finishPersistence(true);
  const result = await pending;
  expect(result.usageRatio).toBe(0.2);
  expect(result.persisted).toBe(true);
});
