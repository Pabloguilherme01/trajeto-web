import { describe, expect, it } from "vitest";
import { normalizeRegion, productEventNames } from "./productEvents";

describe("product events", () => {
  it("keeps the event catalog explicit and avoids storing an empty region", () => {
    expect(productEventNames).toContain("station_search");
    expect(productEventNames).toContain("station_sheet_opened");
    expect(productEventNames).toContain("station_navigation_confirmed");
    expect(productEventNames).toContain("google_page_token_invalid");
    expect(normalizeRegion("  Brasília,   DF  ")).toBe("Brasília, DF");
    expect(normalizeRegion("   ")).toBeNull();
  });
});
