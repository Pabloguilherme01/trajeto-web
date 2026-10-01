type CircuitState = {
  failures: number;
  openUntil: number;
};

export function createCircuitBreaker(options: {
  failureThreshold: number;
  cooldownMs: number;
}) {
  const state: CircuitState = { failures: 0, openUntil: 0 };

  return {
    canRequest(now = Date.now()) {
      return state.openUntil <= now;
    },
    success() {
      state.failures = 0;
      state.openUntil = 0;
    },
    failure(now = Date.now()) {
      state.failures += 1;
      if (state.failures >= options.failureThreshold) {
        state.openUntil = now + options.cooldownMs;
        state.failures = 0;
      }
    },
    retryAfterMs(now = Date.now()) {
      return Math.max(0, state.openUntil - now);
    },
  };
}
