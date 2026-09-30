import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

export function createMemoryRateLimiter(options: {
  windowMs: number;
  max: number;
  name?: string;
}) {
  const buckets = new Map<string, Bucket>();
  const name = options.name ?? "request";
  const maxBuckets = 5_000;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      if (buckets.size >= maxBuckets) {
        buckets.forEach((bucket, bucketKey) => {
          if (bucket.resetAt <= now) buckets.delete(bucketKey);
        });
        if (buckets.size >= maxBuckets) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey) buckets.delete(oldestKey);
        }
      }
      current = { count: 1, resetAt: now + options.windowMs };
      buckets.set(key, current);
    } else {
      current.count += 1;
    }

    const remaining = Math.max(0, options.max - current.count);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "too_many_requests",
        message: `Limite de requisições excedido para ${name}. Tente novamente em alguns segundos.`,
      });
    }

    return next();
  };
}
