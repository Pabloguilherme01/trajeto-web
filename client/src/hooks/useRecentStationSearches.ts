import { useEffect, useState } from "react";
import { getRecentSearches, mobilePreferenceEvent } from "@/lib/mobilePreferences";

/**
 * Keep the privacy-sanitized station search history in React state.
 * Reading and migrating localStorage on every render makes typing,
 * filter changes and map interactions unnecessarily expensive.
 */
export function useRecentStationSearches() {
  const [searches, setSearches] = useState(getRecentSearches);

  useEffect(() => {
    const refresh = () => {
      const next = getRecentSearches();
      setSearches(previous =>
        previous.length === next.length && previous.every((value, index) => value === next[index])
          ? previous
          : next,
      );
    };
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return searches;
}
