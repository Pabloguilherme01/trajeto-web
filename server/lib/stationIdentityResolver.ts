type GoogleStation = { name: string; address: string };
type AuthorizedStation = { authorization: string; legalName: string; address: string; brand: string };

export type StationIdentityMatch = {
  status: "probable" | "unresolved";
  confidence: number;
  authorization: string | null;
  legalName: string | null;
  brand: string | null;
  source: "anp" | null;
};

const ignoredTokens = new Set(["auto", "posto", "de", "do", "da", "dos", "das", "combustivel", "combustiveis", "ltda", "me", "eireli", "s", "sn"]);

function tokens(value: string) {
  return new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").split(" ").filter(token => token.length > 1 && !ignoredTokens.has(token)));
}

function overlap(first: Set<string>, second: Set<string>) {
  if (!first.size || !second.size) return 0;
  let common = 0;
  for (const token of Array.from(first)) if (second.has(token)) common += 1;
  return common / Math.min(first.size, second.size);
}

export function resolveStationIdentity(station: GoogleStation, authorizedStations: AuthorizedStation[]): StationIdentityMatch {
  const stationNameTokens = tokens(station.name);
  const stationAddressTokens = tokens(station.address);
  const candidate = authorizedStations.map(authorized => {
    const name = overlap(stationNameTokens, tokens(authorized.legalName));
    const address = overlap(stationAddressTokens, tokens(authorized.address));
    return { authorized, confidence: Math.round((address * 0.7 + name * 0.3) * 100) / 100 };
  }).sort((a, b) => b.confidence - a.confidence)[0];

  if (!candidate || candidate.confidence < 0.75) return { status: "unresolved", confidence: candidate?.confidence ?? 0, authorization: null, legalName: null, brand: null, source: null };
  return { status: "probable", confidence: candidate.confidence, authorization: candidate.authorized.authorization, legalName: candidate.authorized.legalName, brand: candidate.authorized.brand, source: "anp" };
}
