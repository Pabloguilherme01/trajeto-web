import { describe, expect, it } from "vitest";
import { resolveStationIdentity } from "./stationIdentityResolver";

describe("resolveStationIdentity", () => {
  const authorized = [{ authorization: "PR/GO123", legalName: "AUTO POSTO CENTRAL LTDA", address: "RUA CENTRAL 120", brand: "BANDEIRA BRANCA" }];

  it("classifica um vínculo por nome e endereço como provável, nunca como confirmado", () => {
    expect(resolveStationIdentity({ name: "Posto Central", address: "Rua Central, 120" }, authorized)).toMatchObject({ status: "probable", confidence: 1, authorization: "PR/GO123", source: "anp" });
  });

  it("mantém dados insuficientes como não resolvidos", () => {
    expect(resolveStationIdentity({ name: "Posto Distante", address: "Avenida Sem Relação" }, authorized)).toEqual({ status: "unresolved", confidence: 0, authorization: null, legalName: null, brand: null, source: null });
  });
});
