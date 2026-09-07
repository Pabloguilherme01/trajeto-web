import { describe, expect, it } from "vitest";
import { stationSearchInput } from "./stations";

describe("stationSearchInput", () => {
  it("aceita tokens longos de continuação emitidos pelo Google Maps", () => {
    const cursor = "A".repeat(900);

    expect(stationSearchInput.parse({ query: "Águas Lindas de Goiás, GO", cursor })).toEqual({
      query: "Águas Lindas de Goiás, GO",
      cursor,
    });
  });

  it("rejeita cursores maiores que o teto defensivo", () => {
    expect(() => stationSearchInput.parse({ query: "Águas Lindas de Goiás, GO", cursor: "A".repeat(2_049) })).toThrow();
  });
});
