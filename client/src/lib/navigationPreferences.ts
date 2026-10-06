export type NavigationProvider = "google" | "waze" | "apple" | "organic";
export type NavigationPreference = "default" | "avoid-tolls" | "avoid-highways";

const KEY = "trajeto-navigation-preferences";
const LEGACY_PROVIDER_KEY = "trajeto:navigation-provider";

export type StoredNavigationPreferences = {
  provider: NavigationProvider;
  preference: NavigationPreference;
};

const DEFAULTS: StoredNavigationPreferences = { provider: "google", preference: "default" };

function validProvider(value: unknown): value is NavigationProvider {
  return value === "google" || value === "waze" || value === "apple" || value === "organic";
}

function validPreference(value: unknown): value is NavigationPreference {
  return value === "default" || value === "avoid-tolls" || value === "avoid-highways";
}

export function getNavigationPreferences(): StoredNavigationPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredNavigationPreferences>;
      return {
        provider: validProvider(parsed.provider) ? parsed.provider : DEFAULTS.provider,
        preference: validPreference(parsed.preference) ? parsed.preference : DEFAULTS.preference,
      };
    }

    const legacyProvider = window.localStorage.getItem(LEGACY_PROVIDER_KEY);
    if (validProvider(legacyProvider)) {
      const migrated = { provider: legacyProvider, preference: DEFAULTS.preference };
      window.localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return DEFAULTS;
  }
  return DEFAULTS;
}

export function saveNavigationPreferences(value: StoredNavigationPreferences): StoredNavigationPreferences {
  const normalized: StoredNavigationPreferences = {
    provider: validProvider(value.provider) ? value.provider : DEFAULTS.provider,
    preference: validPreference(value.preference) ? value.preference : DEFAULTS.preference,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(normalized));
      // Keep the legacy key synchronized while older imports are phased out.
      window.localStorage.setItem(LEGACY_PROVIDER_KEY, normalized.provider);
    } catch {}
  }
  return normalized;
}

export function setNavigationProvider(provider: NavigationProvider): StoredNavigationPreferences {
  const current = getNavigationPreferences();
  return saveNavigationPreferences({ ...current, provider });
}

export function setNavigationPreference(preference: NavigationPreference): StoredNavigationPreferences {
  const current = getNavigationPreferences();
  return saveNavigationPreferences({ ...current, preference });
}
