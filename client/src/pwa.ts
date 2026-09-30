export const pwaUpdateEvent = "trajeto:pwa-update";

let currentRegistration: ServiceWorkerRegistration | null = null;

function announceUpdate(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return;
  window.dispatchEvent(new Event(pwaUpdateEvent));
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
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
    }).catch(() => {});
  });
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