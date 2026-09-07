import { describe, expect, it } from "vitest";
import { corridorPresets } from "./corridorPresets";

describe("corridor presets", () => {
  it("prioriza Águas Lindas e os destinos pendulares do Entorno", () => {
    expect(corridorPresets[0]).toMatchObject({ id: "aguas-lindas", query: "Águas Lindas de Goiás, GO" });
    expect(corridorPresets.map(item => item.id)).toEqual(expect.arrayContaining(["ceilandia", "taguatinga", "brasilia"]));
  });

  it("inclui os corredores adicionais do Entorno para consulta pública", () => {
    expect(corridorPresets.map(item => item.id)).toEqual(expect.arrayContaining([
      "valparaiso", "cidade-ocidental", "luziania", "formosa", "planaltina-go", "santo-antonio",
    ]));
  });
});
