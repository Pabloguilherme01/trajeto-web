export const pwaUpdateEvent = "trajeto:pwa-update";

let currentRegistration: ServiceWorkerRegistration | null = null;

function announceUpdate(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return;
  window.dispatchEvent(new Event(pwaUpdateEvent));
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const register = () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    }).then(registration => {
      currentRegistration = registration;
      void registration.update().catch(() => undefined);
      announceUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate(registration);
          }
        });
      });
      const update = () => { void registration.update().catch(() => undefined); };
      window.addEventListener("online", update);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
    }).catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

export async function applyServiceWorkerUpdate() {
  if (!("serviceWorker" in navigator)) return;

  const registration = currentRegistration ?? await navigator.serviceWorker.ready;
  currentRegistration = registration;

  const waiting = registration.waiting;
  if (!waiting) return;

  await new Promise<void>(resolve => {
    let finished = false;
    const onControllerChange = () => finish();
    const finish = () => {
      if (finished) return;
      finished = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      resolve();
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });
    window.setTimeout(finish, 5000);
    waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

export function installOfflinePersistence() {
  window.addEventListener("online", () => window.dispatchEvent(new Event("trajeto:online")));
  window.addEventListener("offline", () => window.dispatchEvent(new Event("trajeto:offline")));
}

export type OfflinePreparation = { ready: boolean; reason?: "unsupported" | "preparing" | "connection" | "storage" | "update" };

function requestOfflineStatus(type: "OFFLINE_STATUS" | "RESTORE_OFFLINE", timeout: number): Promise<OfflinePreparation> {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve({ ready: false, reason: "preparing" });
  return new Promise(resolve => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = (result: OfflinePreparation) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ready: false, reason: "connection" }), timeout);
    channel.port1.onmessage = event => {
      const reason = event.data?.reason;
      finish({ ready: event.data?.ready === true, ...(["update", "storage", "connection"].includes(reason) ? { reason } : {}) });
    };
    try {
      worker.postMessage({ type }, [channel.port2]);
    } catch {
      finish({ ready: false, reason: "unsupported" });
    }
  });
}

export async function getOfflineReadiness(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  return (await requestOfflineStatus("OFFLINE_STATUS", 5000)).ready;
}

export type OfflineStorageStatus = {
  supported: boolean;
  persisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
};

export async function getOfflineStorageStatus(): Promise<OfflineStorageStatus> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage) {
    return { supported: false, persisted: false, usageBytes: null, quotaBytes: null };
  }
  try {
    const [persisted, estimate] = await Promise.all([
      storage.persisted?.().catch(() => false) ?? Promise.resolve(false),
      storage.estimate?.().catch(() => ({})) ?? Promise.resolve({}),
    ]);
    return {
      supported: typeof storage.persist === "function",
      persisted: persisted === true,
      usageBytes: typeof estimate.usage === "number" && Number.isFinite(estimate.usage) ? estimate.usage : null,
      quotaBytes: typeof estimate.quota === "number" && Number.isFinite(estimate.quota) ? estimate.quota : null,
    };
  } catch {
    return { supported: typeof storage.persist === "function", persisted: false, usageBytes: null, quotaBytes: null };
  }
}

export async function requestOfflineStoragePersistence(): Promise<OfflineStorageStatus> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage?.persist) return getOfflineStorageStatus();
  try {
    await storage.persist();
  } catch {}
  return getOfflineStorageStatus();
}


export async function prepareOfflineAccess(): Promise<OfflinePreparation> {
  if (!("serviceWorker" in navigator)) return { ready: false, reason: "unsupported" };
  if (await getOfflineReadiness()) return { ready: true };
  if (!navigator.onLine) return { ready: false, reason: "connection" };
  try {
    const registration = currentRegistration ?? await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL) ??
      await navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL, updateViaCache: "none" });
    currentRegistration = registration;
    void registration.update().then(() => announceUpdate(registration)).catch(() => undefined);
    if (!navigator.serviceWorker.controller) return { ready: false, reason: "preparing" };
    const result = await requestOfflineStatus("RESTORE_OFFLINE", 60000);
    if (!result.ready && registration.waiting) announceUpdate(registration);
    return result;
  } catch {
    return { ready: false, reason: "unsupported" };
  }
}
