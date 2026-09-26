import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ANP_AUTHORIZED_STATIONS_URL, downloadAuthorizedStations } from "./anpAuthorizedStations";

describe("downloadAuthorizedStations", () => {
  it("mantém somente municípios e UFs escolhidos para o corredor", async () => {
    const csv = [
      "AUTORIZACAO;RAZAOSOCIAL;ENDERECO;COMPLEMENTO;BAIRRO;CEP;UF;MUNICIPIO;BANDEIRA",
      "PR/DF0001;POSTO DF;Q 1;LOTE 1;CENTRO;70000-000;DF;CEILANDIA;BANDEIRA BRANCA",
      "PR/GO0002;POSTO GO;Q 2;LOTE 2;CENTRO;72900-000;GO;AGUAS LINDAS DE GOIAS;IPIRANGA",
      "PR/GO0003;POSTO FORA;Q 3;LOTE 3;CENTRO;74000-000;GO;GOIANIA;RAIZEN",
    ].join("\n");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(csv, { status: 200 })));

    const result = await downloadAuthorizedStations(DEFAULT_ANP_AUTHORIZED_STATIONS_URL, [
      { municipality: "Ceilândia", state: "DF" },
      { municipality: "Águas Lindas de Goiás", state: "GO" },
    ]);

    expect(result.stations.map(station => [station.municipality, station.state])).toEqual([
      ["CEILANDIA", "DF"],
      ["AGUAS LINDAS DE GOIAS", "GO"],
    ]);
  });

  it("repete somente falhas transitórias e preserva a validação do arquivo recebido", async () => {
    const csv = ["AUTORIZACAO;RAZAOSOCIAL;ENDERECO;COMPLEMENTO;BAIRRO;CEP;UF;MUNICIPIO;BANDEIRA", "PR/GO0002;POSTO GO;Q 2;LOTE 2;CENTRO;72900-000;GO;AGUAS LINDAS DE GOIAS;IPIRANGA"].join("\n");
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("temporário", { status: 503 })).mockResolvedValueOnce(new Response(csv, { status: 200 }));
    const sleep = vi.fn(async () => undefined);
    const result = await downloadAuthorizedStations(DEFAULT_ANP_AUTHORIZED_STATIONS_URL, [{ municipality: "Águas Lindas de Goiás", state: "GO" }], { fetchImpl, sleep, retryDelayMs: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(100);
    expect(result.stations).toHaveLength(1);
  });

  it("não repete respostas de bloqueio e deixa o catálogo anterior para o fallback operacional", async () => {
    const fetchImpl = vi.fn(async () => new Response("bloqueado", { status: 403 }));
    await expect(downloadAuthorizedStations(DEFAULT_ANP_AUTHORIZED_STATIONS_URL, [], { fetchImpl, retryDelayMs: 1 })).rejects.toThrow("403");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
