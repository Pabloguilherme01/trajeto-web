import { and, gte, lte } from "drizzle-orm";
import type { Sql } from "drizzle-orm";
import { getDb } from "../db";
import { anpSyncRuns, fuelPriceSnapshots, productEvents, providerMetricSamples, redemptions, routeSearches } from "../../drizzle/schema";

/**
 * Módulo de métricas de produto do Trajeto.
 * 
 * Funções puras e testáveis para calcular indicadores agregados.
 * Não faz chamadas externas nem depende de estado global.
 * Todos os dados devem ser passados como parâmetros.
 */

// ============================================================================
// TIPOS
// ============================================================================

export type ProviderHealthSummary = {
  provider: "google_maps" | "tomtom" | "anp";
  operation: string;
  count: number;
  averageMs: number;
  p95Ms: number;
  successRate: number;
  latestAt: Date;
  health: {
    state: "healthy" | "attention" | "alert" | "observing";
    label: "Saudável" | "Atenção" | "Alerta" | "Amostra inicial";
    detail: string;
  };
};

export type MetricsSummary = {
  periodDays: number;
  routeSearches: number;
  redemptions: number;
  routeToRedemptionConversion: number;
  anpCoverage: number;
  recommendationAdoption: number;
  providerHealth: ProviderHealthSummary[];
  anpSync: {
    lastSyncAt: Date | null;
    lastStatus: "updated" | "fallback" | "failed" | null;
    lastImported: number;
    daysSinceSync: number | null;
  } | null;
};

export type RouteSearchSample = {
  id: number;
  createdAt: Date;
};

export type RedemptionSample = {
  id: number;
  requestedAt: Date;
  routeSearchId: number;
};

export type ProductEventSample = {
  event: string;
  createdAt: Date;
  region?: string | null;
};

export type ProviderMetricSample = {
  provider: "google_maps" | "tomtom" | "anp";
  operation: string;
  durationMs: number;
  success: boolean;
  statusCode?: number | null;
  createdAt: Date;
};

export type AnpSyncSample = {
  dataset: "authorized_stations" | "price_references";
  status: "updated" | "fallback" | "failed";
  imported: number;
  attemptedAt: Date;
};

// ============================================================================
// FUNÇÕES DE CÁLCULO DE MÉTRICAS
// ============================================================================

/**
 * Calcula conversão de rotas pesquisadas para resgates solicitados.
 * 
 * @param routesCount - Número de rotas pesquisadas no período
 * @param redemptionsCount - Número de resgates solicitados no período
 * @returns Percentual de conversão (0-100), ou 0 se não houver rotas
 */
export function calcRouteToRedemptionConversion(routesCount: number, redemptionsCount: number): number {
  if (!Number.isFinite(routesCount) || routesCount <= 0) return 0;
  if (!Number.isFinite(redemptionsCount) || redemptionsCount < 0) return 0;
  
  const conversion = (redemptionsCount / routesCount) * 100;
  return Math.min(100, Math.max(0, Number(conversion.toFixed(2))));
}

/**
 * Calcula cobertura de preços ANP nas paradas exibidas.
 * 
 * @param pricedStopsCount - Número de paradas com preço ANP vinculado
 * @param totalStopsCount - Número total de paradas exibidas
 * @returns Percentual de cobertura (0-100), ou 0 se não houver paradas
 */
export function calcAnpCoverage(pricedStopsCount: number, totalStopsCount: number): number {
  if (!Number.isFinite(totalStopsCount) || totalStopsCount <= 0) return 0;
  if (!Number.isFinite(pricedStopsCount) || pricedStopsCount < 0) return 0;
  
  const coverage = (pricedStopsCount / totalStopsCount) * 100;
  return Math.min(100, Math.max(0, Number(coverage.toFixed(2))));
}

/**
 * Calcula adoção da recomendação com base em eventos agregados.
 * 
 * @param recommendationRequested - Número de vezes que resgate foi solicitado no posto recomendado
 * @param recommendationShown - Número de vezes que recomendação foi exibida
 * @returns Percentual de adoção (0-100), ou 0 se não houver amostra
 */
export function calcRecommendationAdoption(recommendationRequested: number, recommendationShown: number): number {
  if (!Number.isFinite(recommendationShown) || recommendationShown <= 0) return 0;
  if (!Number.isFinite(recommendationRequested) || recommendationRequested < 0) return 0;
  
  const adoption = (recommendationRequested / recommendationShown) * 100;
  return Math.min(100, Math.max(0, Number(adoption.toFixed(2))));
}

/**
 * Calcula percentil 95 de uma distribuição de valores.
 * 
 * @param values - Array de números para calcular o percentil
 * @returns Valor do percentil 95, ou 0 se array vazio
 */
export function calcP95(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((sorted.length - 1) * 0.95);
  return sorted[index] ?? sorted[sorted.length - 1];
}

