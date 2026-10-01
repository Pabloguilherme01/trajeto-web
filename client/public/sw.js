const CACHE_PREFIX = "trajeto-" + encodeURIComponent(new URL(self.registration.scope).pathname) + "-";
const VERSION = CACHE_PREFIX + "v19";
const NETWORK_TIMEOUT_MS = 4000;
const MAX_MAP_ENTRIES = 80;
const STATIC_CACHE = VERSION + "-static";
const DATA_CACHE = VERSION + "-data";
const MAP_CACHE = VERSION + "-map";

const STATIC_SHELL = [
  "./",
  "./index.html",
  "./site.webmanifest",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./icon-1024.png",
  "./robots.txt",
  "./404.html",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async cache => {
        await cache.addAll(STATIC_SHELL);
        const response = await fetch("./index.html?precache=" + VERSION, { cache: "no-store" });
        if (!response.ok) throw new Error("App indisponível");
        const html = await response.text();
        const assets = collectIndexAssets(html);
        await cache.addAll(assets);

        // A public filename keeps the manifest inside the Pages artifact.
        // Installation only succeeds after all route chunks have been saved.
        const manifestResponse = await fetch("./offline-assets.json?precache=" + VERSION, { cache: "no-store" });
        if (!manifestResponse.ok) throw new Error("Pacote offline indisponível");
        const manifest = await manifestResponse.json();
        await cache.addAll(collectManifestAssets(manifest));
        await cache.put("./offline-assets.json", new Response(JSON.stringify(manifest), {
          headers: { "Content-Type": "application/json" },
        }));
      })
      .then(() => caches.open(DATA_CACHE))
      .then(async cache => {
        await cache.addAll(["./data/aguas-lindas-anp.json", "./data/aguas-lindas-anp-precos.json"]);
      })
      .then(() => caches.open(MAP_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== DATA_CACHE && key !== MAP_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "OFFLINE_STATUS" && event.ports?.[0]) {
    event.waitUntil(offlineStatus().then(status => event.ports[0].postMessage(status)));
  }
});

function collectIndexAssets(html) {
  const assets = new Set();
  const matches = html.matchAll(/(?:src|href)="([^"]+)"/g);
  for (const match of matches) {
    const asset = match[1];
    if (!asset || asset.startsWith("data:") || asset.startsWith("#") || asset.startsWith("http:") || asset.startsWith("https:")) continue;
    if (!/\.(?:js|css|png|svg|webmanifest|ico)$/i.test(asset)) continue;
    try {
      const url = new URL(asset, self.location.href);
      if (url.origin === self.location.origin) assets.add(url.toString());
    } catch {}
  }
  return [...assets];
}

function collectManifestAssets(manifest) {
  const assets = new Set();
  const visited = new Set();
  const visit = entry => {
    if (!entry || typeof entry !== "object" || visited.has(entry)) return;
    visited.add(entry);
    if (typeof entry.file === "string") assets.add("./" + entry.file.replace(/^\//, ""));
    for (const css of Array.isArray(entry.css) ? entry.css : []) {
      if (typeof css === "string") assets.add("./" + css.replace(/^\//, ""));
    }
    for (const asset of Array.isArray(entry.assets) ? entry.assets : []) {
      if (typeof asset === "string") assets.add("./" + asset.replace(/^\//, ""));
    }
    for (const key of ["imports", "dynamicImports"]) {
      for (const imported of Array.isArray(entry[key]) ? entry[key] : []) {
        const target = manifest[imported];
        if (target) visit(target);
      }
    }
  };
  for (const entry of Object.values(manifest)) visit(entry);
  return [...assets];
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname === "tile.openstreetmap.org") {
    event.respondWith(tileNetworkFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Private API responses must never enter a shared browser cache.
  if (url.pathname.includes("/api/")) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  if (url.pathname.includes("/data/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.pathname.includes("/maps/") || url.pathname.includes("/tiles/")) {
    event.respondWith(staleWhileRevalidate(request, MAP_CACHE, event));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, event));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await cache.put("./index.html", response.clone());
      return response;
    }

    return (
      await cache.match(request, { ignoreVary: true }) ||
      await cache.match("./index.html", { ignoreVary: true }) ||
      response
    );
  } catch {
    return (
      await cache.match(request, { ignoreVary: true }) ||
      await cache.match("./index.html", { ignoreVary: true }) ||
      new Response("Trajeto indisponível offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  // Versioned static assets are identical for every Origin header.
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then(async response => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  if (event) event.waitUntil(network.then(() => undefined));
  return cached || await network || new Response("", { status: 504 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) await cache.put(request, response.clone());
    if (!response.ok) return await cache.match(request, { ignoreVary: true }) || response;
    return response;
  } catch {
    return (
      await cache.match(request, { ignoreVary: true }) ||
      new Response("Sem conexão. Os dados dessa consulta ainda não foram armazenados neste dispositivo.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}


async function tileNetworkFirst(request) {
  const cache = await caches.open(MAP_CACHE);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok || response.type === "opaque") {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_MAP_ENTRIES)).map(key => cache.delete(key)));
    }
    return response;
  } catch {
    return (
      await cache.match(request, { ignoreVary: true }) ||
      new Response("", { status: 504 })
    );
  }
}

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function offlineStatus() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const response = await cache.match("./offline-assets.json", { ignoreVary: true });
    if (!response) return { ready: false };
    const assets = [...STATIC_SHELL, ...collectManifestAssets(await response.json())];
    const saved = await Promise.all(assets.map(asset => cache.match(asset, { ignoreVary: true })));
    const data = await caches.open(DATA_CACHE);
    const snapshots = await Promise.all(["./data/aguas-lindas-anp.json", "./data/aguas-lindas-anp-precos.json"].map(asset => data.match(asset, { ignoreVary: true })));
    return { ready: saved.every(Boolean) && snapshots.every(Boolean), version: VERSION };
  } catch {
    return { ready: false };
  }
}
