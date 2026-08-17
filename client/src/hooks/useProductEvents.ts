import { trpc } from "@/lib/trpc";
import type { ProductEventName } from "../../../server/lib/productEvents";

export function useProductEvents() {
  const track = trpc.analytics.track.useMutation();
  return (event: ProductEventName, region?: string | null) => track.mutate({ event, region: region ?? null });
}
