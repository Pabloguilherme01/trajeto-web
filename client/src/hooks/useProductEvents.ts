import { trpc } from "@/lib/trpc";
import type { ProductEventName } from "../../../server/lib/productEvents";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";

const DIAGNOSTICS_OPT_IN_KEY = "trajeto:diagnostics-opt-in";

export function productDiagnosticsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DIAGNOSTICS_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function useProductEvents() {
  const track = trpc.analytics.track.useMutation();
  return (event: ProductEventName, region?: string | null) => {
    if (isGitHubPagesRuntime() || !productDiagnosticsEnabled()) return;
    const coarseRegion = event === "google_page_token_invalid" ? region ?? null : null;
    track.mutate({ event, region: coarseRegion });
  };
}
