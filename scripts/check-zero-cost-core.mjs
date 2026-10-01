import fs from "node:fs";

const required = [
  "client/public/sw.js",
  "client/public/data/aguas-lindas-anp.json",
  "client/public/data/aguas-lindas-anp-precos.json",
  "client/src/lib/publicRouting.ts",
  "client/src/components/TileStationMap.tsx",
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error("Zero-cost core: arquivo obrigatório ausente:", file);
    process.exitCode = 1;
  }
}

const routing = fs.readFileSync("client/src/lib/publicRouting.ts", "utf8");
const requiredFallbacks = [
  "nominatim.openstreetmap.org",
  "router.project-osrm.org",
  "local-estimate",
  "VITE_PUBLIC_GEOCODER_URL",
  "VITE_PUBLIC_ROUTING_URL",
];

for (const marker of requiredFallbacks) {
  if (!routing.includes(marker)) {
    console.error("Zero-cost core: fallback gratuito ausente:", marker);
    process.exitCode = 1;
  }
}

const tileMap = fs.readFileSync("client/src/components/TileStationMap.tsx", "utf8");
for (const marker of [
  "tile.openstreetmap.org/{z}/{x}/{y}.png",
  "VITE_PUBLIC_TILE_URL",
  'referrerPolicy="origin"',
]) {
  if (!tileMap.includes(marker)) {
    console.error("Zero-cost core: integração sustentável de tiles ausente:", marker);
    process.exitCode = 1;
  }
}

const authHook = fs.readFileSync("client/src/_core/hooks/useAuth.ts", "utf8");
if (
  !authHook.includes("supportsBackendAuth()") ||
  !authHook.includes("enabled: canUseBackendAuth") ||
  !authHook.includes("if (!canUseBackendAuth) return;")
) {
  console.error("Zero-cost core: autenticação de backend deve permanecer desabilitada no runtime estático.");
  process.exitCode = 1;
}

const publicIndex = fs.readFileSync("client/index.html", "utf8");
const forbiddenStaticSdks = [
  "maps.googleapis.com/maps/api/js",
  "api.mapbox.com/mapbox-gl-js",
];

for (const sdk of forbiddenStaticSdks) {
  if (publicIndex.includes(sdk)) {
    console.error("Zero-cost core: HTML público passou a carregar SDK comercial:", sdk);
    process.exitCode = 1;
  }
}

const serviceWorker = fs.readFileSync("client/public/sw.js", "utf8");
if (serviceWorker.includes("tile.openstreetmap.org")) {
  console.error("Zero-cost core: service worker não deve criar cache offline de tiles públicos do OSM.");
  process.exitCode = 1;
}

for (const snapshot of [
  "./data/aguas-lindas-anp.json",
  "./data/aguas-lindas-anp-precos.json",
]) {
  if (!serviceWorker.includes(snapshot)) {
    console.error("Zero-cost core: snapshot essencial deixou de ser preparado offline:", snapshot);
    process.exitCode = 1;
  }
}

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
if (!workflow.includes('VITE_STATIC_RUNTIME: "true"')) {
  console.error("Zero-cost core: GitHub Pages deve permanecer em runtime estático.");
  process.exitCode = 1;
}

const forbiddenSecretRefs = [
  "BUILT_IN_FORGE_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "MAPBOX_ACCESS_TOKEN",
];

for (const secret of forbiddenSecretRefs) {
  if (workflow.includes(secret)) {
    console.error("Zero-cost core: deploy público passou a exigir segredo comercial:", secret);
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.log("Zero-cost core: OK");
