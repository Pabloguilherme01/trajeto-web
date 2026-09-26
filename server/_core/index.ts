import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runOperationalAlertsSchedule } from "../scheduled/operationalAlerts";
import { createMemoryRateLimiter } from "./rateLimit";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Keep request payloads bounded and add baseline security headers without
  // introducing a runtime dependency just for middleware.
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Frame-Options", "DENY");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https://forge.butterfly-effect.dev https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' https://forge.butterfly-effect.dev https://*.googleapis.com https://*.gstatic.com https://*.google.com data: blob:; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com; frame-src https://*.google.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com;");
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, service: "trajeto-web", timestamp: new Date().toISOString() });
  });
  registerStorageProxy(app);
  // The limiter must precede the callback route so it cannot be bypassed.
  app.use("/api/oauth/callback", createMemoryRateLimiter({ windowMs: 10 * 60_000, max: 20, name: "OAuth" }));
  registerOAuthRoutes(app);
  app.use("/api/scheduled/operational-alerts", createMemoryRateLimiter({ windowMs: 60_000, max: 10, name: "alertas operacionais" }));
  app.post("/api/scheduled/operational-alerts", runOperationalAlertsSchedule);
  // Bound expensive public integrations and anonymous telemetry without adding
  // a runtime dependency. This is intentionally scoped to high-cost procedures.
  app.use("/api/trpc/routes.plan", createMemoryRateLimiter({ windowMs: 60_000, max: 30, name: "planejamento de rotas" }));
  app.use("/api/trpc/stationDirectory.search", createMemoryRateLimiter({ windowMs: 60_000, max: 45, name: "busca de postos" }));
  app.use("/api/trpc/stationDirectory.details", createMemoryRateLimiter({ windowMs: 60_000, max: 60, name: "detalhes de posto" }));
  app.use("/api/trpc/analytics.track", createMemoryRateLimiter({ windowMs: 60_000, max: 120, name: "telemetria" }));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