/**
 * Calcula taxa de sucesso de requisições.
 * 
 * @param totalSamples - Total de amostras
 * @param successSamples - Número de requisições bem-sucedidas
 * @returns Percentual de sucesso (0-100), ou 0 se não houver amostras
 */
export function calcSuccessRate(totalSamples: number, successSamples: number): number {
  if (!Number.isFinite(totalSamples) || totalSamples <= 0) return 0;
  if (!Number.isFinite(successSamples) || successSamples < 0) return 0;
  
  const rate = (successSamples / totalSamples) * 100;
  return Math.min(100, Math.max(0, Number(rate.toFixed(2))));
}

// ============================================================================
// CLASSIFICAÇÃO DE SAÚDE DO PROVEDOR
// ============================================================================

const PROVIDER_HEALTH_THRESHOLDS = {
  minimumSamples: 3,
  attentionP95Ms: 1_500,
  alertP95Ms: 3_000,
  attentionSuccessRate: 99,
  alertSuccessRate: 95,
} as const;

export function classifyProviderHealth(input: { count: number; successRate: number; p95Ms: number }) {
  const { count, successRate, p95Ms } = input;
  
  if (count < PROVIDER_HEALTH_THRESHOLDS.minimumSamples) {
    return {
      state: "observing" as const,
      label: "Amostra inicial" as const,
      detail: `Aguardando pelo menos ${PROVIDER_HEALTH_THRESHOLDS.minimumSamples} amostras para classificar o provedor.`,
    };
  }
  
  if (successRate < PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate || p95Ms >= PROVIDER_HEALTH_THRESHOLDS.alertP95Ms) {
    return {
      state: "alert" as const,
      label: "Alerta" as const,
      detail: successRate < PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate
        ? `Taxa de sucesso abaixo de ${PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate}%.`
        : `p95 acima de ${PROVIDER_HEALTH_THRESHOLDS.alertP95Ms.toLocaleString("pt-BR")} ms.`,
    };
  }
  
  if (successRate < PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate || p95Ms >= PROVIDER_HEALTH_THRESHOLDS.attentionP95Ms) {
    return {
      state: "attention" as const,
      label: "Atenção" as const,
      detail: successRate < PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate
        ? `Taxa de sucesso abaixo de ${PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate}%.`
        : `p95 acima de ${PROVIDER_HEALTH_THRESHOLDS.attentionP95Ms.toLocaleString("pt-BR")} ms.`,
    };
  }
  
  return {
    state: "healthy" as const,
    label: "Saudável" as const,
    detail: "p95 e taxa de sucesso dentro das faixas observadas.",
  };
}

// ============================================================================
// RESUMO DE MÉTRICAS DO PERÍODO
// ============================================================================

/**
 * Combina métricas em um objeto pronto para a UI.
 * Função determinística que não faz chamadas externas.
 * 
 * @param params - Dados agregados do período
 * @returns Resumo de métricas calculadas
 */
