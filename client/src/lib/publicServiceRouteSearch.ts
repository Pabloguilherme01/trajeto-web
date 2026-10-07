import { matchesCatalogText } from "./catalogSearch";
import type { PublicService } from "./publicServices";

/** Keep route search local and let citizens search by the need, not just the place. */
export function matchesPublicServiceRoute(
  query: string,
  route: { label: string; detail: string; destination: string },
  service?: PublicService,
) {
  return matchesCatalogText(query, [
    route.label,
    route.detail,
    route.destination,
    service?.name,
    service?.description,
    ...(service?.keywords ?? []),
  ]);
}
