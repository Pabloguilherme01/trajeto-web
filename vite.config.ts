import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), {
    name: "version-offline-package",
    apply: "build",
    closeBundle() {
      const output = path.resolve(root, "dist/public");
      // closeBundle also runs after a failed build; preserve its real error.
      if (!existsSync(path.join(output, "offline-assets.json"))) return;
      const manifest = readFileSync(path.join(output, "offline-assets.json"), "utf8");
      const worker = path.join(output, "sw.js");
      const source = readFileSync(worker, "utf8");
      const hash = createHash("sha256").update(manifest).update(source);
      // Public snapshots are copied outside the Vite manifest. Data-only
      // releases must also prepare a fresh, internally consistent offline build.
      const include = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) include(file);
          else hash.update(path.relative(output, file)).update(readFileSync(file));
        }
      };
      include(path.join(output, "data"));
      hash.update(readFileSync(path.join(output, "index.html")));
      const revision = hash.digest("hex").slice(0, 12);
      writeFileSync(worker, source.replace(/CACHE_PREFIX \+ "(v\d+)"/, (_match, version) => `CACHE_PREFIX + "${version}-${revision}"`));
    },
  }],
  resolve: {
    alias: {
      "@": path.resolve(root, "client", "src"),
      "@shared": path.resolve(root, "shared"),
      "@assets": path.resolve(root, "attached_assets"),
    },
  },
  envDir: root,
  root: path.resolve(root, "client"),
  publicDir: path.resolve(root, "client", "public"),
  build: {
    manifest: "offline-assets.json",
    outDir: path.resolve(root, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@trpc") || id.includes("@tanstack/react-query") || id.includes("superjson")) return "vendor-data";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("sonner")) return "vendor-feedback";
          if (id.includes("@radix-ui") || id.includes("react-day-picker") || id.includes("react-resizable-panels") || id.includes("react-hook-form") || id.includes("cmdk") || id.includes("vaul")) return "vendor-ui";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "vendor-react";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