export function summarizeMetricsPeriod(params: {
  periodDays: number;
  routes: RouteSearchSample[];
  redemptions: RedemptionSample[];
  events: ProductEventSample[];
  providerSamples: ProviderMetricSample[];
  anpSyncs: AnpSyncSample[];
  pricedStopsCount?: number;
  totalStopsCount?: number;
}): MetricsSummary {
  const {
    periodDays,
    routes,
    redemptions,
    events,
    providerSamples,
    anpSyncs,
    pricedStopsCount = 0,
    totalStopsCount = 0,
  } = params;
  
  // Contagens básicas
  const routeSearchesCount = routes.length;
  const redemptionsCount = redemptions.length;
  
  // Conversão rota → resgate
  const routeToRedemptionConversion = calcRouteToRedemptionConversion(routeSearchesCount, redemptionsCount);
  
  // Cobertura ANP
  const anpCoverage = calcAnpCoverage(pricedStopsCount, totalStopsCount);
  
  // Adoção da recomendação
  const recommendationShownEvents = events.filter(e => e.event === "recommendation_shown").length;
  const recommendationRequestedEvents = events.filter(e => e.event === "recommendation_requested").length;
  const recommendationAdoption = calcRecommendationAdoption(recommendationRequestedEvents, recommendationShownEvents);
  
  // Saúde dos provedores (agrupado por provider + operation)
  const providerHealthMap = new Map<string, ProviderMetricSample[]>();
  for (const sample of providerSamples) {
    const key = `${sample.provider}-${sample.operation}`;
    const existing = providerHealthMap.get(key) ?? [];
    providerHealthMap.set(key, [...existing, sample]);
  }
  
  const providerHealth: ProviderHealthSummary[] = Array.from(providerHealthMap.entries()).map(([key, samples]) => {
    const [provider, operation] = key.split("-") as ["google_maps" | "tomtom" | "anp", string];
    const count = samples.length;
    const successSamples = samples.filter(s => s.success).length;
    const durations = samples.map(s => s.durationMs);
    const averageMs = durations.length > 0
      ? Number((durations.reduce((sum, val) => sum + val, 0) / durations.length).toFixed(0))
      : 0;
    const p95Ms = calcP95(durations);
    const successRate = calcSuccessRate(count, successSamples);
    const latestAt = samples.reduce((latest, current) => 
      current.createdAt > latest ? current.createdAt : latest, 
      new Date(0)
    );
    
    return {
      provider,
      operation,
      count,
      averageMs,
      p95Ms,
      successRate,
      latestAt,
      health: classifyProviderHealth({ count, successRate, p95Ms }),
    };
  });
  
  // Última sincronização ANP
  const priceReferenceSyncs = anpSyncs.filter(s => s.dataset === "price_references");
  const lastSync = priceReferenceSyncs.length > 0
    ? priceReferenceSyncs.reduce((latest, current) => 
        current.attemptedAt > latest.attemptedAt ? current : latest
      )
    : null;
  
  const now = new Date();
  const daysSinceSync = lastSync
    ? Math.floor((now.getTime() - lastSync.attemptedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  return {
    periodDays,
    routeSearches: routeSearchesCount,
    redemptions: redemptionsCount,
    routeToRedemptionConversion,
    anpCoverage,
    recommendationAdoption,
    providerHealth,
    anpSync: lastSync ? {
      lastSyncAt: lastSync.attemptedAt,
      lastStatus: lastSync.status,
      lastImported: lastSync.imported,
      daysSinceSync,
    } : null,
  };
}

// ============================================================================
// FUNÇÕES DE BANCO DE DADOS (para uso no router)
// ============================================================================

/**
 * Busca amostras de métricas do banco de dados para um período.
 * Esta função faz chamadas ao banco e deve ser usada apenas no backend.
 * 
 * @param periodDays - Número de dias para buscar (7, 14, 30)
 * @returns Dados brutos para passar para summarizeMetricsPeriod
 */
export async function fetchMetricsSamples(periodDays: number) {
  const db = await getDb();
  if (!db) {
    return {
      routes: [],
      redemptions: [],
      events: [],
      providerSamples: [],
      anpSyncs: [],
    };
  }
  
  const now = new Date();
  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const [routes, redemptions, events, providerSamples, anpSyncs] = await Promise.all([
    // Rotas pesquisadas
    db.select({
      id: routeSearches.id,
      createdAt: routeSearches.createdAt,
    })
      .from(routeSearches)
      .where(gte(routeSearches.createdAt, startDate)),
    
    // Resgates solicitados
    db.select({
      id: redemptions.id,
      requestedAt: redemptions.requestedAt,
      routeSearchId: redemptions.routeSearchId,
    })
      .from(redemptions)
      .where(gte(redemptions.requestedAt, startDate)),
    
    // Eventos de produto
    db.select({
      event: productEvents.event,
      createdAt: productEvents.createdAt,
      region: productEvents.region,
    })
      .from(productEvents)
      .where(gte(productEvents.createdAt, startDate)),
    
    // Amostras de provedores
    db.select({
      provider: providerMetricSamples.provider,
      operation: providerMetricSamples.operation,
      durationMs: providerMetricSamples.durationMs,
      success: providerMetricSamples.success,
      statusCode: providerMetricSamples.statusCode,
      createdAt: providerMetricSamples.createdAt,
    })
      .from(providerMetricSamples)
      .where(gte(providerMetricSamples.createdAt, startDate)),
    
    // Sincronizações ANP
    db.select({
      dataset: anpSyncRuns.dataset,
      status: anpSyncRuns.status,
      imported: anpSyncRuns.imported,
      attemptedAt: anpSyncRuns.attemptedAt,
    })
      .from(anpSyncRuns)
      .where(gte(anpSyncRuns.attemptedAt, startDate)),
  ]);
  
  return { routes, redemptions, events, providerSamples, anpSyncs };
}

/**
 * Obtém resumo de métricas para um período específico.
 * Combina busca de dados e cálculo de métricas.
 * 
 * @param periodDays - Número de dias (7, 14, 30)
 * @returns Resumo de métricas calculadas
 */
export async function getMetricsSummary(periodDays: number): Promise<MetricsSummary> {
  const samples = await fetchMetricsSamples(periodDays);
  
  // Nota: pricedStopsCount e totalStopsCount exigiriam consulta adicional complexa.
  // Por enquanto, usamos 0 como placeholder. Em iteração futura, podemos:
  // 1. Armazenar contadores agregados em tabela separada
  // 2. Calcular via evento product_events com payload estruturado
  // 3. Usar cache em memória atualizado durante o planejamento de rotas
  
  return summarizeMetricsPeriod({
    periodDays,
    ...samples,
    pricedStopsCount: 0, // Placeholder - implementar em iteração futura
    totalStopsCount: 0,  // Placeholder - implementar em iteração futura
  });
}
