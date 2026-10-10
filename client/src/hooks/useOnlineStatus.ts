import { useSyncExternalStore } from "react";

/**
 * Shared connectivity signal for the main screens.
 *
 * Only the status is shared. No GPS, route history, search terms or other
 * personal data is stored, transmitted or exposed by this hook.
 */
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const notify of subscribers) notify();
}

function subscribe(notify: () => void) {
  if (typeof window === "undefined") return () => {};
  subscribers.add(notify);
  if (subscribers.size === 1) {
    window.addEventListener("online", notifySubscribers);
    window.addEventListener("offline", notifySubscribers);
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      window.removeEventListener("online", notifySubscribers);
      window.removeEventListener("offline", notifySubscribers);
    }
  };
}

function getOnlineSnapshot() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getOnlineSnapshot, () => true);
}
