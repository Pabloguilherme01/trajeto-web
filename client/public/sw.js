const CACHE_PREFIX = "trajeto-" + encodeURIComponent(new URL(self.registration.scope).pathname) + "-";
const VERSION = CACHE_PREFIX + "v27";
const NETWORK_TIMEOUT_MS = 4000;
const STATIC_CACHE = VERSION + "-static";
const DATA_CACHE = VERSION + "-data";
const MAP_CACHE = VERSION + "-map";

const LOCAL_SNAPSHOTS = ["./data/aguas-lindas-anp.json", "./data/aguas-lindas-anp-precos.json", "./data/aguas-lindas-offline-map.json", "./data/aguas-lindas-city-atlas.json"];

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
        await precacheFresh(cache, STATIC_SHELL);
        const response = await fetch("./index.html?precache=" + VERSION, { cache: "no-store" });
        if (!response.ok) throw new Error("App indisponível");
        // Use the same fresh document that identifies this build's assets.
        // The browser's HTTP cache may still contain an older index.html.
        await cache.put("./", response.clone());
        await cache.put("./index.html", response.clone());
        await cache.put("./404.html", response.clone());
        const html = await response.text();
        const assets = collectIndexAssets(html);
        await precacheFresh(cache, assets);

        // A public filename keeps the manifest inside the Pages artifact.
        // Installation only succeeds after all route chunks have been saved.
        const manifestResponse = await fetch("./offline-assets.json?precache=" + VERSION, { cache: "no-store" });
        if (!manifestResponse.ok) throw new Error("Pacote offline indisponível");
        const manifest = await manifestResponse.json();
        await precacheFresh(cache, collectManifestAssets(manifest));
        await cache.put("./offline-assets.json", new Response(JSON.stringify(manifest), {
          headers: { "Content-Type": "application/json" },
        }));
      })
      .then(() => caches.open(DATA_CACHE))
      .then(async cache => {
        await precacheFresh(cache, LOCAL_SNAPSHOTS);
      })
      .then(() => caches.open(MAP_CACHE))
  );
});

function precacheFresh(cache, assets) {
  return cache.addAll(assets.map(asset => new Request(new URL(asset, self.registration.scope), { cache: "reload" })));
}

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
  if (event.data?.type === "RESTORE_OFFLINE" && event.ports?.[0]) {
    event.waitUntil(restoreOfflinePackage().then(status => event.ports[0].postMessage(status)));
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
    event.respondWith(appNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, event));
});

async function appNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  // The active worker owns one complete build. Keep its document pinned until
  // the waiting worker is accepted; live HTML may reference unsaved new chunks.
  const shell = await cache.match("./index.html", { ignoreVary: true });
  if (shell) return shell;
  try {
    return await fetchWithTimeout(request);
  } catch {
    return new Response("Trajeto indisponível offline. Abra com internet para preparar o acesso.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  // Versioned static assets are identical for every Origin header.
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then(async response => {
      if (response.ok) await safeCachePut(cache, request, response);
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
    if (response.ok) await safeCachePut(cache, request, response);
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
    const snapshots = await Promise.all(LOCAL_SNAPSHOTS.map(asset => data.match(asset, { ignoreVary: true })));
    return { ready: saved.every(Boolean) && snapshots.every(Boolean), version: VERSION };
  } catch {
    return { ready: false };
  }
}

async function restoreOfflinePackage() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const manifest = await cache.match("./offline-assets.json", { ignoreVary: true });
    if (!manifest) return { ready: false, reason: "update" };
    // Recover the document from this installed build only. Downloading today's
    // HTML into an older package would mix incompatible versions.
    const shell = await cache.match("./index.html", { ignoreVary: true }) ||
      await cache.match("./", { ignoreVary: true }) || await cache.match("./404.html", { ignoreVary: true });
    if (!shell) return { ready: false, reason: "update" };
    for (const path of ["./", "./index.html", "./404.html"]) {
      if (!await cache.match(path, { ignoreVary: true })) await cache.put(path, shell.clone());
    }
    const assets = [...new Set([...STATIC_SHELL, ...collectManifestAssets(await manifest.json())])];
    const missing = [];
    for (const asset of assets) {
      if (!await cache.match(asset, { ignoreVary: true })) missing.push({ cache, asset });
    }
    const data = await caches.open(DATA_CACHE);
    for (const asset of LOCAL_SNAPSHOTS) {
      if (!await data.match(asset, { ignoreVary: true })) missing.push({ cache: data, asset });
    }
    // Keep downloads bounded on phones. A missing old chunk may have been
    // removed by a deployment: never cache an HTML fallback as JavaScript.
    for (let index = 0; index < missing.length; index += 6) {
      await Promise.all(missing.slice(index, index + 6).map(async ({ cache: target, asset }) => {
        const url = new URL(asset, self.registration.scope);
        if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope) || url.pathname.includes("/api/")) throw new Error("update");
        const response = await fetchWithTimeout(new Request(url, { cache: "reload" }));
        const type = response.headers.get("Content-Type") || "";
        if (!response.ok ||
          (/\.js$/.test(url.pathname) && !/(?:javascript|ecmascript)/i.test(type)) ||
          (/\.css$/.test(url.pathname) && !/text\/css/i.test(type)) ||
          (/\.json$/.test(url.pathname) && !/json/i.test(type))) throw new Error("update");
        if (/\.json$/.test(url.pathname)) await response.clone().json();
        await target.put(asset, response);
      }));
    }
    return await offlineStatus();
  } catch (error) {
    return { ready: false, reason: error?.name === "QuotaExceededError" ? "storage" : error?.message === "update" ? "update" : "connection" };
  }
}


async function safeCachePut(cache, request, response) {
  try {
    await cache.put(request, response.clone());
  } catch {
    // A full or disabled cache must not break a successful network response.
  }
}
