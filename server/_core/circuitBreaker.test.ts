import { describe, expect, it } from "vitest";
import { createCircuitBreaker } from "./circuitBreaker";

describe("createCircuitBreaker", () => {
  it("opens after consecutive failures and recovers after cooldown", () => {
    const circuit = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1_000 });
    circuit.failure(100);
    circuit.failure(200);
    expect(circuit.canRequest(250)).toBe(true);

    circuit.failure(300);
    expect(circuit.canRequest(301)).toBe(false);
    expect(circuit.retryAfterMs(800)).toBe(500);
    expect(circuit.canRequest(1_300)).toBe(true);
  });

  it("resets failure pressure after a successful request", () => {
    const circuit = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 1_000 });
    circuit.failure(100);
    circuit.success();
    circuit.failure(200);
    expect(circuit.canRequest(201)).toBe(true);
  });
});
