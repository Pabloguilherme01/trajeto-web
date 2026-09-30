import { describe, expect, it } from "vitest";
import { buildDirectoryCards, getDirectoryGasolinePrice, matchesFuelFilter } from "./stationDirectoryModel";

const local = {
  id: "local-1",
  legalName: "Posto Central",
  displayName: "Posto Central",
  cnpj: "12345678000199",
  neighborhood: "Centro",
  address: "Rua A",
  brand: "Shell",
  aliases: [],
  status: "cadastro_ativo" as const,
  sourceNote: "",
};

const anp = {
  cnpj: "12345678000199",
  codigoSimp: null,
  autorizacao: null,
  dataPublicacao: null,
  razaoSocial: "Posto Central",
  endereco: "Rua A",
  complemento: null,
  bairro: "Centro",
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
  dataObtencao: null,
  origemInformacao: "ANP",
  situacaoConstatada: null,
  observacao: null,
  statusSigaf: null,
  src: null,
  inadimplenciaPMQC: null,
  products: [{ produto: "Gasolina comum", classe: null, tancagem: null, unidadeMedidaTancagem: null, quantidadeBicos: null }],
};

describe("stationDirectoryModel", () => {
  it("consolidates local and ANP into one card by CNPJ", () => {
    const cards = buildDirectoryCards([local], [anp]);
    expect(cards).toHaveLength(1);
    expect(cards[0].anp?.cnpj).toBe(local.cnpj);
  });

  it("matches fuel using either an individual price or ANP product", () => {
    const cards = buildDirectoryCards([local], [anp]);
    const prices = new Map();
    expect(matchesFuelFilter(cards[0], "gasolina-comum", prices)).toBe(true);
  });

  it("does not invent a gasoline price", () => {
    const cards = buildDirectoryCards([local], [anp]);
    const prices = new Map();
    expect(getDirectoryGasolinePrice(cards[0], prices)).toBeNull();
  });
});
