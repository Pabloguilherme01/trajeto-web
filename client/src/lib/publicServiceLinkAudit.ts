import type { PublicService } from "./publicServices";

export type ServiceLinkRole = "source" | "action";
export type ServiceLink = {
  url: string;
  hostname: string;
  roles: ServiceLinkRole[];
  serviceIds: string[];
  sourceLabels: string[];
  lastDeclaredCheck: string | null;
};
export type ServiceLinkIssue = { id: string; field: "id" | "sourceUrl" | "actionUrl"; reason: string };

function checkedHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      /\s/.test(url) ||
      parsed.hostname === "localhost" ||
      parsed.hostname.endsWith(".localhost") ||
      parsed.hostname.endsWith(".local") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname) ||
      parsed.hostname.includes(":")
    ) return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Metadata-only inventory: no HTTP requests, no geolocation and no mutations. */
export function auditPublicServiceLinks(services: readonly PublicService[]) {
  const links = new Map<string, ServiceLink>();
  const issues: ServiceLinkIssue[] = [];
  const ids = new Set<string>();
  for (const service of services) {
    if (!service.id.trim() || ids.has(service.id)) {
      issues.push({ id: service.id, field: "id", reason: "empty or duplicate service id" });
    }
    ids.add(service.id);
    for (const field of ["sourceUrl", "actionUrl"] as const) {
      const url = service[field];
      if (!url && field === "actionUrl") continue;
      const hostname = checkedHost(url ?? "");
      if (!hostname) {
        issues.push({ id: service.id, field, reason: "invalid or non-public HTTPS URL" });
        continue;
      }
      let entry = links.get(url!);
      if (!entry) {
        entry = { url: url!, hostname, roles: [], serviceIds: [], sourceLabels: [], lastDeclaredCheck: null };
        links.set(url!, entry);
      }
      const role: ServiceLinkRole = field === "sourceUrl" ? "source" : "action";
      if (!entry.roles.includes(role)) entry.roles.push(role);
      if (!entry.serviceIds.includes(service.id)) entry.serviceIds.push(service.id);
      if (!entry.sourceLabels.includes(service.sourceLabel)) entry.sourceLabels.push(service.sourceLabel);
      if (service.sourceCheckedAt && role === "source") {
        entry.lastDeclaredCheck = service.sourceCheckedAt;
      }
    }
  }
  return {
    serviceCount: services.length,
    links: Array.from(links.values()).sort((a, b) => a.url.localeCompare(b.url)),
    issues,
    sharedSources: Array.from(links.values()).filter(link => link.roles.includes("source") && link.serviceIds.length > 1).length,
    servicesWithoutSourceCheck: services.filter(service => !service.sourceCheckedAt).length,
  };
}

export type HttpLinkEvidence = {
  url: string;
  checkedAt: string;
  status: number | null;
  finalHostname: string | null;
  classification: "reachable" | "redirect" | "not-found" | "restricted" | "unverified";
  method: "HEAD" | "GET";
};

/** This is only run from an explicit CLI --live command; network errors are not automatically labelled as broken. */
export async function probePublicServiceLink(
  url: string,
  fetchLink: typeof fetch = fetch,
): Promise<HttpLinkEvidence> {
  const checkedAt = new Date().toISOString();
  let method: "HEAD" | "GET" = "HEAD";
  try {
    let response = await fetchLink(url, { method, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (response.status === 405 || response.status === 501) {
      method = "GET";
      response = await fetchLink(url, { method, redirect: "follow", signal: AbortSignal.timeout(8000) });
    }
    void response.body?.cancel().catch(() => undefined);
    const finalHostname = checkedHost(response.url);
    const status = response.status;
    const classification = (status === 404 || status === 410)
      ? "not-found"
      : (status === 401 || status === 403 || status === 429)
        ? "restricted"
        : (status >= 200 && status < 400)
          ? (response.url !== url ? "redirect" : "reachable")
          : "unverified";
    return { url, checkedAt, status, finalHostname, classification, method };
  } catch {
    return { url, checkedAt, status: null, finalHostname: null, classification: "unverified", method };
  }
}
