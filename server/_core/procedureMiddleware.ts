import type { RequestHandler } from "express";

/** Express prefix mounts miss tRPC requests that combine multiple procedures. */
export function forProcedure(procedure: string, middleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    let path: string;
    try { path = decodeURIComponent(req.path.replace(/^\//, "")); }
    catch { return next(); }
    const count = path.split(",").filter(value => value === procedure).length;
    let remaining = count;
    const advance = (error?: unknown) => {
      if (error) return next(error);
      if (remaining-- > 0) return middleware(req, res, advance);
      next();
    };
    advance();
  };
}
