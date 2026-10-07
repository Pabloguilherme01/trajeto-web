import { useEffect, useState } from "react";
import { loadBusinessCatalog } from "@/lib/businessCatalog";
import type { CityAtlasItem } from "@/lib/cityAtlas";

export function useBusinessCatalog(enabled = true) {
  const [items, setItems] = useState<CityAtlasItem[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setError(false);
    setLoading(true);
    void loadBusinessCatalog().then(data => {
      if (active) { setItems(data); setLoading(false); }
    }).catch(() => {
      if (active) { setError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [attempt, enabled]);
  return { items, loading, error, retry: () => setAttempt(v => v + 1) };
}
