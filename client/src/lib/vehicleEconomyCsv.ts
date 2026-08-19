export type VehicleEconomyCsvRow = { vehicleNickname: string; createdAt: Date | string; distanceKm: number; gasolineCost: number; ethanolCost: number; estimatedSavings: number; bestFuel: "gasoline" | "ethanol"; estimatedTripCost: number | null };

const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const money = (value: number | null) => value == null ? "" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildVehicleEconomyCsv(rows: VehicleEconomyCsvRow[], vehicleName: string, generatedAt = new Date()) {
  const lines = [
    "sep=;",
    `${cell("Histórico de economia estimada")};${cell(`Gerado em ${generatedAt.toLocaleString("pt-BR")}`)}`,
    `${cell("Veículo")};${cell(vehicleName)}`,
    "",
    ["Data", "Distância (km)", "Custo gasolina", "Custo etanol", "Economia potencial", "Melhor cenário", "Custo salvo da rota"].map(cell).join(";"),
    ...rows.map(row => [new Date(row.createdAt).toLocaleString("pt-BR"), row.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 }), money(row.gasolineCost), money(row.ethanolCost), money(row.estimatedSavings), row.bestFuel === "ethanol" ? "Etanol" : "Gasolina", money(row.estimatedTripCost)].map(cell).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export const vehicleEconomyCsvFilename = (generatedAt = new Date()) => `trajeto-economia-veiculo-${generatedAt.toISOString().slice(0, 10)}.csv`;
