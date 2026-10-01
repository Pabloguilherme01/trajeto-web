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

export async function getOfflineReadiness(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return false;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(ready);
    };
    const timer = setTimeout(() => finish(false), 5000);
    channel.port1.onmessage = event => finish(event.data?.ready === true);
    try {
      navigator.serviceWorker.controller!.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}
