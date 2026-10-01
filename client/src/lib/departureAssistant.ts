import { normalizeCatalogText } from "./catalogSearch";

export type DepartureMode = "driving" | "walking" | "cycling" | "transit";

export type DepartureSignalKind =
  | "weather"
  | "road"
  | "connectivity"
  | "transit"
  | "offline";

export type DepartureSignal = {
  id: string;
  kind: DepartureSignalKind;
  title: string;
  detail: string;
  resourceId?: string;
  priority: "high" | "medium" | "low";
};

export type DepartureContext = {
  origin?: string;
  destination?: string;
  mode?: DepartureMode;
  online: boolean;
  hasOfflineRoute?: boolean;
};

const DF_CORRIDOR_TERMS = [
  "taguatinga",
  "ceilandia",
  "samambaia",
  "recanto das emas",
  "estrutural",
  "aguas claras",
  "plano piloto",
  "distrito federal",
  "br 070",
];

function includesAny(text: string, terms: string[]) {
  return terms.some(term => text.includes(term));
}

export function isDfCorridorTrip(origin = "", destination = "") {
  const normalizedOrigin = normalizeCatalogText(origin).replace(/br-070/g, "br 070");
  const normalizedDestination = normalizeCatalogText(destination).replace(/br-070/g, "br 070");
  const text = normalizedOrigin + " " + normalizedDestination;
  const brasiliaEndpoint = [normalizedOrigin, normalizedDestination].some(
    endpoint =>
      endpoint.includes("brasilia") &&
      !endpoint.includes("aguas lindas") &&
      !endpoint.includes("jardim brasilia"),
  );
  return brasiliaEndpoint || includesAny(text, DF_CORRIDOR_TERMS);
}

export function getDepartureSignals({
  origin = "",
  destination = "",
  mode = "driving",
  online,
  hasOfflineRoute = false,
}: DepartureContext): DepartureSignal[] {
  const corridor = isDfCorridorTrip(origin, destination);
  const signals: DepartureSignal[] = [];

  if (!online) {
    signals.push({
      id: "offline-now",
      kind: "offline",
      title: "Você está offline",
      detail:
        "Use rotas já salvas e o catálogo incorporado. Alertas e fontes externas só podem ser conferidos quando a conexão voltar.",
      priority: "high",
    });
  } else {
    signals.push({
      id: "weather-check",
      kind: "weather",
      title: "Confira avisos antes de sair",
      detail:
        "O INMET publica avisos oficiais por dia. O Trajeto não presume que exista alerta vigente: abra a fonte para confirmar a condição atual.",
      resourceId: "inmet-alertas",
      priority: "medium",
    });
  }

  if (corridor && mode === "driving") {
    signals.push({
      id: "road-context",
      kind: "road",
      title: "Contexto da BR-070 disponível",
      detail:
        "O DNIT publica pavimento, tráfego, controle de velocidade e outros dados rodoviários. Use como contexto histórico e operacional, não como trânsito ao vivo.",
      resourceId: "dnit-rodovias",
      priority: "medium",
    });

    if (!hasOfflineRoute) {
      signals.push({
        id: "connectivity-prepare",
        kind: "connectivity",
        title: "Vale preparar a rota offline",
        detail:
          "A Anatel publica cobertura teórica 4G/5G. Como o sinal real pode variar no trajeto, salvar a rota reduz dependência de conexão.",
        resourceId: "anatel-cobertura",
        priority: "medium",
      });
    }
  }

  if (corridor && (mode === "transit" || mode === "driving")) {
    signals.push({
      id: "df-transit",
      kind: "transit",
      title: "Transporte DF/Entorno como alternativa",
      detail:
        "O DF deve disponibilizar dados do transporte coletivo em GTFS. O Trajeto só mostrará horários ou atrasos quando houver feed estável e verificável.",
      resourceId: "stpc-df-gtfs",
      priority: mode === "transit" ? "high" : "low",
    });
  }

  return signals.sort((a, b) => {
    const weight = { high: 0, medium: 1, low: 2 };
    return weight[a.priority] - weight[b.priority];
  });
}
