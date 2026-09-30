import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function loadWorker(cached?: Response) {
  const context: Record<string, any> = {
    self: { addEventListener: vi.fn() }, Response,
    caches: { open: async () => ({ match: async () => cached }) },
    fetch: async () => { throw new Error("offline"); },
  };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), context);
  return context;
}

describe("service worker", () => {
  it("parses the shipped script and registers lifecycle handlers", () => {
    const worker = loadWorker();
    expect(worker.self.addEventListener.mock.calls.map((call: any[]) => call[0])).toEqual(["install", "activate", "message", "fetch"]);
  });
  it("collects manifest assets with paths relative to the site", () => {
    const worker = loadWorker();
    expect(Array.from(worker.collectManifestAssets({ entry: { file: "/assets/main.js", css: ["/assets/main.css"], dynamicImports: ["page"] }, page: { file: "assets/page.js" } }))).toEqual(["./assets/main.js", "./assets/main.css", "./assets/page.js"]);
  });
  it("terminates when bundled modules import one another", () => {
    const worker = loadWorker();
    expect(Array.from(worker.collectManifestAssets({ main: { file: "assets/main.js", imports: ["shared"] }, shared: { file: "assets/shared.js", imports: ["main"] } }))).toEqual(["./assets/main.js", "./assets/shared.js"]);
  });
  it("returns an HTTP response when neither network nor cache has an asset", async () => {
    const worker = loadWorker();
    const response = await worker.staleWhileRevalidate(new Request("https://example.com/missing.js"), "static");
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(504);
  });
  it("keeps an already cached asset available offline", async () => {
    const cached = new Response("saved asset");
    const worker = loadWorker(cached);
    expect(await worker.staleWhileRevalidate(new Request("https://example.com/main.js"), "static")).toBe(cached);
  });
});
