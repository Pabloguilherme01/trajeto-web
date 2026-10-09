import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("Pages: installed worker revision follows route, data, icon and manifest content", async ({ page }) => {
  const output = path.resolve("dist/public");
  const workerSource = readFileSync(path.resolve("client/public/sw.js"), "utf8");
  const baseVersion = workerSource.match(/CACHE_PREFIX \+ "(v\d+)"/)?.[1];
  expect(baseVersion).toBeTruthy();

  const hash = createHash("sha256")
    .update(readFileSync(path.join(output, "offline-assets.json"), "utf8"))
    .update(workerSource);
  const includeData = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) includeData(file);
      else hash.update(path.relative(output, file)).update(readFileSync(file));
    }
  };
  includeData(path.join(output, "data"));
  hash.update(readFileSync(path.join(output, "index.html")));
  for (const asset of [
    "site.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png",
    "icon-512-maskable.png", "icon-1024.png", "robots.txt",
  ]) {
    hash.update(asset).update(readFileSync(path.join(output, asset)));
  }
  const revision = hash.digest("hex").slice(0, 12);
  const expected = `const VERSION = CACHE_PREFIX + "${baseVersion}-${revision}";`;
  const generatedWorker = readFileSync(path.join(output, "sw.js"), "utf8");
  expect(generatedWorker).toContain(expected);

  const published = await page.request.get("sw.js");
  expect(published.ok()).toBe(true);
  expect(await published.text()).toContain(expected);
});
