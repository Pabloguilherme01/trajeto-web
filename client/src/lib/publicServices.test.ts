import { describe, expect, it } from "vitest";
import { PUBLIC_SERVICES, searchPublicServices } from "./publicServices";

describe("public services catalog", () => {
  it("keeps essential Águas Lindas services locally available", () => {
    expect(PUBLIC_SERVICES.some(item => item.id === "upa-mansoes-odisseia")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "hospital-bom-jesus")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "prefeitura")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "policia-civil-1")).toBe(true);
  });

  it("filters by category and text without case sensitivity", () => {
    expect(searchPublicServices("cora coralina", "educacao").map(item => item.id)).toContain("coralina");
    expect(searchPublicServices("upu", "saude").some(item => item.id === "upa-mansoes-odisseia")).toBe(true);
    expect(searchPublicServices("nao existe", "todos")).toEqual([]);
  });
});
