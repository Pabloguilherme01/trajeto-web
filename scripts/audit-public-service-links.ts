import { PUBLIC_SERVICES } from "../client/src/lib/publicServices";
import { auditPublicServiceLinks, probePublicServiceLink } from "../client/src/lib/publicServiceLinkAudit";

async function main() {
  const options = new Set(process.argv.slice(2));
  const report = auditPublicServiceLinks(PUBLIC_SERVICES);
  const live = options.has("--live");
  const json = options.has("--json");
  const arg = process.argv.find(value => value.startsWith("--limit="));
  const limit = arg ? Number(arg.slice(8)) : 30;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) {
    throw new Error("--limit must be between 1 and 2000");
  }
  const evidence = [];
  // No HTTP requests unless --live is explicitly supplied. Limit remote
  // checks, and run sequentially to avoid burdening public-sector websites.
  if (live && report.issues.length === 0) {
    for (const link of report.links.slice(0, limit)) {
      evidence.push(await probePublicServiceLink(link.url));
    }
  }
  const summary = {
    checkedAt: new Date().toISOString(),
    mode: live ? "live-review" : "static-offline",
    services: report.serviceCount,
    distinctLinks: report.links.length,
    sharedSources: report.sharedSources,
    missingSourceCheckDate: report.servicesWithoutSourceCheck,
    malformed: report.issues.length,
    requestedLiveChecks: evidence.length,
    liveResults: evidence.reduce<Record<string, number>>((counts, item) => {
      counts[item.classification] = (counts[item.classification] ?? 0) + 1;
      return counts;
    }, {}),
  };
  if (json) console.log(JSON.stringify({ summary, issues: report.issues, inventory: report.links, evidence }, null, 2));
  else {
    console.log(JSON.stringify(summary, null, 2));
    for (const issue of report.issues) console.error(issue.id + ": " + issue.field + ": " + issue.reason);
    for (const item of evidence.filter(item => item.classification !== "reachable")) {
      console.log(item.classification + " " + item.url + (item.status ? " [HTTP " + item.status + "]" : ""));
    }
  }
  // CI only enforces safe structure. Transient DNS, 403 or rate limits do
  // not silently remove services or block the public-utility PWA.
  if (report.issues.length) process.exitCode = 1;
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
