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
    const redirect = vi.fn(async (url: RequestInfo | URL) => ({
      status: String(url).endsWith("/old") ? 302 : 200,
      headers: { get: () => "/new" },
      body: null,
    } as unknown as Response));
    expect((await probePublicServiceLink("https://gov.br/old", redirect))).toMatchObject({
      classification: "redirect", finalHostname: "gov.br", status: 200,
    });
    expect(redirect).toHaveBeenCalledTimes(2);
    expect(redirect.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    const restricted = vi.fn(async () => ({ status: 429, url: "https://gov.br/throttle", body: null } as Response));
    expect((await probePublicServiceLink("https://gov.br/throttle", restricted)).classification).toBe("restricted");
    const unavailable = vi.fn(async () => { throw new Error("offline"); });
    expect((await probePublicServiceLink("https://gov.br/s", unavailable)).classification).toBe("unverified");
  });


  it("refuses redirects to local or unencrypted targets without contacting them", async () => {
    for (const location of [
      "http://gov.br/insecure", "http://127.0.0.1/internal",
      "https://localhost/private", "https://10.0.0.1/private",
      "https://user:password@gov.br/private", "file:///etc/passwd",
    ]) {
      const fetchLink = vi.fn(async () => ({
        status: 302, headers: { get: () => location }, body: null,
      } as unknown as Response));
      const result = await probePublicServiceLink("https://gov.br/start", fetchLink);
      expect(result.classification).toBe("unverified");
      expect(result.finalHostname).toBeNull();
      expect(fetchLink).toHaveBeenCalledTimes(1);
      expect(fetchLink.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    }
  });

  it("handles relative redirects, multi-hop chains and a bounded maximum", async () => {
    const urls: string[] = [];
    const fetchLink = vi.fn(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      const index = urls.length;
      return {
        status: index <= 8 ? 301 : 200,
        headers: { get: () => "/hop-" + index },
        body: null,
      } as unknown as Response;
    });
    const result = await probePublicServiceLink("https://gov.br/start", fetchLink);
    expect(result).toMatchObject({ classification: "unverified", status: 301, finalHostname: null });
    expect(urls).toHaveLength(6);
  });

  it("does not contact the network for invalid starting targets", async () => {
    const fetchLink = vi.fn();
    const result = await probePublicServiceLink("http://127.0.0.1/internal", fetchLink);
    expect(result).toMatchObject({ classification: "unverified", status: null });
    expect(fetchLink).not.toHaveBeenCalled();
  });

  it("confirms HEAD 404/410 with GET before declaring an official link missing", async () => {
    for (const headStatus of [404, 410]) {
      const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({
        status: init?.method === "HEAD" ? headStatus : 200,
        body: null,
        headers: { get: () => null },
      } as unknown as Response));
      const result = await probePublicServiceLink("https://gov.br/servico", request);
      expect(result).toMatchObject({
        classification: "reachable", status: 200, method: "GET",
        finalHostname: "gov.br",
      });
      expect(request.mock.calls.map(call => call[1]?.method)).toEqual(["HEAD", "GET"]);
    }
  });

  it("reports not found only when GET confirms a 404/410 response", async () => {
    for (const status of [404, 410]) {
      const request = vi.fn(async () => ({
        status, body: null, headers: { get: () => null },
      } as unknown as Response));
      const result = await probePublicServiceLink("https://gov.br/ficha", request);
      expect(result).toMatchObject({ classification: "not-found", status, method: "GET" });
      expect(request).toHaveBeenCalledTimes(2);
    }
  });

  it("does not mark a HEAD 404 as broken when the verifying GET fails", async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") throw new Error("temporary connection failure");
      return { status: 404, body: null, headers: { get: () => null } } as unknown as Response;
    });
    expect(await probePublicServiceLink("https://gov.br/ficha", request)).toMatchObject({
      classification: "unverified", status: null, method: "GET",
    });
    expect(request).toHaveBeenCalledTimes(2);
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
