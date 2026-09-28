import { describe, expect, it, beforeEach, vi } from "vitest";
import { getDepartureChecklist, resetDepartureChecklist, setDepartureChecklistCompleted } from "./departureChecklist";

const memory = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};

describe("departureChecklist", () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", undefined);
  });

  it("starts empty for the current day", () => {
    expect(getDepartureChecklist().completed).toEqual([]);
  });

  it("persists and toggles items", () => {
    setDepartureChecklistCompleted("route", true);
    setDepartureChecklistCompleted("documents", true);
    expect(getDepartureChecklist().completed).toEqual(["route", "documents"]);
    setDepartureChecklistCompleted("route", false);
    expect(getDepartureChecklist().completed).toEqual(["documents"]);
  });

  it("resets the checklist", () => {
    setDepartureChecklistCompleted("fuel", true);
    resetDepartureChecklist();
    expect(getDepartureChecklist().completed).toEqual([]);
  });
});
