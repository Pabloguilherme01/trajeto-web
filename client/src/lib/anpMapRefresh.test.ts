import { describe, expect, it } from "vitest";
import { ANP_MAP_REFRESH_INTERVAL_MS, shouldFetchAnpMapSnapshot } from "./anpMapRefresh";

describe("ANP map snapshot session revalidation", () => {
  const t = 1_800_000_000_000;

  it("fetches on first map visit and retries after errors or cancellation", () => {
    expect(shouldFetchAnpMapSnapshot(0, t)).toBe(true);
    expect(shouldFetchAnpMapSnapshot(-1, t)).toBe(true);
    expect(shouldFetchAnpMapSnapshot(Number.NaN, t)).toBe(true);
  });

  it("reuses the successful snapshot on repeated category switches", () => {
    expect(shouldFetchAnpMapSnapshot(t, t + 10)).toBe(false);
    expect(shouldFetchAnpMapSnapshot(t, t + ANP_MAP_REFRESH_INTERVAL_MS - 1)).toBe(false);
    expect(shouldFetchAnpMapSnapshot(t, t + ANP_MAP_REFRESH_INTERVAL_MS)).toBe(true);
  });

  it("allows revalidation after clock correction or stale data", () => {
    expect(shouldFetchAnpMapSnapshot(t, t - 100)).toBe(true);
    expect(shouldFetchAnpMapSnapshot(t, Number.NaN)).toBe(true);
    expect(shouldFetchAnpMapSnapshot(t, t + ANP_MAP_REFRESH_INTERVAL_MS * 3)).toBe(true);
  });
});
