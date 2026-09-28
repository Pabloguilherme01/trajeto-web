const KEY = "trajeto-accessibility-preferences";
const EVENT = "trajeto-accessibility-change";

export type AccessibilityPreferences = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
};

const defaults: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  compactMode: false,
};

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getAccessibilityPreferences(): AccessibilityPreferences {
  const s = storage();
  if (!s) return defaults;
  try {
    const value = JSON.parse(s.getItem(KEY) || "null");
    if (!value || typeof value !== "object") return defaults;
    return {
      largeText: value.largeText === true,
      highContrast: value.highContrast === true,
      reduceMotion: value.reduceMotion === true,
      compactMode: value.compactMode === true,
    };
  } catch { return defaults; }
}

export function setAccessibilityPreferences(next: AccessibilityPreferences): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
    return true;
  } catch { return false; }
}

export function updateAccessibilityPreference<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) {
  return setAccessibilityPreferences({ ...getAccessibilityPreferences(), [key]: value });
}

export function resetAccessibilityPreferences() {
  const s = storage();
  try { s?.removeItem(KEY); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export const accessibilityPreferenceEvent = EVENT;
