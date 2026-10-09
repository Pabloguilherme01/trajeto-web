import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { forProcedure } from "./procedureMiddleware";
import { createMemoryRateLimiter } from "./rateLimit";
import { createConcurrencyLimiter } from "./concurrencyLimit";
function response() {
  const res: any = new EventEmitter();
  res.setHeader = vi.fn(); res.status = vi.fn(() => res); res.json = vi.fn(() => res);
  return res;
}
it("applies limits to single, batched and encoded procedure paths", () => {
  const middleware = vi.fn((_req, _res, next) => next());
  const protectedHandler = forProcedure("routes.plan", middleware);
  for (const path of ["/routes.plan", "/other,routes.plan", "/other%2Croutes.plan", "/routes.plan,routes.plan"]) {
    protectedHandler({ path } as any, response(), vi.fn());
  }
  expect(middleware).toHaveBeenCalledTimes(5);
  protectedHandler({ path: "/routes.planner" } as any, response(), vi.fn());
  expect(middleware).toHaveBeenCalledTimes(5);
});
it("counts each protected procedure in the rate budget and stops a refused request", () => {
  const handler = forProcedure("routes.plan", createMemoryRateLimiter({ windowMs: 60000, max: 1 }));
  const res = response(); const next = vi.fn();
  handler({ path: "/routes.plan,routes.plan", ip: "test" } as any, res, next);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(next).not.toHaveBeenCalled();
});
it("counts batched work in concurrency limits and releases every acquired slot", () => {
  const handler = forProcedure("routes.plan", createConcurrencyLimiter({ maxConcurrent: 2 }));
  const first = response(); const next = vi.fn();
  handler({ path: "/routes.plan,routes.plan" } as any, first, next);
  expect(next).toHaveBeenCalledOnce();
  const second = response();
  handler({ path: "/other,routes.plan" } as any, second, vi.fn());
  expect(second.status).toHaveBeenCalledWith(503);
  first.emit("finish"); first.emit("close");
  const released = vi.fn();
  handler({ path: "/routes.plan" } as any, response(), released);
  expect(released).toHaveBeenCalledOnce();
});
