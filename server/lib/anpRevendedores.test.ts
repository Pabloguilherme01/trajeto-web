import { describe, expect, it, vi } from "vitest";
import { fetchAnpStations } from "./anpRevendedores";

describe("cliente da API ANP", () => {
  it("consulta por município/UF e normaliza o retorno", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      succeeded: true,
      data: [
        { CNPJ: "12.345.678/0001-90", RAZAOSOCIAL: "POSTO TESTE", PRODUTO: "GASOLINA C", TANCAGEM: "20,00", QUANTIDADEBICOS: 4 },
      ],
      searchPageFilter: { numeroPagina: 1, tamanhoPagina: 5000, totalRegistro: 1 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await fetchAnpStations("AGUASLINDASDEGOIAS", "GO");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("municipio=AGUASLINDASDEGOIAS"),
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
    );
    expect(result.totalStations).toBe(1);
    expect(result.rows[0]?.cnpj).toBe("12345678000190");
    fetchMock.mockRestore();
  });
});
