import { describe, expect, it } from "vitest";
import { stationFieldEvidence } from "./stationEntity";

describe("stationFieldEvidence", () => {
  it("attributes populated fields to their real sources", () => {
    const fields = stationFieldEvidence({
      anp: {
        cnpj: "12345678000199",
        codigoSimp: null,
        autorizacao: null,
        dataPublicacao: null,
        razaoSocial: "Posto Central",
        endereco: "Rua A",
        complemento: null,
        bairro: null,
        cep: null,
        uf: "GO",
        municipio: "Águas Lindas de Goiás",
        distribuidora: "Shell",
        dataVinculacao: null,
        latitude: -15.75,
        longitude: -48.28,
        latitudeAnp4c: null,
        longitudeAnp4c: null,
        validacao: null,
        estimativaAcuraciaM: null,
        srid: null,
        sistemaReferenciaCoordenadas: null,
        dataObtencao: new Date().toISOString(),
        origemInformacao: "ANP",
        situacaoConstatada: null,
        observacao: null,
        statusSigaf: null,
        src: null,
        inadimplenciaPMQC: null,
        products: [],
      },
      local: {
        id: "x",
        legalName: "Posto Central",
        displayName: "Posto Central",
        cnpj: "12345678000199",
        neighborhood: "Centro",
        address: "Rua A",
        brand: "Shell",
        aliases: [],
        status: "cadastro_ativo",
        sourceNote: "",
        mapData: { operationalStatus: "open", observedAt: new Date().toISOString(), source: "maps" },
      },
      price: {
        cnpj: "12345678000199",
        razaoSocial: "Posto Central",
        endereco: null,
        bairro: null,
        municipio: "Águas Lindas de Goiás",
        uf: "GO",
        produto: "Gasolina comum",
        productKey: "gasolina-comum",
        salePrice: 6.2,
        unit: "L",
        collectionDate: new Date().toISOString(),
        referencePeriod: "semanal",
        source: "ANP",
      },
    });
    expect(fields).toHaveLength(7);
    expect(fields.filter(field => field.available)).toHaveLength(7);
    expect(fields.find(field => field.field === "coordinates")?.source).toBe("ANP");
    expect(fields.find(field => field.field === "status")?.source).toBe("Google");
  });
});
