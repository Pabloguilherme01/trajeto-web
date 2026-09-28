export type NavigationProvider = "google" | "waze" | "apple";
export type NavigationPreference = "default" | "avoid-tolls" | "avoid-highways";

const KEY = "trajeto-navigation-preferences";

type Stored = {
  provider: NavigationProvider;
  preference: NavigationPreference;
};

const DEFAULTS: Stored = { provider: "google", preference: "default" };

export function getNavigationPreferences(): Stored {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    const provider = parsed.provider === "google" || parsed.provider === "waze" || parsed.provider === "apple" ? parsed.provider : DEFAULTS.provider;
    const preference = parsed.preference === "default" || parsed.preference === "avoid-tolls" || parsed.preference === "avoid-highways" ? parsed.preference : DEFAULTS.preference;
    return { provider, preference };
  } catch {
    return DEFAULTS;
  }
}

export function saveNavigationPreferences(value: Stored): Stored {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  }
  return value;
}
