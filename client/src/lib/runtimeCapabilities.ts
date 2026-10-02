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
  if (isGitHubPagesRuntime()) return "rota pública disponível";
  return "rota avançada disponível";
}

export function supportsBackendAuth(staticRuntime = isGitHubPagesRuntime()) {
  return !staticRuntime;
}


type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

export function prefersLowDataMode(navigatorLike: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator) {
  if (!navigatorLike) return false;
  const connection = (navigatorLike as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) return false;
  return connection.saveData === true || connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
}
