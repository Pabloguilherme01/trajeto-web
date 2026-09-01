import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, clearRateLimitWindows, clearRateLimitKey } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    clearRateLimitWindows();
  });

  it("permite requisições dentro do limite por minuto", () => {
    const key = "test:user1";
    
    // Primeiras 5 requisições devem ser permitidas (limite padrão)
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloqueia após exceder limite por minuto", () => {
    const key = "test:user2";
    
    // Exceder limite de 5 por minuto
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    
    // Sexta requisição deve ser bloqueada
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeDefined();
    expect(result.retryAfterSeconds!).toBeGreaterThan(0);
    expect(result.retryAfterSeconds!).toBeLessThanOrEqual(60);
  });

  it("bloqueia após exceder limite por hora", () => {
    const key = "test:user3";
    const customConfig = { perMinute: 100, perHour: 5 }; // Limite alto por minuto, baixo por hora
    
    // Exceder limite de 5 por hora
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, customConfig);
    }
    
    // Sexta requisição deve ser bloqueada
    const result = checkRateLimit(key, customConfig);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeDefined();
  });

  it("chaves diferentes têm limites independentes", () => {
    const key1 = "test:userA";
    const key2 = "test:userB";
    
    // Preencher limite da chave 1
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key1);
    }
    
    // Chave 2 ainda deve estar liberada
    const result = checkRateLimit(key2);
    expect(result.allowed).toBe(true);
  });

  it("libera após expirar janela (simulado com cleanup manual)", () => {
    const key = "test:user4";
    
    // Preencher limite
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    
    // Deve estar bloqueado
    expect(checkRateLimit(key).allowed).toBe(false);
    
    // Limpar manualmente para simular passagem de tempo
    clearRateLimitKey(key);
    
    // Agora deve estar liberado
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });

  it("retorna retryAfterSeconds válido quando bloqueado", () => {
    const key = "test:user5";
    
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfterSeconds).toBe("number");
    expect(Number.isInteger(result.retryAfterSeconds)).toBe(true);
  });

  it("aceita configuração customizada", () => {
    const key = "test:user6";
    const customConfig = { perMinute: 2, perHour: 10 };
    
    // Primeira requisição permitida
    expect(checkRateLimit(key, customConfig).allowed).toBe(true);
    // Segunda permitida
    expect(checkRateLimit(key, customConfig).allowed).toBe(true);
    // Terceira bloqueada (limite de 2 por minuto)
    expect(checkRateLimit(key, customConfig).allowed).toBe(false);
  });
});
