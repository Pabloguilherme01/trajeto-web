import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-pages",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174/trajeto-web/",
    trace: "retain-on-failure",
    serviceWorkers: "allow",
  },
  projects: [
    { name: "pages-mobile", use: { ...devices["Pixel 7"] } },
    { name: "pages-desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build:client && npx vite preview --host 127.0.0.1 --port 4174",
    env: { ...process.env, VITE_STATIC_RUNTIME: "true", VITE_BASE_PATH: "/trajeto-web/" },
    url: "http://127.0.0.1:4174/trajeto-web/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
