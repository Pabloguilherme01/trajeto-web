const configuredRoutingBase = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim() || "";
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const configuredStaticRuntime = import.meta.env.VITE_STATIC_RUNTIME?.trim().toLowerCase() === "true";

export function isGitHubPagesRuntime() {
  if (configuredStaticRuntime) return true;
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".github.io");
}

export function hasConfiguredRoutingApi() {
  return Boolean(configuredRoutingBase || configuredApiBase);
}

export function supportsLiveRouting() {
  return hasConfiguredRoutingApi() || !isGitHubPagesRuntime();
}

export function routingCapabilityLabel() {
  if (hasConfiguredRoutingApi()) return "rota avançada disponível";
  if (isGitHubPagesRuntime()) return "navegação externa disponível";
  return "rota avançada disponível";
}