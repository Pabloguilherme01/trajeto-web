import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function loadWorker(cached?: Response) {
  const cache = { match: vi.fn(async (_request: unknown, options?: CacheQueryOptions) => options?.ignoreVary ? cached : undefined), put: vi.fn(), keys: vi.fn(async () => []), delete: vi.fn() };
  const context: Record<string, any> = {
    self: { addEventListener: vi.fn(), registration: { scope: "https://example.com/trajeto-web/" }, location: new URL("https://example.com/trajeto-web/sw.js"), clients: { claim: vi.fn() }, skipWaiting: vi.fn() },
    Response, Request, URL, AbortController, setTimeout, clearTimeout,
    caches: { open: vi.fn(async () => cache), keys: vi.fn(async () => []), delete: vi.fn() },
    fetch: vi.fn(async () => { throw new Error("offline"); }),
  };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), context);
  return { ...context, cache };
}

function recoverableWorker(missing: string[]) {
  const worker = loadWorker();
  const absent = new Set(missing);
  const saved = new Map<string, Response>();
  const path = (request: string | Request) => "./" + new URL(typeof request === "string" ? request : request.url, worker.self.registration.scope).pathname.replace("/trajeto-web/", "");
  worker.cache.match.mockImplementation(async (request: string | Request) => {
    const key = path(request);
    if (absent.has(key)) return undefined;
    if (saved.has(key)) return saved.get(key)!.clone();
    if (key === "./offline-assets.json") return new Response(JSON.stringify({ main: { file: "assets/installed.js" } }));
    if (key.endsWith(".json")) return new Response("{}", { headers: { "Content-Type": "application/json" } });
    return new Response(key.endsWith(".js") ? "installed code" : '<script src="./assets/installed.js"></script>', { headers: { "Content-Type": key.endsWith(".js") ? "text/javascript" : "text/html" } });
  });
  worker.cache.put.mockImplementation(async (request: string | Request, response: Response) => { const key = path(request); saved.set(key, response.clone()); absent.delete(key); });
  return { worker, saved };
}

