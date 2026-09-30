import { describe, expect, it } from "vitest";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { AnpStation } from "@shared/anpRevendedores";
import {
  buildDirectoryCards,
  buildStationMapItems,
  directoryCardDistanceKm,
  filterAndSortDirectoryCards,
  filterLocalDirectory,
  getLocalDirectoryFacets,
  isBroadAguasLindasQuery,
  normalizeStationText,
} from "./stationDirectoryLogic";

const local = (overrides: Partial<LocalStationRecord> = {}): LocalStationRecord => ({
  id: "local-1",
  legalName: "Posto Teste LTDA",
  displayName: "Posto Teste",
  cnpj: "11111111000111",
  neighborhood: "Centro",
  address: "Rua A, 10",
  brand: "Marca B",
  aliases: [],
  status: "cadastro_ativo",
  sourceNote: "teste",
  ...overrides,
});

const anp = (overrides: Partial<AnpStation> = {}): AnpStation => ({
  cnpj: "11111111000111",
  codigoSimp: null,
  autorizacao: null,
  dataPublicacao: null,
  razaoSocial: "Posto Teste LTDA",
  endereco: "Rua A, 10",
  complemento: null,
  bairro: "Centro",
  cep: null,
  uf: "GO",
  municipio: "Águas Lindas de Goiás",
  distribuidora: "Marca B",
  dataVinculacao: null,
  latitude: -15.73,
  longitude: -48.28,
  latitudeAnp4c: null,
  longitudeAnp4c: null,
  validacao: null,
  estimativaAcuraciaM: null,
  srid: null,
  sistemaReferenciaCoordenadas: null,
  dataObtencao: null,
  origemInformacao: null,
  situacaoConstatada: null,
  observacao: null,
  statusSigaf: null,
  src: null,
  inadimplenciaPMQC: null,
  products: [{ produto: "GASOLINA COMUM", tancagem: null, unidadeMedidaTancagem: null, quantidadeBicos: null, classe: null }],
  ...overrides,
});

const price = (cnpj: string, productKey: AnpPriceRecord["productKey"], salePrice: number): AnpPriceRecord => ({
  cnpj,
  razaoSocial: null,
  endereco: null,
  bairro: null,
  municipio: "Águas Lindas de Goiás",
  uf: "GO",
  produto: productKey,
  productKey,
  salePrice,
  unit: "L",
  collectionDate: "2026-09-26",
  referencePeriod: "20/09/2026 a 26/09/2026",
  source: "ANP",
});

describe("stationDirectoryLogic", () => {
  it("normaliza texto e reconhece consultas amplas da cidade", () => {
    expect(normalizeStationText(" Águas-Lindas! ")).toBe("aguas lindas");
    expect(isBroadAguasLindasQuery("Postos em Águas Lindas")).toBe(true);
    expect(isBroadAguasLindasQuery("Jardim Brasília")).toBe(false);
  });

  it("filtra catálogo local e cria facetas determinísticas", () => {
    const stations = [
      local(),
      local({ id: "2", cnpj: "22222222000122", displayName: "Segundo", neighborhood: "Jardim", brand: null, address: null }),
    ];
    expect(filterLocalDirectory(stations, {
      neighborhood: "Centro",
      brand: "all",
      addressOnly: true,
      verifiedOnly: false,
      mappedOnly: false,
    }).map(item => item.cnpj)).toEqual(["11111111000111"]);
    expect(getLocalDirectoryFacets(stations)).toEqual({
      brands: ["Marca B", "Sem bandeira"],
      neighborhoods: ["Centro", "Jardim"],
    });
  });

  it("concilia por CNPJ sem duplicar registros ANP", () => {
    const extra = anp({ cnpj: "33333333000133", razaoSocial: "Somente ANP" });
    const cards = buildDirectoryCards([local()], [anp(), extra]);
    expect(cards).toHaveLength(2);
    expect(cards[0].local?.cnpj).toBe(cards[0].anp?.cnpj);
    expect(cards[1]).toMatchObject({ key: "33333333000133", local: null });
  });

  it("aplica combustível e ordena pelo preço do combustível selecionado", () => {
    const first = local();
    const second = local({ id: "2", cnpj: "22222222000122", displayName: "Etanol barato" });
    const cards = buildDirectoryCards([first, second], [
      anp(),
      anp({ cnpj: second.cnpj, razaoSocial: second.legalName, products: [{ produto: "ETANOL", tancagem: null, unidadeMedidaTancagem: null, quantidadeBicos: null, classe: null }] }),
    ]);
    const prices = new Map<string, AnpPriceRecord[]>([
      [first.cnpj, [price(first.cnpj, "gasolina-comum", 6.2)]],
      [second.cnpj, [price(second.cnpj, "etanol", 4.1)]],
    ]);
    const result = filterAndSortDirectoryCards({
      cards,
      search: "",
      sort: "price",
      userCoords: null,
      fuel: "etanol",
      pricesByCnpj: prices,
    });
    expect(result.map(item => item.key)).toEqual([second.cnpj]);
  });

  it("calcula distância localmente e deduplica mapa por CNPJ", () => {
    const cards = buildDirectoryCards([local({ anp: { latitude: -15.73, longitude: -48.28 } })], [anp()]);
    expect(directoryCardDistanceKm(cards[0], { lat: -15.73, lng: -48.28 })).toBeCloseTo(0, 6);
    const map = buildStationMapItems({
      anpStations: [anp()],
      localStations: [local({ anp: { latitude: -15.73, longitude: -48.28 } })],
      directoryCards: cards,
      liveStations: [],
      offlineMap: [],
    });
    expect(map).toHaveLength(1);
    expect(map[0].source).toBe("ANP");
  });
});
