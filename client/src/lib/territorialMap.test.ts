import { describe, expect, it } from "vitest";
import { normalizeTerritorialChunk, TERRITORIAL_ALLOWED_FIELDS } from "./territorialMap";

const chunk = {
  schema: 1,
  cityIbgeCode: "5200258",
  sourceId: "ibge-cnefe-2022",
  generatedAt: "2026-10-03T00:00:00Z",
  chunkId: "grid-001",
  features: [
    {
      id: "address-1",
      kind: "endereco",
      label: "Rua Exemplo, 10",
      lat: -15.75,
      lng: -48.28,
      street: "Rua Exemplo",
      number: "10",
      locality: "Águas Lindas de Goiás",
      sourceId: "ibge-cnefe-2022",
    },
  ],
};

describe("territorial mapping contract", () => {
  it("accepts a bounded public-geography chunk", () => {
    expect(normalizeTerritorialChunk(chunk)?.features).toHaveLength(1);
  });

  it("rejects wrong-city, invalid coordinates and mixed source records", () => {
    expect(normalizeTerritorialChunk({ ...chunk, cityIbgeCode: "5300108" })).toBeNull();
    expect(normalizeTerritorialChunk({
      ...chunk,
      features: [{ ...chunk.features[0], lat: 120 }],
    })).toBeNull();
    expect(normalizeTerritorialChunk({
      ...chunk,
      features: [{ ...chunk.features[0], sourceId: "unknown" }],
    })).toBeNull();
  });

  it("keeps personal identity fields outside the territorial schema", () => {
    expect(TERRITORIAL_ALLOWED_FIELDS).not.toContain("cpf");
    expect(TERRITORIAL_ALLOWED_FIELDS).not.toContain("residentName");
    expect(TERRITORIAL_ALLOWED_FIELDS).not.toContain("phone");
    expect(TERRITORIAL_ALLOWED_FIELDS).not.toContain("email");
    expect(TERRITORIAL_ALLOWED_FIELDS).not.toContain("owner");
  });
});
