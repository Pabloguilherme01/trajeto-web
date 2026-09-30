const UPDATE_EVENT = "trajeto:update-available";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: "none" })
      .then(registration => {
        void registration.update().catch(() => undefined);
        const announceUpdate = () => window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: registration }));

        if (registration.waiting && navigator.serviceWorker.controller) {
          announceUpdate();
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) announceUpdate();
          });
        });
      })
      .catch(() => {});
  });
}

export function applyServiceWorkerUpdate() {
  void navigator.serviceWorker.ready.then(registration => {
    if (!registration.waiting) {
      window.location.reload();
      return;
    }

    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

export function installOfflinePersistence() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("online", () => window.dispatchEvent(new CustomEvent("trajeto:online")));
  window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("trajeto:offline")));
}

export const pwaUpdateEvent = UPDATE_EVENT;
