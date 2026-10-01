import fs from "node:fs";

const required = [
  "client/public/sw.js",
  "client/public/data/aguas-lindas-anp.json",
  "client/public/data/aguas-lindas-anp-precos.json",
  "client/src/lib/publicRouting.ts",
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
];

for (const marker of requiredFallbacks) {
  if (!routing.includes(marker)) {
    console.error("Zero-cost core: fallback gratuito ausente:", marker);
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
