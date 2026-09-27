import OfflineRouteVault from "@/components/OfflineRouteVault";

/**
 * Compatibilidade para fluxos antigos. A experiência única de rotas salvas
 * vive em OfflineRouteVault para evitar estados divergentes.
 */
export default function RecentTripsCard() {
  return <OfflineRouteVault />;
}
