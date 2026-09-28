import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
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
    manifest: true,
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