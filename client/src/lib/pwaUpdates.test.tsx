import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup(waiting = true) {
  const reload = vi.fn();
  const worker = { postMessage: vi.fn() };
  const registration = { waiting: waiting ? worker : null, installing: null, update: vi.fn().mockResolvedValue(undefined) };
  const serviceWorker = Object.assign(new EventTarget(), { getRegistration: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) });
  vi.stubGlobal("navigator", { onLine: true, serviceWorker });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { setTimeout, clearTimeout, location: { reload } }));
  return { reload, worker, registration, serviceWorker };
}

it("keeps an already waiting update discoverable after its notification", async () => {
  setup();
  const pwa = await import("./pwa");
  expect(await pwa.checkForAppUpdate()).toBe("available");
  expect(pwa.hasWaitingAppUpdate()).toBe(true);
});

it("does not reload the old application when activation times out", async () => {
  const { reload, worker } = setup();
  const { applyServiceWorkerUpdate } = await import("./pwa");
  const updating = applyServiceWorkerUpdate();
  await vi.advanceTimersByTimeAsync(5000);
  expect(reload).not.toHaveBeenCalled();
  expect(await updating).toBe(false);
  expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  expect(reload).not.toHaveBeenCalled();
});

it("reloads once after the new worker takes control", async () => {
  const { reload, serviceWorker } = setup();
  const { applyServiceWorkerUpdate } = await import("./pwa");
  const updating = applyServiceWorkerUpdate();
  await Promise.resolve();
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  expect(await updating).toBe(true);
  await vi.advanceTimersByTimeAsync(5000);
  expect(reload).toHaveBeenCalledTimes(1);
});

it("reports offline without requesting an update", async () => {
  const { registration } = setup();
  Object.assign(navigator, { onLine: false });
  const { checkForAppUpdate } = await import("./pwa");
  expect(await checkForAppUpdate()).toBe("offline");
  expect(registration.update).not.toHaveBeenCalled();
});

it("does not hang or reload when no update is waiting", async () => {
  const { reload } = setup(false);
  const pwa = await import("./pwa");
  expect(await pwa.checkForAppUpdate()).toBe("current");
  expect(await pwa.applyServiceWorkerUpdate()).toBe(false);
  expect(reload).not.toHaveBeenCalled();
});
