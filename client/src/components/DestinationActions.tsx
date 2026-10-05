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
  const [saveError, setSaveError] = useState(false);
  useEffect(() => { setSaveError(false); }, [destination.id]);
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
    setSaveError(false);
    if (saveLocked) return;
    if (onToggleSaved) {
      onToggleSaved();
      return;
    }
    const result = toggleGenericDestinationFavorite(destination);
    setSaveError(result.error);
    if (!result.error) setGenericSaved(result.saved);
  };
  const mapValue = destinationNavigationValue(destination);
  const isBusiness = /^business-\d{14}$/.test(destination.id);
  const plannerValue = destination.kind !== "personal" ? mapValue : destination.address;
  const plannerOriginValue = isBusiness && destination.coordinates ? destination.id.slice(9) : destination.address;

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
    <div className={"grid min-w-0 gap-2 " + (compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")} role="group" aria-label={"Ações para " + destination.name}>
      <a href={buildOriginPlannerUrl(destination.routeOrigin ?? plannerOriginValue)} className="flex min-h-11 min-w-0 break-words items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-2 text-center text-xs font-black text-white/80">
        <Route className="size-3.5 shrink-0" />Ir daqui
      </a>
      <a href={buildDestinationPlannerUrl(plannerValue)} className="flex min-h-11 min-w-0 break-words items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-center text-xs font-black text-primary-foreground">
        <Navigation className="size-3.5 shrink-0" />Ir até aqui
      </a>
      <button type="button" onClick={toggleSaved} disabled={saveLocked} className={"flex min-h-11 min-w-0 break-words items-center justify-center gap-1.5 rounded-xl border px-2 text-center text-xs font-black disabled:cursor-default " + (isSaved ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 bg-white/[.03] text-white/75")} aria-pressed={isSaved}>
        <Bookmark className="size-3.5 shrink-0" fill={isSaved ? "currentColor" : "none"} />{saveLocked ? "Salvo no aparelho" : isSaved ? "Destino salvo" : "Salvar destino"}
      </button>
      <button type="button" onClick={openPreferredMap} className="flex min-h-11 min-w-0 break-words items-center justify-center gap-1.5 rounded-xl border border-accent/20 bg-accent/[.04] px-2 text-center text-xs font-black text-accent">
        <MapPinned className="size-3.5 shrink-0" />Abrir app de mapa
      </button>
      {saveError && <p role="alert" className="col-span-full break-words text-xs leading-relaxed text-warning">Não foi possível atualizar os salvos neste aparelho. Confira o espaço disponível ou as permissões de armazenamento e tente novamente.</p>}
    </div>
  );
}
