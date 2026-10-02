import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLocalAppData, countLocalAppData, exportLocalAppData, listLocalAppKeys, listSessionAppKeys } from "./localData";

describe("localData", () => {
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("lists only Trajeto-owned local keys", () => {
    localStorage.setItem("trajeto-daily-mode", "automatico");
    localStorage.setItem("trajeto:public-service-favorites:v1", '["sic"]');
    localStorage.setItem("other-app-setting", "keep");
    expect(listLocalAppKeys()).toEqual(["trajeto-daily-mode", "trajeto:public-service-favorites:v1"]);
  });

  it("clears Trajeto local and session data without touching another app", async () => {
    localStorage.setItem("trajeto-mobile-destinations", "[]");
    localStorage.setItem("trajeto-mobile-vehicle", "{}");
    localStorage.setItem("trajeto:public-service-favorites:v1", '["sic"]');
    localStorage.setItem("other-app-setting", "keep");
    sessionStorage.setItem("trajeto:public-routing:route:test", "cached");
    sessionStorage.setItem("other-session-key", "keep");

    expect(listSessionAppKeys()).toEqual(["trajeto:public-routing:route:test"]);
    expect(await countLocalAppData()).toBe(4);
    expect(await clearLocalAppData()).toBe(4);
    expect(localStorage.getItem("trajeto-mobile-destinations")).toBeNull();
    expect(localStorage.getItem("trajeto-mobile-vehicle")).toBeNull();
    expect(localStorage.getItem("trajeto:public-service-favorites:v1")).toBeNull();
    expect(sessionStorage.getItem("trajeto:public-routing:route:test")).toBeNull();
    expect(localStorage.getItem("other-app-setting")).toBe("keep");
    expect(sessionStorage.getItem("other-session-key")).toBe("keep");
  });
});


it("exports Trajeto-owned data as a browser download", () => {
  localStorage.setItem("trajeto-daily-mode", "automatico");
  const createObjectURL = vi.fn().mockReturnValue("blob:test");
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  expect(exportLocalAppData()).toBe(true);
  expect(click).toHaveBeenCalled();
  expect(createObjectURL).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  click.mockRestore();
});
