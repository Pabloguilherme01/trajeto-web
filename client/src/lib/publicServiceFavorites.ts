const KEY = "trajeto:public-service-favorites:v1";
export const publicServiceFavoritesEvent = "trajeto:public-service-favorites";

export function listPublicServiceFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 120))].slice(0, 100) : [];
  } catch {
    return [];
  }
}

export function togglePublicServiceFavorite(id: string) {
  const current = listPublicServiceFavorites();
  const saved = !current.includes(id);
  const next = saved ? [id, ...current].slice(0, 100) : current.filter(item => item !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(publicServiceFavoritesEvent));
    return { ok: true, saved, ids: next };
  } catch {
    return { ok: false, saved: !saved, ids: current };
  }
}
