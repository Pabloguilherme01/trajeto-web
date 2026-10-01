import { describe, expect, it } from "vitest";
import { supportsBackendAuth } from "./runtimeCapabilities";

describe("runtime account capability", () => {
  it("disables backend authentication in the static public runtime", () => {
    expect(supportsBackendAuth(true)).toBe(false);
  });

  it("keeps backend authentication available outside the static runtime", () => {
    expect(supportsBackendAuth(false)).toBe(true);
  });
});
