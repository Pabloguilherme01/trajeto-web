import React, { useEffect, useState } from "react";
import { Bookmark, MapPinned, Navigation, Route } from "lucide-react";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDestinationUrl,
  buildWazeNavigationUrl,
  getPreferredNavigationProvider,
} from "@/lib/mobileTools";
import { buildDestinationPlannerUrl, buildOriginPlannerUrl } from "@/lib/tripLinks";
import { destinationNavigationValue, type UnifiedDestination } from "@/lib/unifiedDestination";
import {
  isGenericDestinationFavorite,
  toggleGenericDestinationFavorite,
  unifiedDestinationEvent,
} from "@/lib/unifiedDestinationStore";

export function DestinationActions({
  destination,
  compact = false,
  saved,
  onToggleSaved,
  saveLocked = false,
}: {
  destination: UnifiedDestination;
  compact?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
  saveLocked?: boolean;
}) {
  const [genericSaved, setGenericSaved] = useState(() => isGenericDestinationFavorite(destination.id));

  useEffect(() => {
    if (saved !== undefined || saveLocked) return;
    const sync = () => setGenericSaved(isGenericDestinationFavorite(destination.id));
    sync();
    window.addEventListener(unifiedDestinationEvent, sync);
    return () => window.removeEventListener(unifiedDestinationEvent, sync);
  }, [destination.id, saved, saveLocked]);

  const isSaved = saved ?? genericSaved;
  const toggleSaved = () => {
    if (saveLocked) return;
    if (onToggleSaved) {
      onToggleSaved();
      return;
    }
    const result = toggleGenericDestinationFavorite(destination);
    if (!result.error) setGenericSaved(result.saved);
  };
  const mapValue = destinationNavigationValue(destination);

  const openPreferredMap = () => {
    const provider = getPreferredNavigationProvider();
    const url =
      provider === "waze"
        ? buildWazeNavigationUrl(destination.address, destination.coordinates ?? undefined)
        : provider === "apple"
          ? buildAppleMapsDirectionsUrl(mapValue)
          : buildGoogleMapsDestinationUrl(mapValue, true);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={"grid gap-2 " + (compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")} aria-label={"Ações para " + destination.name}>
      <a href={buildOriginPlannerUrl(destination.routeOrigin ?? destination.address)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-2 text-center text-xs font-black text-white/80">
        <Route className="size-3.5" />Ir daqui
      </a>
      <a href={buildDestinationPlannerUrl(destination.address)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#C7FF3C] px-2 text-center text-xs font-black text-[#102028]">
        <Navigation className="size-3.5" />Ir até aqui
      </a>
      <button type="button" onClick={toggleSaved} disabled={saveLocked} className={"flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-black disabled:cursor-default " + (isSaved ? "border-[#C7FF3C]/30 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/10 bg-white/[.03] text-white/75")} aria-pressed={isSaved}>
        <Bookmark className="size-3.5" fill={isSaved ? "currentColor" : "none"} />{saveLocked ? "Salvo no aparelho" : isSaved ? "Destino salvo" : "Salvar destino"}
      </button>
      <button type="button" onClick={openPreferredMap} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-2 text-xs font-black text-[#C9F7FF]">
        <MapPinned className="size-3.5" />Abrir no mapa
      </button>
    </div>
  );
}
