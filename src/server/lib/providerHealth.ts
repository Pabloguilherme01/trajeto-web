export type ProviderHealthState = "healthy" | "attention" | "alert" | "observing";

export type ProviderHealthInput = {
  count: number;
  successRate: number;
  p95Ms: number;
};

export type ProviderHealth = {
  state: ProviderHealthState;
  label: "Saudável" | "Atenção" | "Alerta" | "Amostra inicial";
  detail: string;
};

export const PROVIDER_HEALTH_THRESHOLDS = {
  minimumSamples: 3,
  attentionP95Ms: 1_500,
  alertP95Ms: 3_000,
  attentionSuccessRate: 99,
  alertSuccessRate: 95,
} as const;

export function classifyProviderHealth({ count, successRate, p95Ms }: ProviderHealthInput): ProviderHealth {
  if (count < PROVIDER_HEALTH_THRESHOLDS.minimumSamples) {
    return {
      state: "observing",
      label: "Amostra inicial",
      detail: `Aguardando pelo menos ${PROVIDER_HEALTH_THRESHOLDS.minimumSamples} amostras para classificar o provedor.`,
    };
  }
  if (successRate < PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate || p95Ms >= PROVIDER_HEALTH_THRESHOLDS.alertP95Ms) {
    return {
      state: "alert",
      label: "Alerta",
      detail: successRate < PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate
        ? `Taxa de sucesso abaixo de ${PROVIDER_HEALTH_THRESHOLDS.alertSuccessRate}%.`
        : `p95 acima de ${PROVIDER_HEALTH_THRESHOLDS.alertP95Ms.toLocaleString("pt-BR")} ms.`,
    };
  }
  if (successRate < PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate || p95Ms >= PROVIDER_HEALTH_THRESHOLDS.attentionP95Ms) {
    return {
      state: "attention",
      label: "Atenção",
      detail: successRate < PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate
        ? `Taxa de sucesso abaixo de ${PROVIDER_HEALTH_THRESHOLDS.attentionSuccessRate}%.`
        : `p95 acima de ${PROVIDER_HEALTH_THRESHOLDS.attentionP95Ms.toLocaleString("pt-BR")} ms.`,
    };
  }
  return { state: "healthy", label: "Saudável", detail: "p95 e taxa de sucesso dentro das faixas observadas." };
}
