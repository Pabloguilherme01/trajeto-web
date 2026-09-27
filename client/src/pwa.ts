const CACHE_NAME = "trajeto-shell-v1";
const SHELL_ASSETS = [
  "./",
  "./site.webmanifest",
  "./favicon.svg",
  "./robots.txt",
];

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}

export function installOfflinePersistence() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("online", () => window.dispatchEvent(new CustomEvent("trajeto:online")));
  window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("trajeto:offline")));
}
