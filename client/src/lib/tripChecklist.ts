export type TripChecklistInput = {
  routeAvailable: boolean;
  routeConfirmed: boolean;
  distanceKm: number | null;
  durationSeconds: number | null;
  online: boolean;
  loadedFromOffline: boolean;
  vehicleConsumption: number | null;
  vehicleTankLiters: number | null;
  tollKnown: boolean;
  fuelPriceConfigured: boolean;
};

export type TripChecklistItem = {
  key: "route" | "navigation" | "dataFreshness" | "vehicle" | "fuelRange" | "toll" | "fuelPrice";
  status: "ready" | "attention";
  label: string;
  detail: string;
};

export function buildTripChecklist(input: TripChecklistInput): TripChecklistItem[] {
  const routeValid = input.routeAvailable && (input.distanceKm ?? 0) > 0 && (input.durationSeconds ?? 0) > 0;
  const vehicleValid = (input.vehicleConsumption ?? 0) > 0;
  const range = vehicleValid && (input.vehicleTankLiters ?? 0) > 0
    ? (input.vehicleConsumption as number) * (input.vehicleTankLiters as number)
    : null;
  const enoughRange = range != null && input.distanceKm != null ? range >= input.distanceKm : null;

  return [
    {
      key: "route",
      status: routeValid && input.routeConfirmed ? "ready" : "attention",
      label: "Rota",
      detail: !routeValid ? "distância ou duração indisponível" : input.routeConfirmed ? "rota confirmada para navegação" : "rota calculada, mas ainda não confirmada",
    },
    {
      key: "navigation",
      status: input.online ? "ready" : "attention",
      label: "Navegação",
      detail: input.online ? "conexão disponível para abrir o navegador externo" : "sem internet; navegação externa pode não funcionar",
    },
    {
      key: "dataFreshness",
      status: input.loadedFromOffline ? "attention" : "ready",
      label: "Atualidade",
      detail: input.loadedFromOffline ? "rota recuperada de snapshot local; recalcule antes de confiar no trânsito" : "rota consultada nesta sessão",
    },
    {
      key: "vehicle",
      status: vehicleValid ? "ready" : "attention",
      label: "Veículo",
      detail: vehicleValid ? "consumo configurado" : "cadastre o consumo para estimar combustível",
    },
    {
      key: "fuelRange",
      status: enoughRange == null || enoughRange ? "ready" : "attention",
      label: "Autonomia",
      detail: enoughRange == null ? "tanque não informado; autonomia não verificável" : enoughRange ? "autonomia teórica cobre a distância" : "autonomia teórica abaixo da distância da rota",
    },
    {
      key: "toll",
      status: input.tollKnown ? "ready" : "attention",
      label: "Pedágio",
      detail: input.tollKnown ? "valor disponível na consulta" : "valor não informado pela fonte",
    },
    {
      key: "fuelPrice",
      status: input.fuelPriceConfigured ? "ready" : "attention",
      label: "Combustível",
      detail: input.fuelPriceConfigured ? "preço local configurado" : "preço local não configurado",
    },
  ];
}
