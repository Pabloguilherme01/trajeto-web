import { describe, expect, it } from "vitest";
import {
  ANTT_SEMIURBAN_LINKS, CITY_CORRIDORS, corridorAddressMatches,
  summarizeCorridorAddresses,
} from "./cityMobilityCorridors";

describe("city mobility corridor source and address coverage", () => {
  const jk = CITY_CORRIDORS.find(item => item.id === "avenida-jk")!;
  const one = CITY_CORRIDORS.find(item => item.id === "avenida-1")!;
  const brasil = CITY_CORRIDORS.find(item => item.id === "avenida-brasil")!;
  const brasilia = CITY_CORRIDORS.find(item => item.id === "avenida-brasilia")!;
  it("distinguishes avenue names, nearby streets and numbered extensions", () => {
    expect(corridorAddressMatches("Av. JK, Qd 20, Jardim Brasília", jk)).toBe(true);
    expect(corridorAddressMatches("AVENIDA J.K., Qd 20", jk)).toBe(false); // don't invent aliases
    expect(corridorAddressMatches("Avenida Brasil, setor Centro", brasilia)).toBe(false);
    expect(corridorAddressMatches("Avenida Brasília, Setor 10", brasil)).toBe(false);
    expect(corridorAddressMatches("Avenida 01, Parque da Barragem", one)).toBe(true);
    expect(corridorAddressMatches("Av. 1B, Setor 08", one)).toBe(false);
    expect(corridorAddressMatches("Avenida 10, Parque da Barragem", one)).toBe(false);
    expect(corridorAddressMatches("Rua 1, Parque da Barragem", one)).toBe(false);
    expect(corridorAddressMatches(undefined, one)).toBe(false);
  });
  it("does not count unknown-only companies as mapped named shops", () => {
    const records = [
      { id: "one", name: "Mercado Real", address: "Avenida JK, QD 22", business: { cnpj: "1" } },
      { id: "two", name: "CNPJ 12345678000190", address: "Av. JK, QD 21", business: { cnpj: "2" } },
      { id: "three", name: "Sem endereço", business: { cnpj: "3" } },
      { id: "four", name: "Escola", address: "Avenida JK, QD 21" },
    ];
    const services = [
      { id: "clinic", name: "Clínica Pública", address: "AV JK, QD 10", sourceUrl: "https://gov.br", category: "saude" },
      { id: "online", name: "Serviço remoto", sourceUrl: "https://gov.br", category: "digital" },
    ];
    const result = summarizeCorridorAddresses(jk, records, services, name => !name.startsWith("CNPJ "));
    expect(result.namedBusinesses).toBe(1);
    expect(result.cnpjOnly).toBe(1);
    expect(result.examples.map(row => row.name)).toEqual(["Mercado Real"]);
    expect(result.publicServices.map(row => row.id)).toEqual(["clinic"]);
  });
  it("keeps transit proximity separate from any certified avenue itinerary", () => {
    expect(jk.nearbyBus?.lineIds).toEqual(["100", "2304", "2402", "2424", "2862"]);
    expect(CITY_CORRIDORS.every(x => x.aliases.length && x.name && x.area)).toBe(true);
    expect(new Set(CITY_CORRIDORS.map(x => x.id)).size).toBe(CITY_CORRIDORS.length);
    expect(ANTT_SEMIURBAN_LINKS.map(x => x.destination)).toEqual([
      "Brasília", "Brazlândia", "Ceilândia", "Taguatinga",
    ]);
    expect(ANTT_SEMIURBAN_LINKS.every(x => !("routeGeometry" in x))).toBe(true);
  });
});
