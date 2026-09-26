import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "./rateLimit";

function response() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: null as unknown,
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    headers,
  };
}

describe("memory rate limiter", () => {
  it("blocks the request immediately after the configured limit", () => {
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 2, name: "teste" });
    const req = { ip: "127.0.0.10", socket: { remoteAddress: "127.0.0.10" } } as never;
    let nextCalls = 0;

    const first = response();
    limiter(req, first as never, () => { nextCalls += 1; });
    const second = response();
    limiter(req, second as never, () => { nextCalls += 1; });
    const third = response();
    limiter(req, third as never, () => { nextCalls += 1; });

    expect(nextCalls).toBe(2);
    expect(third.statusCode).toBe(429);
    expect(third.body).toEqual({
      error: "too_many_requests",
      message: "Limite de requisições excedido para teste. Tente novamente em alguns segundos.",
    });
    expect(third.headers.get("Retry-After")).toBeTruthy();
  });
});
