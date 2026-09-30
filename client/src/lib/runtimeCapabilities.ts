const configuredRoutingBase = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim() || "";

export function isGitHubPagesRuntime() {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".github.io");
}

export function hasConfiguredRoutingApi() {
  return Boolean(configuredRoutingBase);
}

export function supportsLiveRouting() {
  return hasConfiguredRoutingApi() || !isGitHubPagesRuntime();
}

export function routingCapabilityLabel() {
  if (hasConfiguredRoutingApi()) return "rota avançada disponível";
  if (isGitHubPagesRuntime()) return "navegação externa disponível";
  return "rota avançada disponível";
}