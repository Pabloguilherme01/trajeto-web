/**
 * Rate Limiting simples em memória para proteger contra abuso e custo excessivo.
 * 
 * Não usa dependências externas.
 * Testável como módulo isolado.
 * Permite janela por minuto e por hora.
 * Limpa entradas antigas sob demanda.
 */

type RateLimitWindow = {
  timestamps: number[];
  lastCleanup: number;
};

type RateLimitConfig = {
  perMinute: number;
  perHour: number;
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  perMinute: 5,
  perHour: 30,
  windowMs: 60000, // 1 minuto para cleanup
};

const windows = new Map<string, RateLimitWindow>();

/**
 * Verifica se uma requisição é permitida baseado no rate limit.
 * 
 * @param key - Chave única (ex: IP:userId)
 * @param config - Configuração opcional de limites
 * @returns Objeto indicando se permitido e tempo de retry se bloqueado
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; retryAfterSeconds?: number } {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  
  let window = windows.get(key);
  
  // Criar nova janela se não existir
  if (!window) {
    window = { timestamps: [], lastCleanup: now };
    windows.set(key, window);
  }
  
  // Cleanup periódico (a cada windowMs)
  if (now - window.lastCleanup > effectiveConfig.windowMs) {
    window.timestamps = window.timestamps.filter(ts => now - ts < 3600000); // Manter apenas última hora
    window.lastCleanup = now;
  }
  
  // Filtrar timestamps dentro das janelas
  const minuteAgo = now - 60000;
  const hourAgo = now - 3600000;
  
  const requestsLastMinute = window.timestamps.filter(ts => ts > minuteAgo).length;
  const requestsLastHour = window.timestamps.filter(ts => ts > hourAgo).length;
  
  // Verificar limites
  if (requestsLastMinute >= effectiveConfig.perMinute) {
    const oldestInMinute = window.timestamps.find(ts => ts > minuteAgo) ?? now;
    const retryAfter = Math.ceil((oldestInMinute + 60000 - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }
  
  if (requestsLastHour >= effectiveConfig.perHour) {
    const oldestInHour = window.timestamps.find(ts => ts > hourAgo) ?? now;
    const retryAfter = Math.ceil((oldestInHour + 3600000 - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }
  
  // Registrar timestamp
  window.timestamps.push(now);
  return { allowed: true };
}

/**
 * Limpa todas as janelas de rate limit.
 * Útil para testes.
 */
export function clearRateLimitWindows(): void {
  windows.clear();
}

/**
 * Remove uma chave específica do rate limit.
 */
export function clearRateLimitKey(key: string): void {
  windows.delete(key);
}
