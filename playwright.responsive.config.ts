import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "responsive-layout.spec.ts",
  projects: [
    { name: "responsive-chromium", use: { browserName: "chromium" } },
    { name: "responsive-firefox", use: { browserName: "firefox" } },
    { name: "responsive-webkit", use: { browserName: "webkit" } },
  ],
});
