import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function loadWorker(cached?: Response) {
  const cache = { match: vi.fn(async (_request: unknown, options?: CacheQueryOptions) => options?.ignoreVary ? cached : undefined), put: vi.fn(), keys: vi.fn(async () => []), delete: vi.fn() };
  const context: Record<string, any> = {
    self: { addEventListener: vi.fn(), registration: { scope: "https://example.com/trajeto-web/" }, location: new URL("https://example.com/trajeto-web/sw.js"), clients: { claim: vi.fn() }, skipWaiting: vi.fn() },
    Response, URL, AbortController, setTimeout, clearTimeout,
    caches: { open: vi.fn(async () => cache), keys: vi.fn(async () => []), delete: vi.fn() },
    fetch: vi.fn(async () => { throw new Error("offline"); }),
  };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), context);
  return { ...context, cache };
}

describe("service worker", () => {
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
  it("never intercepts private API requests", () => {
    const worker = loadWorker();
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "fetch")[1];
    const respondWith = vi.fn();
    handler({ request: new Request("https://example.com/trajeto-web/api/trpc/auth.me"), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("cleans only previous cache versions inside this app's scope", async () => {
    const worker = loadWorker();
    worker.caches.keys.mockResolvedValue(["other-app-cache", "trajeto-%2Fother%2F-v18-static", "trajeto-%2Ftrajeto-web%2F-v18-static", "trajeto-%2Ftrajeto-web%2F-v19-static"]);
    const handler = worker.self.addEventListener.mock.calls.find((call: any[]) => call[0] === "activate")[1];
    let completion: Promise<unknown>;
    handler({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion!;
    expect(worker.caches.delete.mock.calls).toEqual([["trajeto-%2Ftrajeto-web%2F-v18-static"]]);
  });
  it("does not announce readiness with a partial offline package", async () => {
    expect(await loadWorker().offlineStatus()).toEqual({ ready: false });
  });
});
