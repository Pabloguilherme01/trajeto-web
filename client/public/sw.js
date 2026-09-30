const VERSION = "trajeto-v15";
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
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async cache => {
        await Promise.all(STATIC_SHELL.map(asset => cache.add(asset).catch(() => undefined)));
        try {
          const response = await fetch("./.vite/manifest.json", { cache: "no-store" });
          if (!response.ok) return;
          const manifest = await response.json();
          await Promise.all(collectManifestAssets(manifest).map(asset => cache.add(asset).catch(() => undefined)));
        } catch {}
      })
      .then(() => caches.open(DATA_CACHE))
      .then(async cache => {
        await Promise.all([
          cache.add("./data/aguas-lindas-anp.json").catch(() => undefined),
          cache.add("./data/aguas-lindas-anp-precos.json").catch(() => undefined),
        ]);
      })
      .then(() => caches.open(MAP_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![STATIC_CACHE, DATA_CACHE, MAP_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function collectManifestAssets(manifest) {
  const assets = new Set();
  const visited = new Set();
  const visit = entry => {
    if (!entry || typeof entry !== "object" || visited.has(entry)) return;
    visited.add(entry);
    if (typeof entry.file === "string") assets.add("./" + entry.file.replace(/^\//, ""));
    for (const css of Array.isArray(entry.css) ? entry.css : []) if (typeof css === "string") assets.add("./" + css.replace(/^\//, ""));
    for (const asset of Array.isArray(entry.assets) ? entry.assets : []) if (typeof asset === "string") assets.add("./" + asset.replace(/^\//, ""));
    for (const key of ["imports","dynamicImports"]) for (const imported of Array.isArray(entry[key]) ? entry[key] : []) {
      const target = manifest[imported];
      if (target) visit(target);
    }
  };
  for (const entry of Object.values(manifest)) visit(entry);
  return [...assets];
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);

  if (url.pathname.includes("/data/")) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
  } else if (url.pathname.includes("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else if (url.pathname.includes("/maps/") || url.pathname.includes("/tiles/")) {
    event.respondWith(staleWhileRevalidate(request, MAP_CACHE));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await cache.put("./index.html", response.clone());
    }
    return response;
  } catch {
    return await cache.match(request) || await cache.match("./index.html") ||
      new Response("Trajeto indisponível offline.", { status: 503, headers: {"Content-Type":"text/plain; charset=utf-8"} });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then(response => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    void refresh;
    return cached;
  }

  const response = await refresh;
  return response || new Response("", { status: 504 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return await cache.match(request) ||
      new Response("Sem conexão. Os dados dessa consulta ainda não foram armazenados neste dispositivo.", { status: 503, headers: {"Content-Type":"text/plain; charset=utf-8"} });
  }
}
