/**
 * Evidence-based starting index for the public city corridor explorer.
 * The road hierarchy is historical (municipal Law 341/2002), not a live
 * traffic/route survey. A bus seen NEAR an avenue is never inferred to run
 * along the avenue itself. No GPS, stop positions or business entrances.
 */
export type CityCorridor = {
  id: string;
  name: string;
  area: string;
  role: "principal" | "integracao" | "secundaria";
  aliases: readonly string[];
  nearbyBus?: { lineIds: readonly string[]; sourceUrl: string; checkedAt: string };
};
export const ROAD_HIERARCHY_SOURCE = "https://legislacao.aguaslindasdegoias.go.gov.br/leis/394";
export const ANTT_OPERATIONAL_SOURCE = "https://www.gov.br/antt/pt-br/assuntos/passageiros/transportesemiurbano/informacoes-operacionais-do-semiurbano";
export const ANTT_TARIFF_SOURCE = "https://www.gov.br/antt/pt-br/assuntos/noticias-defeso-eleitoral/entorno-do-df-novas-tarifas-da-taguatur-entram-em-vigor-a-partir-de-28-de-junho";
const JK_NEARBY_SOURCE = "https://moovitapp.com/index/pt-br/transporte_p%C3%BAblico-Avenida_Jk-Brasilia-street_12895751-1702";

/** Named city corridors from a 2002 law; list is NOT a real-time network. */
export const CITY_CORRIDORS: readonly CityCorridor[] = [
  { id: "br-070", name: "BR-070", area: "Travessia urbana", role: "principal", aliases: ["br 70"] },
  { id: "go-547", name: "GO-547", area: "Travessia urbana", role: "principal", aliases: ["go 547"] },
  { id: "avenida-cuiaba", name: "Avenida Cuiabá", area: "Eixo urbano", role: "principal", aliases: ["avenida cuiaba"] },
  { id: "avenida-brasilia", name: "Avenida Brasília", area: "Eixo urbano e Jardim da Barragem", role: "principal", aliases: ["avenida brasilia"] },
  { id: "avenida-brasil", name: "Avenida Brasil", area: "Park das Águas Bonitas / Quinta das Águas Lindas", role: "integracao", aliases: ["avenida brasil"] },
  { id: "avenida-1", name: "Avenida 1", area: "Parque da Barragem", role: "integracao", aliases: ["avenida 1"] },
  { id: "avenida-central", name: "Avenida Central", area: "Morada da Serra", role: "integracao", aliases: ["avenida central"] },
  { id: "rua-pau-brasil", name: "Rua Pau-Brasil", area: "Jardim Santa Lúcia", role: "integracao", aliases: ["rua pau brasil"] },
  { id: "avenida-jk", name: "Avenida JK", area: "Jardim da Barragem / trechos homônimos", role: "secundaria", aliases: ["avenida jk", "avenida juscelino kubitschek"],
    nearbyBus: { lineIds: ["100", "2304", "2402", "2424", "2862"], sourceUrl: JK_NEARBY_SOURCE, checkedAt: "2026-10-14" } },
  { id: "avenida-diagonal", name: "Avenida Diagonal", area: "Mansões Olinda", role: "secundaria", aliases: ["avenida diagonal"] },
  { id: "avenida-porto-velho", name: "Avenida Porto Velho", area: "Jardim da Barragem", role: "secundaria", aliases: ["avenida porto velho"] },
  { id: "avenida-goiania", name: "Avenida Goiânia", area: "Jardim da Barragem", role: "secundaria", aliases: ["avenida goiania"] },
  { id: "avenida-santa-luzia", name: "Avenida Santa Luzia", area: "Pérola da Barragem", role: "secundaria", aliases: ["avenida santa luzia"] },
  { id: "avenida-tiradentes", name: "Avenida Tiradentes", area: "Pérola da Barragem", role: "secundaria", aliases: ["avenida tiradentes"] },
  { id: "avenida-tancredo-neves", name: "Avenida Tancredo Neves", area: "Pérola da Barragem", role: "secundaria", aliases: ["avenida tancredo neves"] },
  { id: "avenida-mato-grosso", name: "Avenida Mato Grosso", area: "Portal da Barragem", role: "secundaria", aliases: ["avenida mato grosso"] },
  { id: "avenida-2", name: "Avenida 2", area: "Parque da Barragem", role: "secundaria", aliases: ["avenida 2"] },
  { id: "avenida-3", name: "Avenida 3", area: "Parque da Barragem", role: "secundaria", aliases: ["avenida 3"] },
  { id: "avenida-4", name: "Avenida 4", area: "Parque da Barragem", role: "secundaria", aliases: ["avenida 4"] },
  { id: "avenida-5", name: "Avenida 5", area: "Parque da Barragem", role: "secundaria", aliases: ["avenida 5"] },
  { id: "avenida-8", name: "Avenida 8", area: "Parque da Barragem", role: "secundaria", aliases: ["avenida 8"] },
];

/** ANTT documents regional city-to-city links, NOT mapped local road paths. */
export const ANTT_SEMIURBAN_LINKS = [
  { destination: "Brasília", source: ANTT_OPERATIONAL_SOURCE },
  { destination: "Brazlândia", source: ANTT_OPERATIONAL_SOURCE },
  { destination: "Ceilândia", source: ANTT_TARIFF_SOURCE, publishedFare: "R$ 5,85" },
  { destination: "Taguatinga", source: ANTT_TARIFF_SOURCE, publishedFare: "R$ 7,65" },
] as const;

/** Normalization is for address text, never used to derive geographic points. */
function streetKey(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bav\.?\s+/g, "avenida ")
    .replace(/\br\.?\s+/g, "rua ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(br|go)\s+0+(\d+)\b/g, "$1 $2")
    .replace(/\b0+(\d+)\b/g, "$1")
    .trim().replace(/\s+/g, " ");
}

/**
 * A street-name match is textual address evidence only. It is NOT proof
 * that a shop fronts the avenue or that the entrance is at any map point.
 */
export function corridorAddressMatches(address: string | undefined, corridor: CityCorridor): boolean {
  if (!address) return false;
  const text = " " + streetKey(address) + " ";
  return corridor.aliases.some(alias => text.includes(" " + streetKey(alias) + " "));
}

export type CommerceAddressRecord = {
  id: string; name: string; address?: string;
  business?: { cnpj: string } | undefined;
};
export type PublicAddressRecord = {
  id: string; name: string; address?: string; sourceUrl: string; category: string;
};
export function summarizeCorridorAddresses(
  corridor: CityCorridor,
  companies: readonly CommerceAddressRecord[],
  services: readonly PublicAddressRecord[],
  readableName: (name: string) => boolean,
) {
  let namedBusinesses = 0, cnpjOnly = 0;
  const examples: CommerceAddressRecord[] = [];
  for (const company of companies) {
    if (!company.business || !corridorAddressMatches(company.address, corridor)) continue;
    if (readableName(company.name)) {
      namedBusinesses++;
      if (examples.length < 5) examples.push(company);
    } else cnpjOnly++;
  }
  const publicServices = services.filter(service =>
    corridorAddressMatches(service.address, corridor));
  return { namedBusinesses, cnpjOnly, examples, publicServices };
}
