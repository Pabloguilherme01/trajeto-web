export type RequestBudgetOptions = {
  minIntervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => globalThis.setTimeout(resolve, ms));

export function createRequestBudget(options: RequestBudgetOptions) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const minIntervalMs = Math.max(0, options.minIntervalMs);
  let queue: Promise<void> = Promise.resolve();
  let nextStartAt = 0;

  const run = async <T>(task: () => Promise<T>): Promise<T> => {
    let release!: () => void;
    const previous = queue;
    queue = new Promise<void>(resolve => {
      release = resolve;
    });

    await previous;
    try {
      const waitMs = Math.max(0, nextStartAt - now());
      if (waitMs > 0) await sleep(waitMs);
      nextStartAt = now() + minIntervalMs;
      return await task();
    } finally {
      release();
    }
  };

  const cooldown = (ms: number) => {
    nextStartAt = Math.max(nextStartAt, now() + Math.max(0, ms));
  };

  const reset = () => {
    nextStartAt = 0;
    queue = Promise.resolve();
  };

  return { run, cooldown, reset };
}
