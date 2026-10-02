import { describe, expect, it } from "vitest";
import { stationIdentityKey } from "./Stations";

describe("identidade de postos", () => {
  it("trata fontes diferentes com o mesmo CNPJ como o mesmo posto", () => {
    const anp = stationIdentityKey({ cnpj: "55.846.090/0001-28", placeId: null, address: "Recreio", name: "ZM Combustíveis" });
    const local = stationIdentityKey({ cnpj: "55.846.090/0001-28", placeId: "local-zm", address: "Outro formato", name: "Zm Combustiveis" });
    expect(anp).toBe(local);
  });

  it("usa placeId quando não há CNPJ e endereço normalizado como último recurso", () => {
    expect(stationIdentityKey({ cnpj: null, placeId: "abc", address: "Rua 1", name: "Posto" })).toBe("place:abc");
    expect(stationIdentityKey({ cnpj: null, placeId: null, address: "Av. Águas Líndas, 10", name: "Posto" })).toBe("address:av aguas lindas 10");
  });
});
