import { describe, expect, it } from "vitest";
import { anpPricePlaceId, verifiedPlannerPriceReferences } from "./plannerPriceReference";

const authorized = [{ authorization: "12.345.678/0001-90", legalName: "Auto Posto Rota Sul Ltda", address: "BR 070 KM 12 Aguas Lindas", brand: "BR" }];
const snapshots = [{ placeId: "anp-cnpj-12345678000190", product: "gasoline", price: "5.89", collectedAt: new Date("2026-08-14") }];

describe("planner price references", () => {
  it("forma a chave de referência ANP apenas com dígitos da autorização", () => {
    expect(anpPricePlaceId("12.345.678/0001-90")).toBe("anp-cnpj-12345678000190");
  });

  it("vincula gasolina somente quando nome e endereço atingem correspondência conservadora", () => {
    const [station] = verifiedPlannerPriceReferences([{ placeId: "google-1", name: "Auto Posto Rota Sul", address: "BR 070 KM 12 Aguas Lindas", lat: -15.7, lng: -48.2 }], authorized, snapshots);
    expect(station).toMatchObject({ priceReference: { price: "5.89" }, anpMatch: { status: "probable" } });
  });

  it("não atribui preço quando a identidade do posto permanece incerta", () => {
    const [station] = verifiedPlannerPriceReferences([{ placeId: "google-2", name: "Posto Sem Relação", address: "Rua Distante 99", lat: -15.7, lng: -48.2 }], authorized, snapshots);
    expect(station).toMatchObject({ priceReference: null, anpMatch: { status: "unresolved" } });
  });
});
