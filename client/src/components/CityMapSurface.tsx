import React, { memo, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { OfflineStationMap, type StationMapItem } from "@/components/StationMap";
import TileStationMap from "@/components/TileStationMap";
import MapExplorerFrame from "@/components/MapExplorerFrame";

export type CityMapPoint = StationMapItem & { lat: number; lng: number };

/**
 * Keep the expensive online/offline map independent of unrelated CityMap
 * controls (input typing before deferred results, navigation preference, etc.).
 * Marker lists retain their reference until the actual search/layer changes.
 */
function CityMapSurface({
  markers, online, resultCount, onPlanDestination,
}: {
  markers: CityMapPoint[];
  online: boolean;
  resultCount: number;
  onPlanDestination: (station: StationMapItem) => void;
}) {
  const fallback: ReactNode = markers.length
    ? <OfflineStationMap
        stations={markers}
        showDestinationPicker={false}
        itemLabel="destino"
        onPlanDestination={onPlanDestination}
      />
    : <div className="grid min-h-[320px] place-items-center rounded-2xl bg-muted p-6 text-center">
        <div>
          <MapPin className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-black">Destinos disponíveis neste aparelho</p>
          <p className="mt-2 max-w-sm text-sm text-foreground/70">
            {resultCount > 0
              ? "Esta camada tem destinos sem coordenadas verificadas. Consulte as fichas abaixo e confirme o endereço antes de sair."
              : online
                ? "Não há posições cadastradas para esta busca. Tente outro nome ou camada."
                : "O mapa de ruas precisa de conexão. Use a lista abaixo para preparar sua viagem offline."}
          </p>
        </div>
      </div>;
  return (
    <section
      id="city-map-surface"
      tabIndex={-1}
      aria-label="Mapa da cidade"
      className="premium-card scroll-mt-4 overflow-hidden rounded-3xl border border-border/15 outline-none"
    >
      <MapExplorerFrame label="Mapa da cidade">
        {online && markers.length ? (
          <TileStationMap
            stations={markers}
            showDestinationPicker={false}
            selectionLabel="Escolher destino no mapa"
            onPlanDestination={onPlanDestination}
            fallback={fallback}
          />
        ) : fallback}
      </MapExplorerFrame>
    </section>
  );
}

export default memo(CityMapSurface);
