export const pwaUpdateEvent = "trajeto:pwa-update";

let currentRegistration: ServiceWorkerRegistration | null = null;

export function hasWaitingAppUpdate() {
  return Boolean(currentRegistration?.waiting);
}

export async function checkForAppUpdate(): Promise<"available" | "current" | "offline" | "unsupported" | "pending"> {
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!navigator.onLine) return "offline";
  const registration = currentRegistration ?? await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!registration) return "unsupported";
  currentRegistration = registration;
  await registration.update();
  if (registration.installing) {
    const worker = registration.installing;
    await new Promise<void>(resolve => {
      const finish = () => {
        clearTimeout(timer);
        worker.removeEventListener("statechange", changed);
        resolve();
      };
      const changed = () => { if (worker.state === "installed" || worker.state === "redundant") finish(); };
      const timer = setTimeout(finish, 15000);
      worker.addEventListener("statechange", changed);
      changed();
    });
    if (worker.state === "redundant") throw new Error("Não foi possível preparar a nova versão.");
  }
  announceUpdate(registration);
  return registration.waiting ? "available" : registration.installing ? "pending" : "current";
}

function announceUpdate(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return;
  window.dispatchEvent(new Event(pwaUpdateEvent));
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const warmCurrentRoute = () => {
    void cacheCurrentRouteForOffline();
    scheduleBackgroundOfflinePreparation();
  };
  navigator.serviceWorker.addEventListener("controllerchange", warmCurrentRoute);

  const register = () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    }).then(registration => {
      currentRegistration = registration;
      announceUpdate(registration);
      if (navigator.serviceWorker.controller) warmCurrentRoute();

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate(registration);
          }
        });
      });
      void registration.update().catch(() => undefined);
      const update = () => { void registration.update().catch(() => undefined); };
      window.addEventListener("online", () => {
        update();
        scheduleBackgroundOfflinePreparation();
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          update();
          scheduleBackgroundOfflinePreparation();
        }
      });
    }).catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

export async function applyServiceWorkerUpdate() {
  if (!("serviceWorker" in navigator)) return false;

  const registration = currentRegistration ?? await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!registration) return false;
  currentRegistration = registration;

  const waiting = registration.waiting;
  if (!waiting) return false;

  return await new Promise<boolean>(resolve => {
    let finished = false;
    const onControllerChange = () => finish(true);
    const finish = (activated: boolean) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      resolve(activated);
      if (activated) window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });
    const timer = window.setTimeout(() => finish(false), 5000);
    try { waiting.postMessage({ type: "SKIP_WAITING" }); }
    catch { finish(false); }
  });
}

export const currentRouteOfflineEvent = "trajeto:current-route-offline-ready";
export const offlinePackageReadyEvent = "trajeto:offline-package-ready";

let backgroundOfflineScheduled = false;

function publishOfflinePackageState(ready: boolean) {
  document.documentElement.dataset.offlinePackageReady = ready ? "true" : "false";
  if (ready) window.dispatchEvent(new Event(offlinePackageReadyEvent));
}

function canPrepareOfflineInBackground() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (connection?.saveData) return false;
  return !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
}

function scheduleBackgroundOfflinePreparation() {
  if (backgroundOfflineScheduled || !navigator.onLine || !canPrepareOfflineInBackground()) return;
  backgroundOfflineScheduled = true;

  const run = async () => {
    if (!navigator.serviceWorker?.controller) {
      backgroundOfflineScheduled = false;
      return;
    }
    document.documentElement.dataset.offlinePackageReady = "preparing";
    const current = await requestOfflineStatus("OFFLINE_STATUS", 5000);
    const result = current.ready
      ? current
      : await requestOfflineStatus("RESTORE_OFFLINE", 120000);
    publishOfflinePackageState(result.ready);
    if (!result.ready) backgroundOfflineScheduled = false;
  };

  const requestIdle = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (requestIdle) requestIdle(() => { void run(); }, { timeout: 3500 });
  else window.setTimeout(() => { void run(); }, 1200);
}

export async function cacheCurrentRouteForOffline(): Promise<boolean> {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return false;

  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  const urls = performance.getEntriesByType("resource")
    .map(entry => entry.name)
    .filter(name => {
      try {
        const url = new URL(name, window.location.href);
        return url.origin === window.location.origin &&
          url.href.startsWith(base.href) &&
          !url.pathname.includes("/api/");
      } catch {
        return false;
      }
    });

  document.documentElement.dataset.offlineRouteReady = "preparing";
  return await new Promise(resolve => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = (ready: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      document.documentElement.dataset.offlineRouteReady = ready ? "true" : "false";
      if (ready) window.dispatchEvent(new Event(currentRouteOfflineEvent));
      resolve(ready);
    };
    const timer = window.setTimeout(() => finish(false), 10000);
    channel.port1.onmessage = event => finish(event.data?.ready === true);
    try {
      worker.postMessage({ type: "CACHE_CURRENT_RESOURCES", urls }, [channel.port2]);
    } catch {
      finish(false);
    }
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
    const result = await requestOfflineStatus("RESTORE_OFFLINE", 120000);
    publishOfflinePackageState(result.ready);
    if (!result.ready && registration.waiting) announceUpdate(registration);
    return result;
  } catch {
    return { ready: false, reason: "unsupported" };
  }
}
