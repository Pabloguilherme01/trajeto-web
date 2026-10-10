import { useEffect, useState } from "react";
import { getLoadedBusinessCatalog } from "@/lib/businessCatalogState";
import type { CityAtlasItem } from "@/lib/cityAtlas";

export function useBusinessCatalog(enabled = true) {
  const [items, setItems] = useState<CityAtlasItem[]>(() => getLoadedBusinessCatalog());
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(() => enabled && !getLoadedBusinessCatalog().length);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    // A completed catalog is already shared in memory across the main screens.
    // Reuse it instead of briefly showing loading and re-importing the chunks.
    const cached = getLoadedBusinessCatalog();
    if (cached.length) {
      setItems(cached);
      setError(false);
      setLoading(false);
      return;
    }
    let active = true;
    setError(false);
    setLoading(true);
    void import("@/lib/businessCatalog").then(module => module.loadBusinessCatalog()).then(data => {
      if (active) { setItems(data); setLoading(false); }
    }).catch(() => {
      if (active) { setError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [attempt, enabled]);
  return { items, loading: enabled && loading, error: enabled && error, retry: () => setAttempt(v => v + 1) };
}
