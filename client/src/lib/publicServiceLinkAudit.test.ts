import { describe, expect, it, vi } from "vitest";
import { PUBLIC_SERVICES, type PublicService } from "./publicServices";
import { auditPublicServiceLinks, probePublicServiceLink } from "./publicServiceLinkAudit";

function service(id: string, sourceUrl: string, actionUrl?: string): PublicService {
  return {
    id, name: id, category: "cidadania", description: "Referência de teste",
    sourceLabel: "Prefeitura de Águas Lindas", sourceUrl, actionUrl,
  };
}

describe("auditoria de links públicos sem acessar a rede", () => {
  it("keeps unique official source/action URLs and distinguishes legitimate shared sources", () => {
    const report = auditPublicServiceLinks([
      service("posto-a", "https://example.gov.br/fontes", "https://example.gov.br/servico"),
      service("posto-b", "https://example.gov.br/fontes"),
    ]);
    expect(report.issues).toEqual([]);
    expect(report.links).toHaveLength(2);
    expect(report.sharedSources).toBe(1);
    expect(report.links.find(link => link.roles.includes("action"))?.serviceIds).toEqual(["posto-a"]);
  });

  it("flags duplicate IDs, unsafe schemes, credentials and local addresses without making a request", () => {
    const report = auditPublicServiceLinks([
      service("a", "http://example.org"),
      service("a", "https://private:secret@example.org"),
      service("b", "https://localhost/source", "javascript:alert(1)"),
      service("c", "https://192.168.0.1/secret"),
    ]);
    expect(report.issues.map(issue => issue.field)).toEqual([
      "sourceUrl", "id", "sourceUrl", "sourceUrl", "actionUrl", "sourceUrl",
    ]);
  });

  it("keeps the real public service catalog structurally valid and read-only", () => {
    const report = auditPublicServiceLinks(PUBLIC_SERVICES);
    expect(report.issues).toEqual([]);
    expect(report.links.length).toBeGreaterThan(20);
    expect(report.serviceCount).toBe(PUBLIC_SERVICES.length);
  });

  it("records status, redirection and restricted URLs without claiming a transient failure is broken", async () => {
    const redirect = vi.fn(async () => ({ status: 200, url: "https://gov.br/new", body: null } as Response));
    expect((await probePublicServiceLink("https://gov.br/old", redirect)).classification).toBe("redirect");
    const restricted = vi.fn(async () => ({ status: 429, url: "https://gov.br/throttle", body: null } as Response));
    expect((await probePublicServiceLink("https://gov.br/throttle", restricted)).classification).toBe("restricted");
    const unavailable = vi.fn(async () => { throw new Error("offline"); });
    expect((await probePublicServiceLink("https://gov.br/s", unavailable)).classification).toBe("unverified");
  });

  it("falls back from HEAD to GET for servers rejecting HEAD", async () => {
    const method = vi.fn(async (_: RequestInfo | URL, init?: RequestInit) => ({
      status: init?.method === "HEAD" ? 405 : 200,
      url: "https://gov.br/info",
      body: null,
    } as Response));
    const result = await probePublicServiceLink("https://gov.br/info", method);
    expect(result).toMatchObject({ classification: "reachable", method: "GET" });
    expect(method).toHaveBeenCalledTimes(2);
  });
});
