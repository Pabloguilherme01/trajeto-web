// Reuse the same imports for lazy routes and navigation intent.
export const loadPlannerPage = () => import("@/pages/Planner");
export const loadServicesPage = () => import("@/pages/PublicServices");
export const loadSearchPage = () => import("@/pages/Search");
export const loadCityMapPage = () => import("@/pages/CityMap");
export const loadStationsPage = () => import("@/pages/Stations");
export const loadDataPage = () => import("@/pages/PublicData");
export const loadHelpPage = () => import("@/pages/Help");

export function preparePrimaryRoute(target: string) {
  const path = target.split(/[?#]/)[0];
  const load = path === "/planejar" || path === "/salvos" || path === "/rota" ? loadPlannerPage
    : path === "/servicos" ? loadServicesPage
    : path === "/buscar" ? loadSearchPage
    : path === "/mapa" || path === "/explorar" ? loadCityMapPage
    : path === "/postos" || path === "/mapa/postos" ? loadStationsPage
    : path === "/dados" ? loadDataPage : path === "/ajuda" ? loadHelpPage : null;
  if (load) void load().catch(() => {});
}
