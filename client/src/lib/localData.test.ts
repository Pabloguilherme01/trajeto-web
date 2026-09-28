import { afterEach, describe, expect, it } from "vitest";
import { clearLocalAppData, listLocalAppKeys } from "./localData";

describe("localData", () => {
  afterEach(() => localStorage.clear());

  it("lists only Trajeto-owned local keys", () => {
    localStorage.setItem("trajeto-daily-mode", "automatico");
    localStorage.setItem("other-app-setting", "keep");
    expect(listLocalAppKeys()).toEqual(["trajeto-daily-mode"]);
  });

  it("clears Trajeto data without touching another app", () => {
    localStorage.setItem("trajeto-mobile-destinations", "[]");
    localStorage.setItem("trajeto-mobile-vehicle", "{}");
    localStorage.setItem("other-app-setting", "keep");
    expect(clearLocalAppData()).toBe(2);
    expect(localStorage.getItem("trajeto-mobile-destinations")).toBeNull();
    expect(localStorage.getItem("trajeto-mobile-vehicle")).toBeNull();
    expect(localStorage.getItem("other-app-setting")).toBe("keep");
  });
});
