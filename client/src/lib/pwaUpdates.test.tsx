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


it("continues first offline preparation when installation takes more than 15 seconds", async () => {
  const registration = { waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) };
  class MockMessageChannel {
    port1: { onmessage: ((event: { data: unknown }) => void) | null; close: ReturnType<typeof vi.fn> };
    port2: { postMessage: (data: unknown) => void; close: ReturnType<typeof vi.fn> };
    constructor() {
      this.port1 = { onmessage: null, close: vi.fn() };
      this.port2 = {
        postMessage: data => this.port1.onmessage?.({ data }),
        close: vi.fn(),
      };
    }
  }
  const worker = {
    postMessage: vi.fn((message: { type?: string }, ports?: Array<{ postMessage: (data: unknown) => void }>) => {
      if (message.type === "RESTORE_OFFLINE") {
        ports?.[0]?.postMessage({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: 1, total: 2 });
        ports?.[0]?.postMessage({ type: "OFFLINE_PROGRESS", stage: "verifying" });
        ports?.[0]?.postMessage({ ready: true });
      }
    }),
  };
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: null as typeof worker | null,
    getRegistration: vi.fn().mockResolvedValue(registration),
    register: vi.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration),
  });
  vi.stubGlobal("navigator", { onLine: true, serviceWorker });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { setTimeout, clearTimeout, location: { reload: vi.fn() } }));
  vi.stubGlobal("MessageChannel", MockMessageChannel);

  const { prepareOfflineAccess } = await import("./pwa");
  const progress = vi.fn();
  const preparing = prepareOfflineAccess(progress);
  await vi.advanceTimersByTimeAsync(20000);
  serviceWorker.controller = worker;
  serviceWorker.dispatchEvent(new Event("controllerchange"));

  await expect(preparing).resolves.toEqual({ ready: true });
  expect(progress).toHaveBeenCalledWith({ stage: "downloading", completed: 1, total: 2 });
  expect(worker.postMessage).toHaveBeenCalledWith(
    { type: "RESTORE_OFFLINE", progress: true },
    expect.any(Array)
  );
});


function setupProgressingOfflineWorker() {
  type Message = Record<string, unknown>;
  let sendToPage: ((message: Message) => void) | undefined;
  class MockMessageChannel {
    port1: { onmessage: ((event: { data: Message }) => void) | null; close: ReturnType<typeof vi.fn> };
    port2: { postMessage: (data: Message) => void; close: ReturnType<typeof vi.fn> };
    constructor() {
      this.port1 = { onmessage: null, close: vi.fn() };
      this.port2 = {
        postMessage: data => this.port1.onmessage?.({ data }),
        close: vi.fn(),
      };
    }
  }
  const worker = {
    postMessage: vi.fn((message: { type: string }, ports?: Array<{ postMessage: (data: Message) => void }>) => {
      if (message.type === "OFFLINE_STATUS") ports?.[0]?.postMessage({ ready: false });
      if (message.type === "RESTORE_OFFLINE") sendToPage = data => ports?.[0]?.postMessage(data);
    }),
  };
  const registration = { waiting: null, update: vi.fn().mockResolvedValue(undefined) };
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: worker,
    getRegistration: vi.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration),
  });
  vi.stubGlobal("navigator", { onLine: true, serviceWorker });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { setTimeout, clearTimeout, location: { reload: vi.fn() } }));
  vi.stubGlobal("MessageChannel", MockMessageChannel);
  return {
    worker,
    send: (data: Message) => {
      if (!sendToPage) throw new Error("RESTORE_OFFLINE was not posted");
      sendToPage(data);
    },
  };
}

it("keeps an actively progressing offline preparation alive beyond 60 seconds", async () => {
  const { worker, send } = setupProgressingOfflineWorker();
  const { prepareOfflineAccess } = await import("./pwa");
  const notify = vi.fn();
  const preparing = prepareOfflineAccess(notify);
  await vi.advanceTimersByTimeAsync(1);
  expect(worker.postMessage).toHaveBeenCalledWith(
    { type: "RESTORE_OFFLINE", progress: true }, expect.any(Array),
  );
  await vi.advanceTimersByTimeAsync(45_000);
  send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: 1, total: 3 });
  await vi.advanceTimersByTimeAsync(45_000);
  send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: 2, total: 3 });
  await vi.advanceTimersByTimeAsync(10_000);
  send({ type: "OFFLINE_PROGRESS", stage: "verifying" });
  send({ ready: true, coreReady: true, businessesReady: true });
  await expect(preparing).resolves.toEqual({ ready: true, coreReady: true, businessesReady: true });
  expect(notify).toHaveBeenCalledWith({ stage: "downloading", completed: 2, total: 3 });
});

it("does not let duplicate progress messages conceal a stalled offline download", async () => {
  const { send } = setupProgressingOfflineWorker();
  const { prepareOfflineAccess } = await import("./pwa");
  const preparing = prepareOfflineAccess(vi.fn());
  await vi.advanceTimersByTimeAsync(1);
  await vi.advanceTimersByTimeAsync(20_000);
  send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: 1, total: 2 });
  await vi.advanceTimersByTimeAsync(40_000);
  send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: 1, total: 2 });
  send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed: -1, total: 2 });
  await vi.advanceTimersByTimeAsync(20_100);
  await expect(preparing).resolves.toEqual({ ready: false, reason: "connection" });
});

it("caps even an active offline preparation at three minutes", async () => {
  const { send } = setupProgressingOfflineWorker();
  const { prepareOfflineAccess } = await import("./pwa");
  const preparing = prepareOfflineAccess(vi.fn());
  await vi.advanceTimersByTimeAsync(1);
  for (let completed = 1; completed <= 4; completed++) {
    await vi.advanceTimersByTimeAsync(40_000);
    send({ type: "OFFLINE_PROGRESS", stage: "downloading", completed, total: 5 });
  }
  await vi.advanceTimersByTimeAsync(20_100);
  await expect(preparing).resolves.toEqual({ ready: false, reason: "connection" });
});
