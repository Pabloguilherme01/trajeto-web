import { appUrl } from "@/lib/appUrl";

const CACHE_NAME = "trajeto-offline-pack-v1";
const STORAGE_KEY = "trajeto:offline-pack";

export type OfflinePackStatus = {
  version: string;
  downloadedAt: string;
  resources: number;
};

const PACK_URLS = [
  appUrl("/"),
  appUrl("/mapa"),
  appUrl("/planejar"),
  appUrl("/data/aguas-lindas-anp.json"),
  appUrl("/data/aguas-lindas-anp-precos.json"),
];

export async function downloadOfflinePack(): Promise<OfflinePackStatus> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache offline indisponível neste navegador.");
  }

  const cache = await caches.open(CACHE_NAME);
  let resources = 0;

  for (const url of PACK_URLS) {
    try {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) continue;
      await cache.put(url, response.clone());
      resources += 1;
    } catch {
      // Preços podem estar indisponíveis sem impedir o pacote restante.
    }
  }

  if (resources < 3) throw new Error("Não foi possível preparar o pacote local.");
  const status = {
    version: "2026-09-30",
    downloadedAt: new Date().toISOString(),
    resources,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  return status;
}

export function getOfflinePackStatus(): OfflinePackStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OfflinePackStatus>;
    if (
      typeof parsed.version !== "string" ||
      typeof parsed.downloadedAt !== "string" ||
      typeof parsed.resources !== "number"
    ) return null;
    return {
      version: parsed.version,
      downloadedAt: parsed.downloadedAt,
      resources: parsed.resources,
    };
  } catch {
    return null;
  }
}

export async function clearOfflinePack() {
  if (typeof window !== "undefined" && "caches" in window) {
    await caches.delete(CACHE_NAME);
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
