import { describe, expect, it, vi } from "vitest";
import { downloadAuthorizedStations } from "./anpAuthorizedStations";

describe("downloadAuthorizedStations", () => {
  it("mantém somente municípios e UFs escolhidos para o corredor", async () => {
    const csv = [
      "AUTORIZACAO;RAZAOSOCIAL;ENDERECO;COMPLEMENTO;BAIRRO;CEP;UF;MUNICIPIO;BANDEIRA",
      "PR/DF0001;POSTO DF;Q 1;LOTE 1;CENTRO;70000-000;DF;CEILANDIA;BANDEIRA BRANCA",
      "PR/GO0002;POSTO GO;Q 2;LOTE 2;CENTRO;72900-000;GO;AGUAS LINDAS DE GOIAS;IPIRANGA",
      "PR/GO0003;POSTO FORA;Q 3;LOTE 3;CENTRO;74000-000;GO;GOIANIA;RAIZEN",
    ].join("\n");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(csv, { status: 200 })));

    const result = await downloadAuthorizedStations("https://example.com/anp.csv", [
      { municipality: "Ceilândia", state: "DF" },
      { municipality: "Águas Lindas de Goiás", state: "GO" },
    ]);

    expect(result.stations.map(station => [station.municipality, station.state])).toEqual([
      ["CEILANDIA", "DF"],
      ["AGUAS LINDAS DE GOIAS", "GO"],
    ]);
  });
});
