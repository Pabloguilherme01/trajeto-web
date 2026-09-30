import { trpc } from "@/lib/trpc";
import type { ProductEventName } from "../../../server/lib/productEvents";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";

export function useProductEvents() {
  const track = trpc.analytics.track.useMutation();
  return (event: ProductEventName, region?: string | null) => {
    if (isGitHubPagesRuntime()) return;
    track.mutate({ event, region: region ?? null });
  };
}
