import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getNavigationPreferences,
  saveNavigationPreferences,
  setNavigationPreference,
  setNavigationProvider,
} from "./navigationPreferences";

function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const localStorage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
    clear: vi.fn(() => { data.clear(); }),
    key: vi.fn((index: number) => Array.from(data.keys())[index] ?? null),
    get length() { return data.size; },
  };
  vi.stubGlobal("window", { localStorage });
  return { data, localStorage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("navigation preferences", () => {
  it("returns stable defaults outside the browser", () => {
    vi.stubGlobal("window", undefined);
    expect(getNavigationPreferences()).toEqual({
      provider: "google",
      preference: "default",
    });
  });

  it("migrates the legacy provider key into the shared preference object", () => {
    const { data } = installStorage({ "trajeto:navigation-provider": "waze" });
    expect(getNavigationPreferences()).toEqual({
      provider: "waze",
      preference: "default",
    });
    expect(JSON.parse(data.get("trajeto-navigation-preferences") || "{}")).toEqual({
      provider: "waze",
      preference: "default",
    });
  });

  it("keeps the legacy provider key synchronized during migration", () => {
    const { data } = installStorage();
    saveNavigationPreferences({ provider: "apple", preference: "avoid-tolls" });
    expect(data.get("trajeto:navigation-provider")).toBe("apple");
    expect(JSON.parse(data.get("trajeto-navigation-preferences") || "{}")).toEqual({
      provider: "apple",
      preference: "avoid-tolls",
    });
  });

  it("changes the provider without losing the route preference", () => {
    installStorage({
      "trajeto-navigation-preferences": JSON.stringify({
        provider: "google",
        preference: "avoid-highways",
      }),
    });
    expect(setNavigationProvider("waze")).toEqual({
      provider: "waze",
      preference: "avoid-highways",
    });
  });

  it("accepts Organic Maps as a saved navigation provider", () => {
    installStorage();
    expect(setNavigationProvider("organic")).toEqual({
      provider: "organic",
      preference: "default",
    });
    expect(getNavigationPreferences().provider).toBe("organic");
  });

  it("changes the route preference without losing the provider", () => {
    installStorage({
      "trajeto-navigation-preferences": JSON.stringify({
        provider: "apple",
        preference: "default",
      }),
    });
    expect(setNavigationPreference("avoid-tolls")).toEqual({
      provider: "apple",
      preference: "avoid-tolls",
    });
  });

  it("falls back safely when stored values are invalid", () => {
    installStorage({
      "trajeto-navigation-preferences": JSON.stringify({
        provider: "invalid",
        preference: "broken",
      }),
    });
    expect(getNavigationPreferences()).toEqual({
      provider: "google",
      preference: "default",
    });
  });
});
