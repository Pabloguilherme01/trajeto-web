import { appUrl } from "./appUrl";
import { PUBLIC_SERVICE_CATEGORIES, type PublicServiceCategory } from "./publicServices";

export type PublicServiceResourceFilter = "todos" | "contato" | "rota" | "online";
export type PublicServiceListFilters = {
  query: string;
  category: PublicServiceCategory | "todos";
  resource: PublicServiceResourceFilter;
  savedOnly: boolean;
};

/**
 * Read list filters with one consistent fallback for unknown URL values.
 * Service deep links are intentionally independent from these list filters.
 */
export function readPublicServiceListFilters(params: URLSearchParams): PublicServiceListFilters {
  const category = params.get("categoria");
  const resource = params.get("recurso");
  return {
    query: params.get("q") ?? "",
    category: PUBLIC_SERVICE_CATEGORIES.some(item => item.id === category)
      ? category as PublicServiceCategory | "todos"
      : "todos",
    resource: resource === "contato" || resource === "rota" || resource === "online"
      ? resource
      : "todos",
    savedOnly: params.get("salvos") === "1",
  };
}

/**
 * Canonical URL for browsing services, without stale deep-link flags or
 * empty/default query parameters. No location or personal data is included.
 */
export function publicServiceListUrl(filters: PublicServiceListFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.category !== "todos") params.set("categoria", filters.category);
  if (filters.savedOnly) params.set("salvos", "1");
  if (filters.resource !== "todos") params.set("recurso", filters.resource);
  return appUrl("/servicos") + (params.size ? "?" + params.toString() : "");
}
