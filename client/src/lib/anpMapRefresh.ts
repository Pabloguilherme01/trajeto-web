/** A locally bundled ANP snapshot cannot gain value from being re-decoded
 * on every quick category switch. Still allow periodic revalidation while the
 * same map page stays mounted, and retry immediately after a failed request.
 */
export const ANP_MAP_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function shouldFetchAnpMapSnapshot(lastSuccessfulFetchAt: number, now: number) {
  return !Number.isFinite(lastSuccessfulFetchAt) ||
    lastSuccessfulFetchAt <= 0 ||
    !Number.isFinite(now) ||
    now < lastSuccessfulFetchAt ||
    now - lastSuccessfulFetchAt >= ANP_MAP_REFRESH_INTERVAL_MS;
}
