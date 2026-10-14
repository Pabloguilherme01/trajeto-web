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
  // Launch IndexedDB counting immediately. Estimate/quota and persistence are
  // independent of route counting, so do not serialize three device I/O calls.
  const routeCountPromise = countOfflineRoutes().catch(() => 0);
  if (!storage) {
    const routeCount = await routeCountPromise;
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

  const [routeCount, estimate, persisted] = await Promise.all([
    routeCountPromise,
    typeof storage.estimate === "function"
      ? storage.estimate().catch(() => ({} as StorageEstimate))
      : Promise.resolve({} as StorageEstimate),
    typeof storage.persisted === "function"
      ? storage.persisted().catch(() => null)
      : Promise.resolve(null),
  ]);
  // Browsers may return missing/invalid estimates under private mode or
  // storage pressure. Do not present NaN/Infinity as an OK storage state.
  const usageBytes = typeof estimate.usage === "number" && Number.isFinite(estimate.usage) && estimate.usage >= 0 ? estimate.usage : null;
  const quotaBytes = typeof estimate.quota === "number" && Number.isFinite(estimate.quota) && estimate.quota > 0 ? estimate.quota : null;

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
  return storage.persist().catch(() => false);
}

export function formatStorageBytes(value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0) return "indisponível";
  if (value < 1024) return Math.round(value) + " B";
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + " KB";
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
  return (value / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}
