import { useMemo } from "react";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { FuelFilter, DirectoryCardShape, DirectoryPriceIndex } from "@/lib/stationDirectoryModel";
import { getDirectoryCoordinates, getDirectoryGasolinePrice, matchesFuelFilter } from "@/lib/stationDirectoryModel";
import { getDistanceKm, stationMatchesSearch, type Coordinates } from "@/lib/stationDirectorySearch";

export type StationDirectorySort = "name" | "distance" | "price" | "brand";
export type StationDirectoryDistanceFilter = "all" | 2 | 5 | 10;

export type StationDirectoryFilters = {
  fuelFilter: FuelFilter;
  sort: StationDirectorySort;
  distance: StationDirectoryDistanceFilter;
  neighborhood: string;
  brand: string;
  addressOnly: boolean;
  verifiedOnly: boolean;
  mappedOnly: boolean;
  priceOnly: boolean;
};

type Params = {
  cards: DirectoryCardShape[];
  pricesByCnpj: DirectoryPriceIndex;
  search: string;
  userCoords: Coordinates | null;
  filters: StationDirectoryFilters;
};

export function useStationDirectory({ cards, pricesByCnpj, search, userCoords, filters }: Params) {
  return useMemo(() => {
    const neighborhoods = Array.from(new Set(
      cards.map(item => item.anp?.bairro || item.local?.neighborhood).filter((value): value is string => Boolean(value)),
    )).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const brands = Array.from(new Set(
      cards.map(item => item.anp?.distribuidora || item.local?.brand || "Sem bandeira"),
    )).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const distanceByKey = new Map<string, number | null>();
    for (const item of cards) {
      distanceByKey.set(item.key, getDistanceKm(userCoords, getDirectoryCoordinates(item)));
    }

    const results = cards.filter(item => {
      const matchesText = stationMatchesSearch([
        item.local?.displayName,
        item.local?.legalName,
        item.local?.cnpj,
        item.local?.neighborhood,
        item.local?.address,
        item.local?.brand,
        item.local?.aliases?.join(" "),
        item.anp?.razaoSocial,
        item.anp?.cnpj,
        item.anp?.bairro,
        item.anp?.endereco,
        item.anp?.distribuidora,
      ], search);

      const neighborhoodMatches = filters.neighborhood === "all" ||
        (item.anp?.bairro || item.local?.neighborhood || "") === filters.neighborhood;
      const brandMatches = filters.brand === "all" ||
        (item.anp?.distribuidora || item.local?.brand || "Sem bandeira") === filters.brand;
      const addressMatches = !filters.addressOnly || Boolean(item.anp?.endereco || item.local?.address);
      const verifiedMatches = !filters.verifiedOnly ||
        Boolean(item.anp) ||
        item.local?.dataQuality === "anp-confirmed" ||
        item.local?.dataOrigin === "ANP";
      const mappedMatches = !filters.mappedOnly || Boolean(getDirectoryCoordinates(item));
      const priceMatches = !filters.priceOnly || (pricesByCnpj.get(item.key)?.length ?? 0) > 0;
      const fuelMatches = matchesFuelFilter(item, filters.fuelFilter, pricesByCnpj);

      const distance = distanceByKey.get(item.key) ?? null;
      const distanceMatches = filters.distance === "all" || !userCoords || distance == null || distance <= filters.distance;

      return matchesText &&
        neighborhoodMatches &&
        brandMatches &&
        addressMatches &&
        verifiedMatches &&
        mappedMatches &&
        priceMatches &&
        fuelMatches &&
        distanceMatches;
    });

    const label = (item: DirectoryCardShape) => item.local?.displayName || item.anp?.razaoSocial || "Posto";
    const brand = (item: DirectoryCardShape) => item.anp?.distribuidora || item.local?.brand || "Sem bandeira";

    results.sort((a, b) => {
      if (filters.sort === "distance") {
        return (distanceByKey.get(a.key) ?? Number.POSITIVE_INFINITY) -
          (distanceByKey.get(b.key) ?? Number.POSITIVE_INFINITY) ||
          label(a).localeCompare(label(b), "pt-BR");
      }
      if (filters.sort === "price") {
        return (getDirectoryGasolinePrice(a, pricesByCnpj) ?? Number.POSITIVE_INFINITY) -
          (getDirectoryGasolinePrice(b, pricesByCnpj) ?? Number.POSITIVE_INFINITY) ||
          label(a).localeCompare(label(b), "pt-BR");
      }
      if (filters.sort === "brand") {
        return brand(a).localeCompare(brand(b), "pt-BR") ||
          label(a).localeCompare(label(b), "pt-BR");
      }
      return label(a).localeCompare(label(b), "pt-BR");
    });

    const priceCount = cards.filter(item => (pricesByCnpj.get(item.key)?.length ?? 0) > 0).length;
    const verifiedCount = cards.filter(item => Boolean(item.anp)).length;
    const mappedCount = cards.filter(item => Boolean(getDirectoryCoordinates(item))).length;

    return {
      results,
      distanceByKey,
      neighborhoods,
      brands,
      priceCount,
      verifiedCount,
      mappedCount,
    };
  }, [cards, pricesByCnpj, search, userCoords, filters]);
}

export type { AnpPriceRecord };
