import { trpc } from "@/lib/trpc";
import type { ProductEventName } from "../../../server/lib/productEvents";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";

export function useProductEvents() {
  const track = trpc.analytics.track.useMutation();
  return (event: ProductEventName, region?: string | null) => {
    if (isGitHubPagesRuntime()) return;
    const coarseRegion = event === "google_page_token_invalid" ? region ?? null : null;
    track.mutate({ event, region: coarseRegion });
  };
}
