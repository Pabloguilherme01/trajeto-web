import { consumePrivateLocationHandoff, setPrivateLocationHandoff } from "./locationPrivacy";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLocalAppData, exportLocalAppData, listLocalAppKeys } from "./localData";

describe("localData", () => {
  afterEach(() => localStorage.clear());

  it("lists only Trajeto-owned local keys", () => {
    localStorage.setItem("trajeto-daily-mode", "automatico");
    localStorage.setItem("trajeto:public-service-favorites:v1", '["sic"]');
    localStorage.setItem("other-app-setting", "keep");
    expect(listLocalAppKeys()).toEqual(["trajeto-daily-mode", "trajeto:public-service-favorites:v1"]);
  });

  it("clears Trajeto data without touching another app", () => {
    localStorage.setItem("trajeto-mobile-destinations", "[]");
    localStorage.setItem("trajeto-mobile-vehicle", "{}");
    localStorage.setItem("trajeto:public-service-favorites:v1", '["sic"]');
    localStorage.setItem("other-app-setting", "keep");
    expect(clearLocalAppData()).toBe(3);
    expect(localStorage.getItem("trajeto-mobile-destinations")).toBeNull();
    expect(localStorage.getItem("trajeto-mobile-vehicle")).toBeNull();
    expect(localStorage.getItem("trajeto:public-service-favorites:v1")).toBeNull();
    expect(localStorage.getItem("other-app-setting")).toBe("keep");
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

it("clears session route caches and the pending GPS handoff", () => {
  sessionStorage.clear();
  sessionStorage.setItem("trajeto:public-routing:route:private", "GPS route");
  sessionStorage.setItem("other-app-setting", "keep");
  setPrivateLocationHandoff({ lat: -15.76123, lng: -48.28123 });
  clearLocalAppData();
  expect(sessionStorage.getItem("trajeto:public-routing:route:private")).toBeNull();
  expect(sessionStorage.getItem("other-app-setting")).toBe("keep");
  expect(consumePrivateLocationHandoff()).toBeNull();
  sessionStorage.clear();
});

it("continues cleaning session data when local storage is blocked", () => {
  sessionStorage.setItem("trajeto:public-routing:route:private", "GPS route");
  const blocked = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  try {
    expect(clearLocalAppData()).toBe(1);
    expect(sessionStorage.getItem("trajeto:public-routing:route:private")).toBeNull();
  } finally {
    blocked.mockRestore();
    sessionStorage.clear();
  }
});
