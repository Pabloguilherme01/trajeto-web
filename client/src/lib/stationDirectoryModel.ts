import type { AnpPriceRecord } from "@shared/anpPrices";
import type { AnpStation } from "@shared/anpRevendedores";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";

export type FuelFilter = "all" | "gasolina-comum" | "etanol" | "diesel-s10" | "diesel-s500" | "glp-p13" | "gnv";

export type DirectoryCardShape = {
  key: string;
  local: LocalStationRecord | null;
  anp: AnpStation | null;
};

export type DirectoryPriceIndex = Map<string, AnpPriceRecord[]>;

export function buildDirectoryCards(localStations: LocalStationRecord[], anpStations: AnpStation[]) {
  const anpByCnpj = new Map(anpStations.map(station => [station.cnpj, station]));
  const cards: DirectoryCardShape[] = localStations.map(local => ({
    key: local.cnpj,
    local,
    anp: anpByCnpj.get(local.cnpj) ?? null,
  }));
  const localCnpjs = new Set(localStations.map(station => station.cnpj));
  for (const anp of anpStations) {
    if (!localCnpjs.has(anp.cnpj)) cards.push({ key: anp.cnpj, local: null, anp });
  }
  return cards;
}

export function matchesFuelFilter(item: DirectoryCardShape, filter: FuelFilter, pricesByCnpj: DirectoryPriceIndex) {
  if (filter === "all") return true;
  if (pricesByCnpj.get(item.key)?.some(price => price.productKey === filter)) return true;
  return item.anp?.products?.some(product => {
    const text = (product.produto || "").toLocaleLowerCase("pt-BR");
    return filter === "gasolina-comum"
      ? text.includes("gasolina") && !text.includes("aditivada")
      : filter === "etanol"
        ? text.includes("etanol")
        : filter === "diesel-s10"
          ? text.includes("s10")
          : filter === "diesel-s500"
            ? text.includes("s500")
            : filter === "glp-p13"
              ? text.includes("glp") || text.includes("p13")
              : text.includes("gnv");
  }) ?? false;
}

export function getDirectoryLabel(item: DirectoryCardShape) {
  return item.local?.displayName || item.anp?.razaoSocial || "";
}

export function getDirectoryCoordinates(item: DirectoryCardShape) {
  const lat = Number(item.anp?.latitude ?? item.local?.anp?.latitude);
  const lng = Number(item.anp?.longitude ?? item.local?.anp?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function getDirectoryGasolinePrice(item: DirectoryCardShape, pricesByCnpj: DirectoryPriceIndex) {
  return pricesByCnpj.get(item.key)?.find(price => price.productKey === "gasolina-comum")?.salePrice ?? null;
}
