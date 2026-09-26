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

  // The app is normally deployed behind one trusted reverse proxy. Express
  // only trusts the first proxy hop, preventing arbitrary client-supplied
  // X-Forwarded-For values from becoming the rate-limit identity.
  app.set("trust proxy", 1);

  server.requestTimeout = 60_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Origin-Agent-Cluster", "?1");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://forge.butterfly-effect.dev https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' https://forge.butterfly-effect.dev https://*.googleapis.com https://*.gstatic.com https://*.google.com data: blob:; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com; frame-src https://*.google.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com;",
      );
    }
    next();
  });

  // Keep request bodies small. The application does not accept uploads through
  // JSON/form endpoints, so megabyte-sized request bodies only increase DoS risk.
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ limit: "256kb", extended: true, parameterLimit: 100 }));

  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true });
  });

  app.use("/manus-storage", createMemoryRateLimiter({ windowMs: 60_000, max: 60, name: "proxy de armazenamento" }));
  registerStorageProxy(app);
  app.use("/api/oauth/callback", createMemoryRateLimiter({ windowMs: 10 * 60_000, max: 20, name: "OAuth" }));
  registerOAuthRoutes(app);

  app.use("/api/scheduled/operational-alerts", createMemoryRateLimiter({ windowMs: 60_000, max: 10, name: "alertas operacionais" }));
  app.post("/api/scheduled/operational-alerts", runOperationalAlertsSchedule);

  // Public integrations are expensive, while the global limiter prevents
  // abuse of less expensive tRPC procedures that are otherwise easy to spam.
  app.use("/api/trpc", createMemoryRateLimiter({ windowMs: 60_000, max: 240, name: "API" }));
  app.use("/api/trpc", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/api/trpc/routes.plan", createMemoryRateLimiter({ windowMs: 60_000, max: 30, name: "planejamento de rotas" }));
  app.use("/api/trpc/stationDirectory.search", createMemoryRateLimiter({ windowMs: 60_000, max: 45, name: "busca de postos" }));
  app.use("/api/trpc/stationDirectory.details", createMemoryRateLimiter({ windowMs: 60_000, max: 60, name: "detalhes de posto" }));
  app.use("/api/trpc/analytics.track", createMemoryRateLimiter({ windowMs: 60_000, max: 120, name: "telemetria" }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received; shutting down gracefully`);
    server.close(error => {
      if (error) {
        console.error("[server] graceful shutdown failed");
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(error => {
  console.error("[server] startup failed", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
