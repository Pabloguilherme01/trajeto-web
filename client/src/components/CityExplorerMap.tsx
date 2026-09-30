import { MapView, loadGoogleMapsScript } from "@/components/Map";
import { StationMap, type StationMapItem } from "@/components/StationMap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaceCategory, PlaceEntity } from "@/lib/placeEntity";
import { categoryFromGoogleType, categoryToGoogleTypes, placeMatchesQuery } from "@/lib/placeSearch";
import { getDistanceKm, type Coordinates } from "@/lib/stationDirectorySearch";
import { AGUAS_LINDAS_STATIONS } from "@/lib/aguasLindasStations";

type Props = {
  category: PlaceCategory | "all";
  query?: string;
  center: Coordinates;
  online: boolean;
  onResults: (places: PlaceEntity[]) => void;
  onSelect?: (place: PlaceEntity) => void;
};

type PlacesRuntime = {
  Place: {
    searchNearby: (request: Record<string, unknown>) => Promise<{ places?: GooglePlace[] }>;
    searchByText: (request: Record<string, unknown>) => Promise<{ places?: GooglePlace[] }>;
  };
  SearchNearbyRankPreference: { DISTANCE: string };
};

type GooglePlace = {
  id?: string;
  displayName?: string | { text?: string };
  formattedAddress?: string;
  location?: google.maps.LatLng | google.maps.LatLngLiteral;
  googleMapsURI?: string;
  businessStatus?: string;
  types?: string[];
};

const sourceColors: Record<PlaceCategory | "all", string> = {
  all: "#FFFFFF",
  fuel: "#C7FF3C",
  health: "#FF7A90",
  education: "#62B8FF",
  transport: "#FFB86B",
  government: "#B59CFF",
  security: "#FF8D55",
  leisure: "#59DFA5",
  accessibility: "#3DE3FF",
  territory: "#D6B77C",
};

function placeCoordinates(value: google.maps.LatLng | google.maps.LatLngLiteral | undefined) {
  if (!value) return null;
  if (typeof (value as google.maps.LatLng).lat === "function") {
    const item = value as google.maps.LatLng;
    return { lat: item.lat(), lng: item.lng() };
  }
  const item = value as google.maps.LatLngLiteral;
  return { lat: item.lat, lng: item.lng };
}

function placeStatus(value?: string): PlaceEntity["status"] {
  if (value === "OPEN") return "operational";
  if (value === "CLOSED_TEMPORARILY") return "temporarily_closed";
  return "unknown";
}

