import { describe, expect, it } from "vitest";
import { stationIdentityKey } from "./Stations";

describe("identidade de postos", () => {
  it("trata fontes diferentes com o mesmo CNPJ como o mesmo posto", () => {
    const anp = stationIdentityKey({ cnpj: "55.846.090/0001-28", placeId: null, address: "Recreio", name: "ZM Combustíveis" });
    const local = stationIdentityKey({ cnpj: "55.846.090/0001-28", placeId: "local-zm", address: "Outro formato", name: "Zm Combustiveis" });
    expect(anp).toBe(local);
  });

  it("ignora diferenças de fonte quando o CNPJ é o mesmo", () => {
    expect(stationIdentityKey({ cnpj: "12.560.575/0001-48", placeId: "google-guaira", address: "BR-070", name: "Posto Ipiranga" }))
      .toBe(stationIdentityKey({ cnpj: "12.560.575/0001-48", placeId: null, address: "Quadra 28", name: "Posto Guaíra" }));
  });

  it("usa placeId quando não há CNPJ e endereço normalizado como último recurso", () => {
    expect(stationIdentityKey({ cnpj: null, placeId: "abc", address: "Rua 1", name: "Posto" })).toBe("place:abc");
    expect(stationIdentityKey({ cnpj: null, placeId: null, address: "Av. Águas Líndas, 10", name: "Posto" })).toBe("address:av aguas lindas 10");
  });

  it("keeps station identity stable for very long mobile-facing address text", () => {
    const key = stationIdentityKey({
      cnpj: null,
      placeId: null,
      name: "Posto com nome extremamente longo",
      address: "Avenida de nome muito extenso, Quadra 999, Lote 999, Jardim da Barragem VI, Águas Lindas de Goiás",
    });
    expect(key).toContain("avenida de nome muito extenso");
    expect(key).not.toContain("á");
  });

});
