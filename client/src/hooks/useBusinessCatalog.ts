import { useEffect, useState } from "react";
import { loadBusinessCatalog } from "@/lib/businessCatalog";
import type { CityAtlasItem } from "@/lib/cityAtlas";

export function useBusinessCatalog() {
  const [items, setItems] = useState<CityAtlasItem[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void loadBusinessCatalog().then(data => { if (active) setItems(data); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  return { items, loading: !error && !items.length, error, retry: () => setAttempt(v => v + 1) };
}
