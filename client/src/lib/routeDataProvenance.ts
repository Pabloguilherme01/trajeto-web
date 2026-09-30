export type RouteDataFlag = {
  key: "distance" | "duration" | "traffic" | "toll" | "fuel" | "total";
  status: "available" | "estimated" | "missing";
  label: string;
  detail: string;
};

export type RouteDataInput = {
  distanceMeters: number | null;
  durationSeconds: number | null;
  staticDurationSeconds: number | null;
  tollAmount: number | null;
  tollEstimated: boolean;
  fuelPricePerLiter: number | null;
  consumptionKmPerLiter: number | null;
};

export function describeRouteData(input: RouteDataInput): RouteDataFlag[] {
  const distanceAvailable = input.distanceMeters != null && Number.isFinite(input.distanceMeters) && input.distanceMeters >= 0;
  const durationAvailable = input.durationSeconds != null && Number.isFinite(input.durationSeconds) && input.durationSeconds >= 0;
  const trafficAvailable = durationAvailable && input.staticDurationSeconds != null && Number.isFinite(input.staticDurationSeconds) && input.staticDurationSeconds >= 0;
  const tollAvailable = input.tollAmount != null && Number.isFinite(input.tollAmount) && input.tollAmount >= 0;
  const fuelAvailable =
    input.fuelPricePerLiter != null &&
    Number.isFinite(input.fuelPricePerLiter) &&
    input.fuelPricePerLiter > 0 &&
    input.consumptionKmPerLiter != null &&
    Number.isFinite(input.consumptionKmPerLiter) &&
    input.consumptionKmPerLiter > 0;

  return [
    { key: "distance", status: distanceAvailable ? "available" : "missing", label: "Distância", detail: distanceAvailable ? "retornada pela rota" : "não informada" },
    { key: "duration", status: durationAvailable ? "available" : "missing", label: "Duração", detail: durationAvailable ? "retornada pela rota" : "não informada" },
    {
      key: "traffic",
      status: trafficAvailable ? "available" : "missing",
      label: "Trânsito",
      detail: trafficAvailable
        ? "comparação com fluxo livre disponível"
        : "impacto de trânsito não comparável",
    },
    {
      key: "toll",
      status: tollAvailable ? (input.tollEstimated ? "estimated" : "available") : "missing",
      label: "Pedágio",
      detail: tollAvailable ? (input.tollEstimated ? "valor estimado pela fonte" : "valor informado pela fonte") : "não informado",
    },
    {
      key: "fuel",
      status: fuelAvailable ? "available" : "missing",
      label: "Combustível",
      detail: fuelAvailable ? "veículo + preço local informados" : "faltam veículo ou preço por litro",
    },
    {
      key: "total",
      status: fuelAvailable && tollAvailable ? "available" : "missing",
      label: "Custo total",
      detail: fuelAvailable && tollAvailable ? "combustível + pedágio" : "não calculado sem todos os dados",
    },
  ];
}
