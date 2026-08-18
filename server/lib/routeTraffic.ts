type Point = { lat: number; lng: number };

import { recordProviderMetric } from "../db";

type TomTomIncident = {
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    delay?: number;
    from?: string;
    to?: string;
    startTime?: string;
    endTime?: string;
    lastReportTime?: string;
    events?: Array<{ description?: string }>;
  };
};

type TomTomResponse = { incidents?: TomTomIncident[] };

export const officialRouteSources = [
  { label: "Detran-DF", detail: "interdições e serviços no Distrito Federal", url: "https://www.detran.df.gov.br/interdicoes-de-transito/" },
  { label: "PRF", detail: "notícias e dados abertos de rodovias federais", url: "https://www.gov.br/prf/pt-br/noticias" },
  { label: "DNIT", detail: "consulta georreferenciada de rodovias federais", url: "https://servicos.dnit.gov.br/vgeo/" },
] as const;

export const anpComVcUrl = "https://anpcomvcpostos.anp.gov.br/";

export type RouteTrafficIncident = {
  id: string;
  description: string;
  severity: "minor" | "moderate" | "major" | "unknown";
  delaySeconds: number | null;
  from: string | null;
  to: string | null;
  reportedAt: string | null;
};

function severity(value: number | undefined): RouteTrafficIncident["severity"] {
  if (value === 1) return "minor";
  if (value === 2) return "moderate";
  if (value === 3 || value === 4) return "major";
  return "unknown";
}

export function routeBoundingBox(origin: Point, destination: Point) {
  const minLng = Math.min(origin.lng, destination.lng);
  const maxLng = Math.max(origin.lng, destination.lng);
  const minLat = Math.min(origin.lat, destination.lat);
  const maxLat = Math.max(origin.lat, destination.lat);
  const paddingLng = Math.min(Math.max((maxLng - minLng) * 0.15, 0.08), 0.22);
  const paddingLat = Math.min(Math.max((maxLat - minLat) * 0.15, 0.08), 0.22);
  const boundedMinLng = Math.max(-180, minLng - paddingLng);
  const boundedMaxLng = Math.min(180, maxLng + paddingLng);
  const boundedMinLat = Math.max(-90, minLat - paddingLat);
  const boundedMaxLat = Math.min(90, maxLat + paddingLat);
  return `${boundedMinLng},${boundedMinLat},${boundedMaxLng},${boundedMaxLat}`;
}

const ACTIONABLE_INCIDENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isClosedDescription(value: string | undefined) {
  return /\b(encerrad[oa]|resolvid[oa]|conclu[ií]d[oa]|closed|cleared|resolved)\b/i.test(value ?? "");
}

function isRecent(value: string | undefined, now: Date) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= now.getTime() + 5 * 60 * 1000 && timestamp >= now.getTime() - ACTIONABLE_INCIDENT_MAX_AGE_MS;
}

export function filterActionableTrafficItems(items: TomTomIncident[], now = new Date()) {
  return items.filter(item => {
    const properties = item.properties ?? {};
    const description = properties.events?.find(event => event.description)?.description;
    const reportedAt = properties.lastReportTime ?? properties.startTime;
    const endedAt = properties.endTime ? new Date(properties.endTime).getTime() : null;
    const noOperationalImpact = (properties.delay ?? 0) <= 0 && !properties.magnitudeOfDelay;
    return !isClosedDescription(description) && !(endedAt && endedAt <= now.getTime()) && !noOperationalImpact && isRecent(reportedAt, now);
  });
}

export function filterIncidentsByMinimumDelay<T extends { delaySeconds: number | null }>(items: T[], minimumDelayMinutes: number) {
  const thresholdSeconds = Math.max(0, minimumDelayMinutes) * 60;
  return items.filter(item => (item.delaySeconds ?? 0) >= thresholdSeconds);
}

function normalizeIncidents(items: TomTomIncident[], now: Date) {
  return filterActionableTrafficItems(items, now).slice(0, 6).map((item, index): RouteTrafficIncident => {
    const properties = item.properties ?? {};
    return {
      id: properties.id ?? `incident-${index}`,
      description: properties.events?.find(event => event.description)?.description ?? "Ocorrência de trânsito reportada pela TomTom",
      severity: severity(properties.magnitudeOfDelay),
      delaySeconds: typeof properties.delay === "number" ? properties.delay : null,
      from: properties.from ?? null,
      to: properties.to ?? null,
      reportedAt: properties.lastReportTime ?? properties.startTime ?? null,
    };
  });
}

export async function routeTrafficStatus(origin: Point, destination: Point) {
  const checkedAt = new Date();
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return { checkedAt, state: "pending" as const, label: "Tráfego ao vivo aguardando ativação", detail: "A duração foi calculada no momento da consulta. Ocorrências ao vivo serão exibidas quando a fonte for autorizada.", incidents: [] as RouteTrafficIncident[], officialSources: officialRouteSources, anpComVcUrl };
  }

  try {
    const startedAt = Date.now();
    const url = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("bbox", routeBoundingBox(origin, destination));
    url.searchParams.set("language", "pt-PT");
    url.searchParams.set("timeValidityFilter", "present");
    url.searchParams.set("fields", "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description},startTime,endTime,lastReportTime,from,to,delay}}}");
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      void recordProviderMetric({ provider: "tomtom", operation: "incident_details", durationMs: Date.now() - startedAt, success: false, statusCode: response.status });
      throw new Error(`Traffic API ${response.status}`);
    }
    const payload = await response.json() as TomTomResponse;
    void recordProviderMetric({ provider: "tomtom", operation: "incident_details", durationMs: Date.now() - startedAt, success: true, statusCode: response.status });
    const incidents = normalizeIncidents(payload.incidents ?? [], checkedAt);
    return {
      checkedAt,
      state: "active" as const,
      label: incidents.length ? `${incidents.length} ocorrência(s) na área da rota` : "Sem ocorrências na área da rota",
      detail: "Ocorrências e atrasos reportados pela TomTom Traffic API no momento da consulta.",
      incidents,
      officialSources: officialRouteSources,
      anpComVcUrl,
    };
  } catch {
    return { checkedAt, state: "unavailable" as const, label: "Fonte de trânsito indisponível", detail: "Não foi possível atualizar as ocorrências agora. A duração da rota continua sendo calculada no momento da consulta.", incidents: [] as RouteTrafficIncident[], officialSources: officialRouteSources, anpComVcUrl };
  }
}
