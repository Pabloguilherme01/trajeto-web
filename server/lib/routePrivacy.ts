export function shouldPersistRouteSearch(userId: number | null | undefined) {
  return typeof userId === "number" && Number.isFinite(userId) && userId > 0;
}
