import { inferredBrand, type StationListItem, type StationSort } from "./stationListControls";

export type StationExportItem = StationListItem & {
  placeId: string;
  address: string;
  distanceLabel: string | null;
  phone: string | null;
  website: string | null;
  lat: number;
  lng: number;
};

export type StationExportContext = {
  query: string;
  sortBy: StationSort;
  brandFilter: string;
  hoursFilter: string;
};

function cell(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildStationExportCsv(stations: StationExportItem[], context: StationExportContext, generatedAt = new Date()) {
  const lines = [
    ["Trajeto — paradas carregadas", "gerado em", generatedAt.toISOString()].map(cell).join(";"),
    ["Consulta", context.query].map(cell).join(";"),
    ["Origem", "Google Maps Places e Distance Matrix; somente paradas carregadas nesta consulta"].map(cell).join(";"),
    ["Critérios", `ordem: ${context.sortBy}; bandeira: ${context.brandFilter}; horário: ${context.hoursFilter}`].map(cell).join(";"),
    ["Posição", "Posto", "Endereço", "Bandeira inferida", "Distância (m)", "Distância exibida", "Aberto agora", "Telefone", "Site", "Latitude", "Longitude", "Place ID"].map(cell).join(";"),
    ...stations.map((station, index) => [
      index + 1,
      station.name,
      station.address,
      inferredBrand(station.name),
      station.distanceMeters,
      station.distanceLabel,
      station.isOpen === true ? "sim" : station.isOpen === false ? "não" : "não informado",
      station.phone,
      station.website,
      station.lat,
      station.lng,
      station.placeId,
    ].map(cell).join(";")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function stationExportCsvFilename(query: string, generatedAt = new Date()) {
  const safeQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "consulta";
  return `trajeto-paradas-${safeQuery}-${generatedAt.toISOString().slice(0, 10)}.csv`;
}
