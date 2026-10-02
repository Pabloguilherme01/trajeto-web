export type TerritorialFeatureKind =
  | "via"
  | "endereco"
  | "edificacao"
  | "estabelecimento"
  | "ponto";

export type TerritorialFeature = {
  id: string;
  kind: TerritorialFeatureKind;
  label: string;
  lat: number;
  lng: number;
  street?: string;
  number?: string;
  locality?: string;
  category?: string;
  sourceId: string;
};

export type TerritorialChunk = {
  schema: 1;
  cityIbgeCode: "5200258";
  sourceId: string;
  generatedAt: string;
  chunkId: string;
  features: TerritorialFeature[];
};

export const TERRITORIAL_FEATURE_KINDS: Array<{
  id: "todos" | TerritorialFeatureKind;
  label: string;
}> = [
  { id: "todos", label: "Tudo" },
  { id: "via", label: "Ruas e vias" },
  { id: "endereco", label: "Endereços" },
  { id: "edificacao", label: "Edificações" },
  { id: "estabelecimento", label: "Estabelecimentos" },
  { id: "ponto", label: "Pontos" },
];

function finiteCoordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

function isKind(value: unknown): value is TerritorialFeatureKind {
  return ["via", "endereco", "edificacao", "estabelecimento", "ponto"].includes(String(value));
}

export function normalizeTerritorialChunk(value: unknown): TerritorialChunk | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    input.schema !== 1 ||
    input.cityIbgeCode !== "5200258" ||
    typeof input.sourceId !== "string" ||
    !input.sourceId ||
    typeof input.chunkId !== "string" ||
    !input.chunkId ||
    typeof input.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(input.generatedAt)) ||
    !Array.isArray(input.features) ||
    input.features.length > 2500
  ) return null;

  const features = input.features.flatMap(raw => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      !isKind(item.kind) ||
      !finiteCoordinate(item.lat, 90) ||
      !finiteCoordinate(item.lng, 180) ||
      typeof item.sourceId !== "string" ||
      item.sourceId !== input.sourceId
    ) return [];
    return [{
      id: item.id,
      kind: item.kind,
      label: item.label,
      lat: item.lat as number,
      lng: item.lng as number,
      street: typeof item.street === "string" ? item.street : undefined,
      number: typeof item.number === "string" ? item.number : undefined,
      locality: typeof item.locality === "string" ? item.locality : undefined,
      category: typeof item.category === "string" ? item.category : undefined,
      sourceId: item.sourceId,
    }];
  });

  if (features.length !== input.features.length) return null;
  if (new Set(features.map(item => item.id)).size !== features.length) return null;

  return {
    schema: 1,
    cityIbgeCode: "5200258",
    sourceId: input.sourceId,
    generatedAt: input.generatedAt,
    chunkId: input.chunkId,
    features,
  };
}

// Privacy boundary: territorial data describes public physical geography.
// Resident names, CPF, personal phone/email and ownership data do not belong here.
export const TERRITORIAL_ALLOWED_FIELDS = [
  "id", "kind", "label", "lat", "lng", "street", "number",
  "locality", "category", "sourceId",
] as const;
