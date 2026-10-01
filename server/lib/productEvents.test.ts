import { describe, expect, it } from "vitest";
import { normalizeRegion, productEventNames, productEventRegion } from "./productEvents";

describe("product events", () => {
  it("keeps the event catalog explicit and avoids storing an empty region", () => {
    expect(productEventNames).toContain("station_search");
    expect(productEventNames).toContain("station_sheet_opened");
    expect(productEventNames).toContain("station_navigation_confirmed");
    expect(productEventNames).toContain("google_page_token_invalid");
    expect(normalizeRegion("  Brasília,   DF  ")).toBe("Brasília, DF");
    expect(normalizeRegion("   ")).toBeNull();
    expect(productEventRegion("route_open", "-15.76123, -48.28123")).toBeNull();
    expect(productEventRegion("station_search", "Rua 10, casa 4")).toBeNull();
    expect(productEventRegion("google_page_token_invalid", "Águas Lindas")).toBe("Águas Lindas");
  });
});