describe("service worker", () => {
  it("bounds offline installation downloads and waits for every asset", async () => {
    const worker = loadWorker();
    let pending = 0;
    let peak = 0;
    const saved: string[] = [];
    const cache = { addAll: vi.fn(async (requests: Request[]) => {
      pending += requests.length;
      peak = Math.max(peak, pending);
      await Promise.resolve();
      saved.push(...requests.map(request => request.url));
      pending -= requests.length;
    }) };
    const assets = Array.from({ length: 11 }, (_, index) => `./assets/part-${index}.js`);
    await worker.precacheFresh(cache, assets);
    expect(peak).toBeLessThanOrEqual(3);
    expect(saved).toEqual(assets.map(asset => new URL(asset, worker.self.registration.scope).href));
    cache.addAll.mockRejectedValueOnce(new Error("network"));
    await expect(worker.precacheFresh(cache, assets)).rejects.toThrow("network");
  });
  it("keeps first install lightweight and defers the full offline package", async () => {
    const worker = loadWorker();
    const saved: string[] = [];
    const put = vi.fn();
    const cache = {
      addAll: vi.fn(async (requests: Request[]) => {
        saved.push(...requests.map(request => request.url));
      }),
      put,
      match: vi.fn(),
    };
    worker.caches.open.mockResolvedValue(cache);
    worker.fetch.mockImplementation(async (input: string | Request) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("offline-assets.json")) {
        return new Response(JSON.stringify({
          main: { file: "assets/main.js", dynamicImports: ["lazy"] },
          lazy: { file: "assets/lazy-route.js" },
        }), { headers: { "Content-Type": "application/json" } });
      }
      return new Response('<script type="module" src="./assets/main.js"></script>', {
        headers: { "Content-Type": "text/html" },
      });
    });

    const install = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "install")[1];
    let completion!: Promise<unknown>;
    install({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;

    expect(saved).toContain("https://example.com/trajeto-web/assets/main.js");
    expect(saved).not.toContain("https://example.com/trajeto-web/assets/lazy-route.js");
    expect(saved).not.toContain("https://example.com/trajeto-web/data/aguas-lindas-offline-map.json");
    expect(put).toHaveBeenCalledWith("./offline-assets.json", expect.any(Response));
  });

  it("registers lifecycle handlers", () => {
    const worker = loadWorker();
    expect(worker.self.addEventListener.mock.calls.map((call: any[]) => call[0])).toEqual(["install", "activate", "message", "fetch"]);
  });
  it("collects manifest assets relative to the hosted site", () => {
    const worker = loadWorker();
    expect(Array.from(worker.collectManifestAssets({ entry: { file: "/assets/main.js", css: ["/assets/main.css"], dynamicImports: ["page"] }, page: { file: "assets/page.js" } }))).toEqual(["./assets/main.js", "./assets/main.css", "./assets/page.js"]);
  });
  it("terminates with cyclic bundled imports", () => {
    const worker = loadWorker();
    expect(Array.from(worker.collectManifestAssets({ main: { file: "assets/main.js", imports: ["shared"] }, shared: { file: "assets/shared.js", imports: ["main"] } }))).toEqual(["./assets/main.js", "./assets/shared.js"]);
  });
  it("returns an HTTP response when neither network nor cache has an asset", async () => {
    const worker = loadWorker();
    expect((await worker.staleWhileRevalidate(new Request("https://example.com/missing.js"), "static")).status).toBe(504);
  });
  it("keeps assets available when cached Origin headers differ", async () => {
    const cached = new Response("saved asset");
    const worker = loadWorker(cached);
    expect(await worker.staleWhileRevalidate(new Request("https://example.com/main.js"), "static")).toBe(cached);
  });
  it("uses the saved snapshot when its server returns 503", async () => {
    const cached = new Response("saved data");
    const worker = loadWorker(cached);
    worker.fetch.mockResolvedValue(new Response("unavailable", { status: 503 }));
    expect(await worker.networkFirst(new Request("https://example.com/data/test.json"), "data")).toBe(cached);
  });
  it("keeps network data usable if storage is full", async () => {
    const worker = loadWorker();
    const response = new Response("online data");
    worker.fetch.mockResolvedValue(response);
    worker.cache.put.mockRejectedValue(new Error("QuotaExceededError"));
    expect(await worker.networkFirst(new Request("https://example.com/data/test.json"), "data")).toBe(response);
  });
  it("warms only same-scope current-route resources and keeps APIs private", async () => {
    const worker = loadWorker();
    worker.fetch.mockImplementation(async (request: Request) => {
      const url = new URL(request.url);
      return new Response(
        url.pathname.endsWith(".json") ? "{}" : "code",
        { headers: { "Content-Type": url.pathname.endsWith(".json") ? "application/json" : "text/javascript" } },
      );
    });

    const result = await worker.cacheCurrentResources([
      "https://example.com/trajeto-web/assets/Stations.js",
      "https://example.com/trajeto-web/data/aguas-lindas-city-atlas.json?v=1",
      "https://example.com/trajeto-web/api/trpc/private",
      "https://other.example/assets/external.js",
    ]);

    expect(result).toEqual({ ready: true, saved: 2 });
    expect(worker.fetch).toHaveBeenCalledTimes(2);
    expect(worker.cache.put).toHaveBeenCalledTimes(2);
    expect(worker.cache.put.mock.calls.map((call: any[]) => String(call[0]))).toContain("./data/aguas-lindas-city-atlas.json");
  });

  it("never intercepts private API requests", () => {
    const worker = loadWorker();
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "fetch")[1];
    const respondWith = vi.fn();
    handler({ request: new Request("https://example.com/trajeto-web/api/trpc/auth.me"), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("does not intercept public OpenStreetMap tile requests", () => {
    const worker = loadWorker();
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "fetch")[1];
    const respondWith = vi.fn();
    handler({
      request: new Request("https://tile.openstreetmap.org/13/2997/4790.png"),
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("cleans only previous cache versions inside this app's scope", async () => {
    const worker = loadWorker();
    worker.caches.keys.mockResolvedValue(["other-app-cache", "trajeto-%2Fother%2F-v18-static", "trajeto-%2Ftrajeto-web%2F-v19-static", "trajeto-%2Ftrajeto-web%2F-v22-static", "trajeto-%2Ftrajeto-web%2F-v22-map", "trajeto-%2Ftrajeto-web%2F-v23-static", "trajeto-%2Ftrajeto-web%2F-v24-static"]);
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "activate")[1];
    let completion: Promise<unknown>;
    handler({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion!;
    expect(worker.caches.delete.mock.calls).toEqual([
      ["trajeto-%2Ftrajeto-web%2F-v19-static"],
      ["trajeto-%2Ftrajeto-web%2F-v22-static"],
      ["trajeto-%2Ftrajeto-web%2F-v22-map"],
      ["trajeto-%2Ftrajeto-web%2F-v23-static"],
      ["trajeto-%2Ftrajeto-web%2F-v24-static"],
    ]);
  });
  it("takes control while old cache cleanup is pending", async () => {
    const worker = loadWorker();
    let finishCleanup!: (keys: string[]) => void;
    worker.caches.keys.mockImplementation(() => new Promise<string[]>(resolve => { finishCleanup = resolve; }));
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "activate")[1];
    let completion!: Promise<unknown>;
    handler({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    expect(worker.self.clients.claim).toHaveBeenCalledOnce();
    finishCleanup([]);
    await completion;
  });
  it("does not announce readiness with a partial offline package", async () => {
    expect(await loadWorker().offlineStatus()).toEqual({ ready: false });
  });
  it("pins the complete installed shell while a new deployment awaits acceptance", async () => {
    const worker = loadWorker(new Response('<script src="./assets/installed.js"></script>'));
    worker.fetch.mockResolvedValue(new Response('<script src="./assets/not-saved.js"></script>'));
    const request = new Request("https://example.com/trajeto-web/servicos?salvos=1");
    expect(await (await worker.appNavigation(request)).clone().text()).toContain("installed.js");
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.cache.put).not.toHaveBeenCalled();
    worker.fetch.mockRejectedValue(new Error("offline"));
    expect(await (await worker.appNavigation(request)).clone().text()).toContain("installed.js");
  });
  it("does not cache a live document into an incomplete older build", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValue(new Response("new live document"));
    expect(await (await worker.appNavigation(new Request("https://example.com/trajeto-web/"))).text()).toBe("new live document");
    expect(worker.cache.put).not.toHaveBeenCalled();
  });
  it("restores a missing route chunk and confirms the complete package", async () => {
    const { worker } = recoverableWorker(["./assets/installed.js"]);
    expect((await worker.offlineStatus()).ready).toBe(false);
    worker.fetch.mockResolvedValue(new Response("installed code", { headers: { "Content-Type": "text/javascript" } }));
    expect((await worker.restoreOfflinePackage()).ready).toBe(true);
    expect(worker.fetch).toHaveBeenCalledTimes(1);
    expect(worker.fetch.mock.calls[0][0].url).toBe("https://example.com/trajeto-web/assets/installed.js");
  });
  it("rejects an HTML fallback when an old chunk was removed by deployment", async () => {
    const { worker, saved } = recoverableWorker(["./assets/installed.js"]);
    worker.fetch.mockResolvedValue(new Response("new HTML", { headers: { "Content-Type": "text/html" } }));
    expect(await worker.restoreOfflinePackage()).toEqual({ ready: false, reason: "update" });
    expect(saved.has("./assets/installed.js")).toBe(false);
  });
  it("never fetches a newer manifest into the installed package", async () => {
    const { worker } = recoverableWorker(["./offline-assets.json"]);
    expect(await worker.restoreOfflinePackage()).toEqual({ ready: false, reason: "update" });
    expect(worker.fetch).not.toHaveBeenCalled();
  });
  it("recovers the installed document from its saved fallback without mixing versions", async () => {
    const { worker, saved } = recoverableWorker(["./index.html"]);
    expect((await worker.restoreOfflinePackage()).ready).toBe(true);
    expect(await saved.get("./index.html")!.text()).toContain("installed.js");
    expect(worker.fetch).not.toHaveBeenCalled();
  });
  it("reports a full cache without claiming the download was saved", async () => {
    const { worker } = recoverableWorker(["./assets/installed.js"]);
    worker.fetch.mockResolvedValue(new Response("installed code", { headers: { "Content-Type": "text/javascript" } }));
    worker.cache.put.mockRejectedValue(Object.assign(new Error("Full"), { name: "QuotaExceededError" }));
    expect(await worker.restoreOfflinePackage()).toEqual({ ready: false, reason: "storage" });
  });
  it("keeps the refreshed document with its new assets when the HTTP cache has an older shell", async () => {
    const worker = loadWorker();
    const stored = new Map<string, Response>();
    const key = (request: string | Request) => new URL(typeof request === "string" ? request : request.url, worker.self.registration.scope).href;
    const fresh = '<html><script src="./assets/new-build.js"></script></html>';
    const addAll = vi.fn(async (requests: Array<string | Request>) => {
      for (const request of requests) stored.set(key(request), new Response("old cached document"));
    });
    worker.caches.open.mockResolvedValue({
      addAll,
      put: async (request: string | Request, response: Response) => { stored.set(key(request), response); },
      match: async (request: string | Request) => stored.get(key(request))?.clone(),
    });
    worker.fetch.mockImplementation(async (url: string) => url.includes("offline-assets.json")
      ? new Response(JSON.stringify({ main: { file: "assets/new-build.js" } }))
      : new Response(fresh, { headers: { "Content-Type": "text/html" } }));
    const install = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "install")[1];
    let completion: Promise<unknown>;
    install({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion!;
    worker.fetch.mockRejectedValue(new Error("offline"));
    for (const path of ["", "index.html", "servicos?salvos=1"]) {
      const response = await worker.appNavigation(new Request(worker.self.registration.scope + path));
      expect(await response.text()).toBe(fresh);
    }
  });
});

it("includes the local street map in offline readiness and recovery", async () => {
  const { worker, saved } = recoverableWorker(["./data/aguas-lindas-offline-map.json"]);
  expect(await worker.offlineStatus()).toMatchObject({ ready: false });
  worker.fetch.mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  expect(await worker.restoreOfflinePackage()).toMatchObject({ ready: true });
  expect(saved.has("./data/aguas-lindas-offline-map.json")).toBe(true);
});


it("serves installed snapshots immediately without a network request", async () => {
  const cached = new Response('{"version":"installed"}');
  const worker = loadWorker(cached);
  expect(await worker.installedSnapshot("./data/aguas-lindas-city-atlas.json")).toBe(cached);
  expect(worker.fetch).not.toHaveBeenCalled();
});

it("uses the installed snapshot for query URLs instead of mixing live data", async () => {
  const worker = loadWorker(new Response('{"version":"installed"}'));
  const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "fetch")[1];
  let response!: Promise<Response>;
  handler({ request: new Request("https://example.com/trajeto-web/data/aguas-lindas-city-atlas.json?v=new"), respondWith: (value: Promise<Response>) => { response = value; } });
  expect(await (await response).text()).toContain("installed");
  expect(worker.fetch).not.toHaveBeenCalled();
});
