import { describe, expect, it } from "vitest";
import { prefersLowDataMode, supportsBackendAuth } from "./runtimeCapabilities";

describe("runtime account capability", () => {
  it("disables backend authentication in the static public runtime", () => {
    expect(supportsBackendAuth(true)).toBe(false);
  });

  it("keeps backend authentication available outside the static runtime", () => {
    expect(supportsBackendAuth(false)).toBe(true);
  });
});


describe("runtime low-data capability", () => {
  it("honors the browser Save-Data preference", () => {
    const navigatorLike = { connection: { saveData: true, effectiveType: "4g" } } as unknown as Navigator;
    expect(prefersLowDataMode(navigatorLike)).toBe(true);
  });

  it("treats 2g-class connections as constrained even without Save-Data", () => {
    const navigatorLike = { connection: { saveData: false, effectiveType: "2g" } } as unknown as Navigator;
    expect(prefersLowDataMode(navigatorLike)).toBe(true);
  });

  it("keeps normal behavior on unconstrained connections", () => {
    const navigatorLike = { connection: { saveData: false, effectiveType: "4g" } } as unknown as Navigator;
    expect(prefersLowDataMode(navigatorLike)).toBe(false);
  });
});
