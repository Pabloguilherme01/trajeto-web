import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-compat",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4175/trajeto-web/",
    trace: "retain-on-failure",
    serviceWorkers: "allow",
    locale: "pt-BR",
  },
  projects: [
    {
      name: "compat-chromium-android",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    {
      name: "compat-webkit-iphone",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "compat-firefox-mobile",
      use: { browserName: "firefox", viewport: { width: 390, height: 844 } },
    },
    {
      name: "compat-webkit-tablet",
      use: { browserName: "webkit", viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: {
    command: "npm run build:client && npx vite preview --host 127.0.0.1 --port 4175",
    env: {
      ...process.env,
      VITE_STATIC_RUNTIME: "true",
      VITE_BASE_PATH: "/trajeto-web/",
    },
    url: "http://127.0.0.1:4175/trajeto-web/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
