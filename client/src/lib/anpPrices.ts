import type { AnpPriceRecord, AnpPriceSnapshot } from "@shared/anpPrices";
import { idbGet, idbPut } from "@/lib/offlineDb";

const PRICE_URL = import.meta.env.BASE_URL + "data/aguas-lindas-anp-precos.json";
const PRICE_KEY = "trajeto-aguas-lindas-anp-precos-v1";

export type { AnpPriceRecord, AnpPriceSnapshot };

export async function loadAguasLindasAnpPrices(signal?: AbortSignal): Promise<AnpPriceSnapshot | null> {
  try {
    const response = await fetch(PRICE_URL, { signal, cache: "no-store" });
    if (!response.ok) return null;
    const snapshot = await response.json() as AnpPriceSnapshot;
    if (!snapshot || snapshot.source !== "ANP" || !Array.isArray(snapshot.data)) return null;
    void idbPut("data", PRICE_KEY, snapshot);
    return snapshot;
  } catch {
    return await idbGet<AnpPriceSnapshot>("data", PRICE_KEY);
  }
}

export function indexAnpPricesByCnpj(records: AnpPriceRecord[]) {
  const map = new Map<string, AnpPriceRecord[]>();
  for (const record of records) {
    const current = map.get(record.cnpj) ?? [];
    current.push(record);
    map.set(record.cnpj, current);
  }
  for (const [cnpj, values] of map) {
    values.sort((a, b) => {
      const productOrder = ["gasolina-comum", "etanol", "diesel-s10", "diesel-s500", "gasolina-aditivada", "glp-p13", "gnv"];
      const aOrder = productOrder.indexOf(a.productKey);
      const bOrder = productOrder.indexOf(b.productKey);
      return (aOrder < 0 ? 99 : aOrder) - (bOrder < 0 ? 99 : bOrder) || a.produto.localeCompare(b.produto, "pt-BR");
    });
    map.set(cnpj, values);
  }
  return map;
}

export function latestPrice(records: AnpPriceRecord[] | undefined, productKey: AnpPriceRecord["productKey"] = "gasolina-comum") {
  return records?.find(record => record.productKey === productKey) ?? records?.[0] ?? null;
}

export function formatAnpPrice(record?: AnpPriceRecord | null) {
  if (!record) return null;
  return record.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/" + record.unit;
}
