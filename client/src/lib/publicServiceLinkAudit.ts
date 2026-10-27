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
      parsed.hostname.endsWith(".") ||
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
  // Validate every hop ourselves. fetch(..., redirect: "follow") could follow
  // an otherwise public official URL into an internal HTTP/local endpoint.
  if (!checkedHost(url)) {
    return { url, checkedAt, status: null, finalHostname: null, classification: "unverified", method };
  }
  let current = url;
  let redirects = 0;
  const signal = AbortSignal.timeout(8000);
  try {
    while (true) {
      const response = await fetchLink(current, { method, redirect: "manual", signal });
      void response.body?.cancel().catch(() => undefined);
      const status = response.status;
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.get("location");
        if (!location || redirects >= 5) {
          return { url, checkedAt, status, finalHostname: null, classification: "unverified", method };
        }
        const next = new URL(location, current).toString();
        if (!checkedHost(next)) {
          return { url, checkedAt, status, finalHostname: null, classification: "unverified", method };
        }
        current = next;
        redirects += 1;
        continue;
      }
      // Several official portals reject HEAD with 404/410 even though a
      // normal page request succeeds. Confirm absence via GET before
      // reporting a link as not found. GET errors remain "unverified".
      if (method === "HEAD" && (status === 405 || status === 501 || status === 404 || status === 410)) {
        method = "GET";
        continue;
      }
      const classification = status === 404 || status === 410
        ? "not-found"
        : status === 401 || status === 403 || status === 429
          ? "restricted"
          : status >= 200 && status < 300
            ? redirects > 0 ? "redirect" : "reachable"
            : "unverified";
      return { url, checkedAt, status, finalHostname: checkedHost(current), classification, method };
    }
  } catch {
    return { url, checkedAt, status: null, finalHostname: null, classification: "unverified", method };
  }
}
