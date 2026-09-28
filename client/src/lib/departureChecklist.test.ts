import { describe, expect, it, beforeEach } from "vitest";
import { getDepartureChecklist, resetDepartureChecklist, setDepartureChecklistCompleted } from "./departureChecklist";

describe("departureChecklist", () => {
  beforeEach(() => localStorage.clear());

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
