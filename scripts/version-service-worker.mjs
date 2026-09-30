import { readFile, writeFile } from "node:fs/promises";

const output = new URL("../dist/public/sw.js", import.meta.url);
const source = await readFile(output, "utf8");

const buildId = process.env.GITHUB_SHA?.slice(0, 12)
  || new Date().toISOString().replace(/\D/g, "").slice(0, 14);

const next = source.replace(
  /const VERSION = "[^"]+";/,
  `const VERSION = "trajeto-${buildId}";`,
);

if (next === source) {
  throw new Error("Service worker version marker not found.");
}

await writeFile(output, next, "utf8");
console.log("Service worker cache version:", "trajeto-" + buildId);
