import { defineConfig, devices } from "@playwright/test";
import pages from "./playwright.pages.config";

// Engine-based mobile regression: WebKit approximates iPhone Safari and
// Chromium approximates Android Chrome. These are not physical-device tests.
export default defineConfig({
  ...pages,
  testDir: "./e2e-pages",
  testMatch: "mobile-filter-modes-cross-platform.spec.ts",
  projects: [
    {
      name: "android-chrome-pixel7",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    {
      name: "ios-safari-iphone13",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
});
