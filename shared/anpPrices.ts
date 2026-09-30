export type AnpPriceRecord = {
  cnpj: string;
  razaoSocial: string | null;
  endereco: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  produto: string;
  productKey: "gasolina-comum" | "gasolina-aditivada" | "etanol" | "diesel-s10" | "diesel-s500" | "glp-p13" | "gnv" | "outro";
  salePrice: number;
  unit: "L" | "m3" | "13kg" | "other";
  collectionDate: string | null;
  referencePeriod: string;
  source: "ANP";
};

export type AnpPriceSnapshot = {
  source: "ANP";
  sourceUrl: string;
  retrievedAt: string;
  referencePeriod: string;
  totalRows: number;
  totalStations: number;
  data: AnpPriceRecord[];
};

export function normalizeAnpPriceProduct(value: string) {
  const key = value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (key.includes("gasolina comum") || key === "gasolina") return "gasolina-comum" as const;
  if (key.includes("gasolina aditivada")) return "gasolina-aditivada" as const;
  if (key.includes("etanol")) return "etanol" as const;
  if (key.includes("diesel s10")) return "diesel-s10" as const;
  if (key.includes("diesel s500")) return "diesel-s500" as const;
  if (key.includes("glp") || key.includes("13 kg") || key.includes("p13")) return "glp-p13" as const;
  if (key.includes("gnv") || key.includes("gás natural") || key.includes("gas natural")) return "gnv" as const;
  return "outro" as const;
}

export function preferredUnit(productKey: AnpPriceRecord["productKey"]) {
  if (productKey === "glp-p13") return "13kg" as const;
  if (productKey === "gnv") return "m3" as const;
  return "L" as const;
}
