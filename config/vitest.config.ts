import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "src", "client"),
      "@shared": path.resolve(templateRoot, "src", "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["src/server/**/*.test.ts", "src/server/**/*.spec.ts", "src/client/**/*.test.ts", "src/client/**/*.spec.ts", "src/client/**/*.test.tsx", "src/client/**/*.spec.tsx"],
  },
});
