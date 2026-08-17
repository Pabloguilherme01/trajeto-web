import { describe, expect, it } from "vitest";
import { normalizeRegion, productEventNames } from "./productEvents";

describe("product events", () => {
  it("keeps the event catalog explicit and avoids storing an empty region", () => {
    expect(productEventNames).toContain("station_search");
    expect(normalizeRegion("  Brasília,   DF  ")).toBe("Brasília, DF");
    expect(normalizeRegion("   ")).toBeNull();
  });
});
