import type { StationMapItem } from "@/components/StationMap";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import type { MobileStation } from "@/lib/mobileStationStore";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { AnpStation } from "@shared/anpRevendedores";

export type Coordinates = { lat: number; lng: number };
export type DirectorySort = "name" | "distance" | "brand" | "price";
export type FuelFilter = "all" | "gasolina-comum" | "etanol" | "diesel-s10" | "diesel-s500" | "glp-p13" | "gnv";
export type DirectoryCard = { key: string; local: LocalStationRecord | null; anp: AnpStation | null };

export type LocalDirectoryFilters = {
  neighborhood: string;
  brand: string;
  addressOnly: boolean;
  verifiedOnly: boolean;
  mappedOnly: boolean;
};

export function normalizeStationText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isBroadAguasLindasQuery(value: string) {
  const normalized = normalizeStationText(value);
  return normalized === "postos" ||
    normalized === "aguas lindas" ||
    normalized.includes("postos em aguas lindas") ||
    normalized.includes("postos de aguas lindas");
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

export function filterLocalDirectory(stations: LocalStationRecord[], filters: LocalDirectoryFilters) {
  return stations
    .filter(station =>
      (filters.neighborhood === "all" || station.neighborhood === filters.neighborhood) &&
      (filters.brand === "all" || (station.brand ?? "Sem bandeira") === filters.brand) &&
      (!filters.addressOnly || Boolean(station.address)) &&
      (!filters.verifiedOnly || station.dataQuality === "anp-confirmed" || station.dataOrigin === "ANP") &&
      (!filters.mappedOnly || Boolean(station.mapData)),
    )
    .sort((a, b) =>
      (a.neighborhood ?? "").localeCompare(b.neighborhood ?? "", "pt-BR") ||
      a.displayName.localeCompare(b.displayName, "pt-BR"),
    );
}

export function getLocalDirectoryFacets(stations: LocalStationRecord[]) {
  return {
    brands: Array.from(new Set(stations.map(station => station.brand ?? "Sem bandeira")))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    neighborhoods: Array.from(new Set(stations.map(station => station.neighborhood).filter((value): value is string => Boolean(value))))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

export function buildDirectoryCards(localStations: LocalStationRecord[], anpStations: AnpStation[]): DirectoryCard[] {
  const localByCnpj = new Map(localStations.map(station => [station.cnpj, station]));
  const anpByCnpj = new Map(anpStations.map(station => [station.cnpj, station]));
  const cards: DirectoryCard[] = localStations.map(local => ({
    key: local.cnpj,
    local,
    anp: anpByCnpj.get(local.cnpj) ?? null,
  }));

  for (const anp of anpStations) {
    if (localByCnpj.has(anp.cnpj)) continue;
    cards.push({ key: anp.cnpj, local: null, anp });
  }
  return cards;
}

export function getDirectoryCoordinates(item: DirectoryCard): Coordinates | null {
  const lat = Number(item.anp?.latitude ?? item.local?.anp?.latitude);
  const lng = Number(item.anp?.longitude ?? item.local?.anp?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function directoryCardDistanceKm(item: DirectoryCard, userCoords: Coordinates | null) {
  if (!userCoords) return null;
  const coords = getDirectoryCoordinates(item);
  return coords ? haversineKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng) : null;
}

function stationLabel(item: DirectoryCard) {
  return item.local?.displayName || item.anp?.razaoSocial || "";
}

function fuelTextMatches(product: string | null | undefined, fuel: Exclude<FuelFilter, "all">) {
  const text = normalizeStationText(product ?? "");
  if (fuel === "gasolina-comum") return text.includes("gasolina") && !text.includes("aditivada");
  if (fuel === "etanol") return text.includes("etanol");
  if (fuel === "diesel-s10") return text.includes("s10");
  if (fuel === "diesel-s500") return text.includes("s500");
  if (fuel === "glp-p13") return text.includes("glp") || text.includes("p13") || text.includes("13 kg");
  return text.includes("gnv") || text.includes("gas natural");
}

export function stationSupportsFuel(
  item: DirectoryCard,
  fuel: FuelFilter,
  pricesByCnpj: Map<string, AnpPriceRecord[]>,
) {
  if (fuel === "all") return true;
  if (pricesByCnpj.get(item.key)?.some(price => price.productKey === fuel)) return true;
  return item.anp?.products?.some(product => fuelTextMatches(product.produto, fuel)) ?? false;
}

function priceForSort(item: DirectoryCard, fuel: FuelFilter, pricesByCnpj: Map<string, AnpPriceRecord[]>) {
  const productKey = fuel === "all" ? "gasolina-comum" : fuel;
  return pricesByCnpj.get(item.key)?.find(price => price.productKey === productKey)?.salePrice ?? Number.POSITIVE_INFINITY;
}

export function filterAndSortDirectoryCards(input: {
  cards: DirectoryCard[];
  search: string;
  sort: DirectorySort;
  userCoords: Coordinates | null;
  fuel: FuelFilter;
  pricesByCnpj: Map<string, AnpPriceRecord[]>;
}) {
  const normalized = normalizeStationText(input.search);
  const matches = input.cards.filter(item => {
    const text = normalizeStationText([
      item.local?.displayName,
      item.local?.legalName,
      item.local?.cnpj,
      item.local?.neighborhood,
      item.local?.address,
      item.local?.brand,
      item.anp?.razaoSocial,
      item.anp?.cnpj,
      item.anp?.bairro,
      item.anp?.endereco,
      item.anp?.distribuidora,
    ].filter(Boolean).join(" "));

    return (!normalized || text.includes(normalized)) &&
      stationSupportsFuel(item, input.fuel, input.pricesByCnpj);
  });

  return [...matches].sort((a, b) => {
    if (input.sort === "distance" && input.userCoords) {
      const aDistance = directoryCardDistanceKm(a, input.userCoords) ?? Number.POSITIVE_INFINITY;
      const bDistance = directoryCardDistanceKm(b, input.userCoords) ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance || stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
    }
    if (input.sort === "price") {
      return priceForSort(a, input.fuel, input.pricesByCnpj) -
        priceForSort(b, input.fuel, input.pricesByCnpj) ||
        stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
    }
    if (input.sort === "brand") {
      return (a.anp?.distribuidora || a.local?.brand || "Sem bandeira")
        .localeCompare(b.anp?.distribuidora || b.local?.brand || "Sem bandeira", "pt-BR") ||
        stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
    }
    return stationLabel(a).localeCompare(stationLabel(b), "pt-BR");
  });
}

export function buildStationMapItems(input: {
  anpStations: AnpStation[];
  localStations: LocalStationRecord[];
  directoryCards: DirectoryCard[];
  liveStations: MobileStation[];
  offlineMap: StationMapItem[];
}): StationMapItem[] {
  const official: StationMapItem[] = input.anpStations
    .filter(station => Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
    .map(station => ({
      id: "anp-" + station.cnpj,
      name: station.razaoSocial || "Posto " + station.cnpj,
      address: [station.endereco, station.bairro, station.municipio, station.uf].filter(Boolean).join(" · "),
      lat: station.latitude as number,
      lng: station.longitude as number,
      cnpj: station.cnpj,
      brand: station.distribuidora,
      source: "ANP",
    }));

  const local: StationMapItem[] = input.localStations.map(station => {
    const coords = Number.isFinite(station.anp?.latitude) && Number.isFinite(station.anp?.longitude)
      ? { lat: Number(station.anp?.latitude), lng: Number(station.anp?.longitude) }
      : {};
    return {
      id: "local-" + station.cnpj,
      name: station.displayName || station.legalName,
      address: [station.address, station.neighborhood, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(" · "),
      ...coords,
      cnpj: station.cnpj,
      brand: station.brand || station.mapData?.observedBrand,
      source: "local",
    };
  });

  const directory: StationMapItem[] = input.directoryCards.map(item => {
    const coords = getDirectoryCoordinates(item);
    return {
      id: "directory-" + item.key,
      name: item.local?.displayName || item.anp?.razaoSocial || "Posto",
      address: [
        item.anp?.endereco || item.local?.address,
        item.anp?.complemento,
        item.anp?.bairro || item.local?.neighborhood,
        item.anp?.municipio || "Águas Lindas de Goiás",
        item.anp?.uf || "GO",
      ].filter(Boolean).join(" · "),
      ...(coords ?? {}),
      cnpj: item.anp?.cnpj || item.local?.cnpj || null,
      brand: item.anp?.distribuidora || item.local?.brand || item.local?.mapData?.observedBrand || null,
      source: "local",
    };
  });

  const live: StationMapItem[] = input.liveStations
    .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map(item => ({
      id: item.placeId,
      placeId: item.placeId,
      name: item.name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      cnpj: null,
      brand: null,
      source: "Google",
    }));

  const seen = new Set<string>();
  const merged: StationMapItem[] = [];
  for (const station of [...official, ...local, ...directory, ...live, ...input.offlineMap]) {
    const key = station.cnpj
      ? "cnpj:" + station.cnpj
      : station.placeId
        ? "place:" + station.placeId
        : "address:" + normalizeStationText(station.address || station.name);
    const coordinateKey = typeof station.lat === "number" && typeof station.lng === "number"
      ? "coord:" + station.lat.toFixed(5) + "," + station.lng.toFixed(5)
      : null;
    if (seen.has(key) || (coordinateKey && seen.has(coordinateKey))) continue;
    seen.add(key);
    if (coordinateKey) seen.add(coordinateKey);
    merged.push(station);
  }
  return merged;
}