export default function CityExplorerMap({ category, query = "", center, online, onResults, onSelect }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localFuel = useMemo<PlaceEntity[]>(() => {
    if (category !== "fuel") return [];
    return AGUAS_LINDAS_STATIONS
      .filter(station =>
        Number.isFinite(Number(station.anp?.latitude)) &&
        Number.isFinite(Number(station.anp?.longitude)),
      )
      .slice(0, 80)
      .map(station => ({
        id: "local:" + station.cnpj,
        name: station.displayName,
        category: "fuel" as const,
        coordinates: { lat: Number(station.anp?.latitude), lng: Number(station.anp?.longitude) },
        address: station.address,
        neighborhood: station.neighborhood,
        source: station.dataOrigin === "ANP" ? "ANP" as const : "Local" as const,
        sourceDate: station.verifiedAt ?? null,
        status: "unknown" as const,
        isEnrichment: false,
      }));
  }, [category]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
  };

  const renderMarkers = async (places: PlaceEntity[]) => {
    if (!mapRef.current || !window.google?.maps) return;
    const markerLib = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    clearMarkers();

    markersRef.current = places
      .filter(place => Boolean(place.coordinates))
      .map(place => {
        const content = document.createElement("div");
        content.style.width = "18px";
        content.style.height = "18px";
        content.style.borderRadius = "999px";
        content.style.background = sourceColors[place.category];
        content.style.border = "3px solid #102028";
        content.style.boxShadow = "0 5px 18px rgba(0,0,0,.28)";
        content.setAttribute("aria-label", place.name);

        const marker = new markerLib.AdvancedMarkerElement({
          map: mapRef.current,
          position: place.coordinates!,
          title: place.name,
          content,
        });

        marker.addListener("click", () => onSelect?.(place));
        return marker;
      });
  };

  const localResults = useMemo(() => {
    if (category !== "fuel") return [];
    const text = query.trim();
    return text.length >= 2
      ? localFuel.filter(place =>
          placeMatchesQuery(
            [place.name, place.address, place.neighborhood],
            text,
          ),
        )
      : localFuel;
  }, [category, localFuel, query]);

  const mapGooglePlaces = (places: GooglePlace[]) => places
    .map((place): PlaceEntity | null => {
      if (!place.id) return null;

      const coordinates = placeCoordinates(place.location);
      if (!coordinates) return null;

      const displayName = typeof place.displayName === "string"
        ? place.displayName
        : place.displayName?.text;

      const rawTypes = Array.isArray(place.types) ? place.types : [];
      const resolvedCategory = category === "all"
        ? categoryFromGoogleType(rawTypes)
        : category;

      if (!resolvedCategory) return null;

      const observedAt = new Date().toISOString();

      return {
        id: "google:" + place.id,
        name: displayName || "Local",
        category: resolvedCategory,
        subcategory: rawTypes[0] ?? null,
        coordinates,
        address: place.formattedAddress ?? null,
        source: "Google",
        sourceDate: observedAt,
        status: placeStatus(place.businessStatus),
        mapsUrl: place.googleMapsURI ?? null,
        isEnrichment: true,
        evidence: [{
          label: "Enriquecimento geográfico",
          source: "Google",
          updatedAt: observedAt,
        }],
      };
    })
    .filter((place): place is PlaceEntity => Boolean(place));

  const queryPlaces = async () => {
    if (!online) {
      onResults(localResults);
      if (localResults.length) await renderMarkers(localResults);
      else clearMarkers();
      return;
    }

    if (category === "accessibility" || (category === "territory" && query.trim().length < 2)) {
      onResults([]);
      clearMarkers();
      setError(null);
      return;
    }

    if (category === "fuel" && localResults.length > 0) {
      onResults(localResults);
      await renderMarkers(localResults);
      return;
    }

    if (!mapRef.current) return;

    setLoading(true);
    setError(null);

    try {
      await loadGoogleMapsScript();

      const placesLib = await google.maps.importLibrary("places") as unknown as PlacesRuntime;
      const textQuery = query.trim();
      const useTextSearch = textQuery.length >= 2;

      const request: Record<string, unknown> = useTextSearch
        ? {
            textQuery: textQuery + " Águas Lindas de Goiás",
            fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "businessStatus", "types"],
            locationRestriction: { center, radius: 5000 },
            maxResultCount: 10,
            rankPreference: "DISTANCE",
            language: "pt-BR",
            region: "BR",
          }
        : {
            fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "businessStatus", "types"],
            locationRestriction: { center, radius: 5000 },
            maxResultCount: 20,
            rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
            language: "pt-BR",
            region: "BR",
          };

      if (!useTextSearch && category !== "all") {
        const types = categoryToGoogleTypes(category);
        if (types.length) request.includedPrimaryTypes = types;
      }

      const response = useTextSearch
        ? await placesLib.Place.searchByText(request)
        : await placesLib.Place.searchNearby(request);

      const deduped: GooglePlace[] = [];
      const seen = new Set<string>();

      for (const place of response.places ?? []) {
        if (!place.id || seen.has(place.id)) continue;
        seen.add(place.id);
        deduped.push(place);
      }

      const mapped = mapGooglePlaces(deduped);
      onResults(mapped);
      await renderMarkers(mapped);
    } catch {
      setError(
        "O mapa externo não respondeu agora. Os dados locais continuam disponíveis quando existirem.",
      );
      onResults(localResults);
      if (localResults.length) await renderMarkers(localResults);
      else clearMarkers();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onlineHandler = () => {
      void queryPlaces();
    };
    window.addEventListener("online", onlineHandler);
    return () => window.removeEventListener("online", onlineHandler);
  }, [category, query, center.lat, center.lng, online]);

  useEffect(() => {
    if (mapRef.current) void queryPlaces();
  }, [category, query, center.lat, center.lng, online]);

  useEffect(() => () => clearMarkers(), []);

  if (!online && category === "fuel" && localResults.length) {
    const offlineStations: StationMapItem[] = localResults.map(place => ({
      id: place.id,
      name: place.name,
      address: place.address ?? "",
      lat: place.coordinates?.lat,
      lng: place.coordinates?.lng,
      cnpj: place.id.replace(/^local:/, ""),
      source: place.source === "ANP" ? "ANP" as const : "local" as const,
    }));
    return (
      <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#E8F0EA]">
        <StationMap
          stations={offlineStations}
          heightClassName="h-[min(58dvh,520px)]"
          nearbyCenter={center}
          onSelectStation={() => undefined}
        />
      </div>
    );
  }

  if (!online) {
    const offlineMessage = category === "fuel" && localResults.length
      ? "Os postos do catálogo local continuam disponíveis. Para outras categorias, resultados externos precisam de conexão."
      : "As camadas externas precisam de conexão; o Trajeto não inventa pontos que não estejam no pacote local.";
    const offlineSource = category === "fuel"
      ? "ANP / catálogo local"
      : "pacote local disponível no aparelho";

    return (
      <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#E8F0EA]">
        <div className="min-h-[min(46dvh,420px)] p-5">
          <div className="flex min-h-[360px] flex-col justify-between rounded-[1.35rem] border border-black/10 bg-[linear-gradient(135deg,#edf4ef,#dce8df)] p-5 text-[#163840]">
            <div>
              <p className="text-[.55rem] font-black uppercase tracking-[.14em] text-[#3A6B72]">Mapa local</p>
              <h2 className="mt-2 max-w-xs text-xl font-black tracking-tight">Você está offline.</h2>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#5F7169]">{offlineMessage}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
              <p className="text-[.52rem] font-black uppercase tracking-[.12em] text-[#6B7B73]">Fonte</p>
              <p className="mt-1 text-sm font-black">{offlineSource}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white">
      <MapView
        className="h-[min(66dvh,620px)]"
        initialCenter={center}
        initialZoom={13}
        deferUntilVisible={false}
        onMapReady={map => {
          mapRef.current = map;
          void queryPlaces();
        }}
        fallback={
          <div className="grid h-[min(66dvh,620px)] place-items-center bg-[#E8F0EA] p-6 text-center text-[#355149]">
            <div>
              <p className="font-black">Mapa indisponível</p>
              <p className="mt-1 text-xs">A lista continua disponível abaixo.</p>
            </div>
          </div>
        }
      />
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.58rem] font-black text-[#163840] shadow-lg">
          {loading ? "Consultando…" : "Enriquecimento ao vivo"}
        </span>
        <span className="rounded-full border border-black/10 bg-white/94 px-3 py-2 text-[.55rem] font-bold text-[#5C6D65] shadow-lg">
          até 5 km
        </span>
      </div>
      {error && (
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-[#FFB86B]/30 bg-[#FFF7EA]/95 px-3 py-2.5 text-xs font-bold text-[#734B16]">
          {error}
        </div>
      )}
    </div>
  );
}

export function placeDistanceLabel(place: PlaceEntity, center: Coordinates) {
  const value = getDistanceKm(center, place.coordinates ?? null);
  return value == null ? null : value < 1
    ? Math.round(value * 1000) + " m"
    : value.toFixed(1).replace(".", ",") + " km";
}
