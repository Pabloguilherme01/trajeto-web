import { beforeEach, describe, expect, it } from "vitest";
import { getAccessibilityPreferences, resetAccessibilityPreferences, updateAccessibilityPreference } from "./accessibilityPreferences";

describe("accessibilityPreferences", () => {
  beforeEach(() => localStorage.clear());

  it("returns safe defaults", () => {
    expect(getAccessibilityPreferences()).toEqual({ largeText:false, highContrast:false, reduceMotion:false, compactMode:false });
  });

  it("persists and updates preferences", () => {
    updateAccessibilityPreference("largeText", true);
    updateAccessibilityPreference("highContrast", true);
    expect(getAccessibilityPreferences()).toMatchObject({ largeText:true, highContrast:true });
  });

  it("resets preferences", () => {
    updateAccessibilityPreference("compactMode", true);
    resetAccessibilityPreferences();
    expect(getAccessibilityPreferences().compactMode).toBe(false);
  });
});
