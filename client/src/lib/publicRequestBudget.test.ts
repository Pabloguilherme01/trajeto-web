import { describe, expect, it, vi } from "vitest";
import { createRequestBudget } from "./publicRequestBudget";

describe("createRequestBudget", () => {
  it("serializes tasks and spaces request starts", async () => {
    let now = 0;
    const sleeps: number[] = [];
    const starts: number[] = [];
    const budget = createRequestBudget({
      minIntervalMs: 1000,
      now: () => now,
      sleep: async ms => {
        sleeps.push(ms);
        now += ms;
      },
    });

    await budget.run(async () => {
      starts.push(now);
    });
    await budget.run(async () => {
      starts.push(now);
    });

    expect(starts).toEqual([0, 1000]);
    expect(sleeps).toEqual([1000]);
  });

  it("coalesces cooldown with the normal interval", async () => {
    let now = 100;
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });
    const budget = createRequestBudget({
      minIntervalMs: 1000,
      now: () => now,
      sleep,
    });

    await budget.run(async () => undefined);
    budget.cooldown(5000);
    await budget.run(async () => undefined);

    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("releases the queue when a task fails", async () => {
    let now = 0;
    const budget = createRequestBudget({
      minIntervalMs: 0,
      now: () => now,
      sleep: async ms => {
        now += ms;
      },
    });

    await expect(
      budget.run(async () => {
        throw new Error("provider failed");
      })
    ).rejects.toThrow("provider failed");

    await expect(budget.run(async () => "ok")).resolves.toBe("ok");
  });
});
