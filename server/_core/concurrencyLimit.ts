import type { NextFunction, Request, Response } from "express";

export function createConcurrencyLimiter(options: {
  maxConcurrent: number;
  name?: string;
  retryAfterSeconds?: number;
}) {
  let active = 0;
  const name = options.name ?? "serviço";
  const retryAfter = Math.max(1, options.retryAfterSeconds ?? 2);

  return (req: Request, res: Response, next: NextFunction) => {
    if (active >= options.maxConcurrent) {
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("Cache-Control", "no-store");
      return res.status(503).json({
        error: "service_busy",
        message: `${name} está com alta demanda. Tente novamente em alguns segundos.`,
      });
    }

    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
    };

    res.once("finish", release);
    res.once("close", release);
    next();
  };
}
