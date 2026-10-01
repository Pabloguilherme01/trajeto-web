export type LocalGeocodePoint = {
  id: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  verifiedAt: string;
  sourceLabel: string;
  sourceUrl: string;
};

function normalizeLocalGeocodeText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ªº]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const LOCAL_GEOCODE_POINTS: LocalGeocodePoint[] = [
  {
    id: "upa-mansoes-odisseia",
    name: "UPA Mansões Odisseia",
    aliases: ["UPA Mansões Odisseia", "UPA III 24H Mansões Odisseia"],
    lat: -15.77665,
    lng: -48.27935,
    verifiedAt: "2026-10-01",
    sourceLabel: "CNES / localização cadastral publicada",
    sourceUrl: "https://saudenopais.com/estabelecimento/go/upa-iii-24h-mansoes-odisseia-cnes-0431451/",
  },
  {
    id: "heal",
    name: "HEAL · Hospital Estadual de Águas Lindas",
    aliases: [
      "HEAL",
      "HEAL Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho",
      "Hospital Estadual de Águas Lindas Ronaldo Ramos Caiado Filho",
    ],
    lat: -15.74637,
    lng: -48.27584,
    verifiedAt: "2026-10-01",
    sourceLabel: "CNES / localização cadastral publicada",
    sourceUrl: "https://saudenopais.com/estabelecimento/go/hospital-estadual-de-aguas-lindas-ronaldo-ramos-caiado-filho-cnes-4670906/",
  },
  {
    id: "hospital-bom-jesus",
    name: "Hospital Municipal Bom Jesus",
    aliases: ["Hospital Municipal Bom Jesus", "HMBJ"],
    lat: -15.73821,
    lng: -48.29041,
    verifiedAt: "2026-10-01",
    sourceLabel: "OpenStreetMap / Mapcarta",
    sourceUrl: "https://mapcarta.com/W593022479",
  },
  {
    id: "aguas-lindas-shopping",
    name: "Águas Lindas Shopping",
    aliases: ["Águas Lindas Shopping"],
    lat: -15.73528,
    lng: -48.27373,
    verifiedAt: "2026-10-01",
    sourceLabel: "OpenStreetMap / Mapcarta",
    sourceUrl: "https://mapcarta.com/pt/W469784016",
  },
  {
    id: "rodoviaria",
    name: "Rodoviária de Águas Lindas",
    aliases: [
      "Rodoviária de Águas Lindas",
      "Rodoviária de Águas Lindas de Goiás",
      "Terminal Rodoviário de Águas Lindas",
    ],
    lat: -15.71459,
    lng: -48.28851,
    verifiedAt: "2026-10-01",
    sourceLabel: "OpenStreetMap / Mapcarta",
    sourceUrl: "https://mapcarta.com/pt/W1089979274",
  },
  {
    id: "prefeitura",
    name: "Prefeitura de Águas Lindas de Goiás",
    aliases: [
      "Prefeitura de Águas Lindas de Goiás",
      "Prefeitura Municipal de Águas Lindas de Goiás",
      "Prefeitura",
    ],
    lat: -15.753889,
    lng: -48.262222,
    verifiedAt: "2026-10-01",
    sourceLabel: "Coordenadas do centro administrativo municipal",
    sourceUrl: "https://pt.wikipedia.org/wiki/%C3%81guas_Lindas_de_Goi%C3%A1s",
  },
];

export function resolveLocalGeocodePoint(value: string) {
  const query = normalizeLocalGeocodeText(value);
  if (!query) return null;

  for (const point of LOCAL_GEOCODE_POINTS) {
    for (const alias of point.aliases) {
      const normalizedAlias = normalizeLocalGeocodeText(alias);
      if (query === normalizedAlias || query.startsWith(normalizedAlias + " ")) {
        return { lat: point.lat, lng: point.lng };
      }
    }
  }

  return null;
}
