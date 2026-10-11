import type { AnpStation } from "@shared/anpRevendedores";
import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";

type AnpSearchIndex = ReturnType<typeof createCatalogSearchIndex>;
export type AnpMapStationMarker = {
  id: string;
  name: string;
  source: "ANP";
  address: string;
  lat: number;
  lng: number;
};

// Grouped ANP stations are immutable during the map session and replaced on
// snapshot refresh. Avoid normalizing every station per search keystroke.
const stationSearch = new WeakMap<AnpStation, AnpSearchIndex>();

function indexedStation(station: AnpStation) {
  let index = stationSearch.get(station);
  if (!index) {
    index = createCatalogSearchIndex([
      station.razaoSocial ?? "Posto",
      station.endereco ?? undefined,
    ]);
    stationSearch.set(station, index);
  }
  return index;
}

/** Preserve the existing ANP map order, label and address semantics. */
export function filterAnpMapStations(
  stations: readonly AnpStation[],
  query: string,
): AnpMapStationMarker[] {
  const terms = normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);
  const markers: AnpMapStationMarker[] = [];
  for (const station of stations) {
    const lat = station.latitude, lng = station.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (terms.length && !matchesCatalogTerms(terms, indexedStation(station))) continue;
    markers.push({
      id: station.cnpj,
      name: station.razaoSocial ?? "Posto",
      source: "ANP",
      address: [station.endereco, station.bairro, station.municipio, station.uf]
        .filter(Boolean).join(", ") || station.razaoSocial || "Posto",
      lat,
      lng,
    });
  }
  return markers;
}
