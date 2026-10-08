// Shared import functions let navigation intent and React.lazy reuse the same modules.
export const loadPlannerPage = () => import("@/pages/Planner");
export const loadServicesPage = () => import("@/pages/PublicServices");

export function preparePrimaryRoute(path: string) {
  const load = path === "/planejar" ? loadPlannerPage : path === "/servicos" ? loadServicesPage : null;
  // Optional preparation must not block navigation or suppress the lazy route's retry.
  if (load) void load().catch(() => {});
}
