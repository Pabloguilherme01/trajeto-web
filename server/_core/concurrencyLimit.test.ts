import { describe, expect, it, vi } from "vitest";
import { createConcurrencyLimiter } from "./concurrencyLimit";

function response() {
  const handlers = new Map<string, () => void>();
  const res: any = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    once(name: string, fn: () => void) { handlers.set(name, fn); return this; },
  };
  return { res, emit: (name: string) => handlers.get(name)?.() };
}

describe("createConcurrencyLimiter", () => {
  it("sheds excess work and releases capacity after a response finishes", () => {
    const limiter = createConcurrencyLimiter({ maxConcurrent: 1, name: "Rotas" });
    const first = response();
    const second = response();
    const third = response();
    const next1 = vi.fn();
    const next2 = vi.fn();
    const next3 = vi.fn();

    limiter({} as any, first.res, next1);
    expect(next1).toHaveBeenCalledOnce();

    limiter({} as any, second.res, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(second.res.statusCode).toBe(503);
    expect(second.res.headers["Retry-After"]).toBe("2");
    expect(second.res.body.error).toBe("service_busy");

    first.emit("finish");
    limiter({} as any, third.res, next3);
    expect(next3).toHaveBeenCalledOnce();
  });

  it("releases capacity only once when finish and close both fire", () => {
    const limiter = createConcurrencyLimiter({ maxConcurrent: 1 });
    const first = response();
    limiter({} as any, first.res, vi.fn());
    first.emit("finish");
    first.emit("close");

    const second = response();
    const next = vi.fn();
    limiter({} as any, second.res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
