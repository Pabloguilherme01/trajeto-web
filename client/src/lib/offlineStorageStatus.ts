import { countOfflineRoutes } from "@/lib/offlineStore";

export type OfflineStorageStatus = {
  supported: boolean;
  persisted: boolean | null;
  routeCount: number;
  usageBytes: number | null;
  quotaBytes: number | null;
  usageRatio: number | null;
  storageRisk: "unknown" | "ok" | "attention" | "high";
};

function riskFor(usage: number | null, quota: number | null): OfflineStorageStatus["storageRisk"] {
  if (usage === null || quota === null || quota <= 0) return "unknown";
  const ratio = usage / quota;
  if (ratio >= 0.9) return "high";
  if (ratio >= 0.75) return "attention";
  return "ok";
}

export async function getOfflineStorageStatus(): Promise<OfflineStorageStatus> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  const routeCount = await countOfflineRoutes().catch(() => 0);
  if (!storage) {
    return {
      supported: false,
      persisted: null,
      routeCount,
      usageBytes: null,
      quotaBytes: null,
      usageRatio: null,
      storageRisk: "unknown",
    };
  }

  const estimate: StorageEstimate = typeof storage.estimate === "function"
    ? await storage.estimate().catch(() => ({} as StorageEstimate))
    : {};
  const usageBytes = typeof estimate.usage === "number" ? estimate.usage : null;
  const quotaBytes = typeof estimate.quota === "number" ? estimate.quota : null;
  const persisted = typeof storage.persisted === "function"
    ? await storage.persisted().catch(() => null)
    : null;

  return {
    supported: true,
    persisted,
    routeCount,
    usageBytes,
    quotaBytes,
    usageRatio: usageBytes !== null && quotaBytes !== null && quotaBytes > 0
      ? usageBytes / quotaBytes
      : null,
    storageRisk: riskFor(usageBytes, quotaBytes),
  };
}

export async function requestOfflineStoragePersistence() {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage || typeof storage.persist !== "function") return false;
  return storage.persist();
}

export function formatStorageBytes(value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0) return "indisponível";
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + " KB";
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
  return (value / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}
