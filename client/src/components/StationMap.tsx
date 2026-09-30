import { MapView, loadGoogleMapsScript } from "@/components/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, Navigation, Minus, Plus, RotateCcw } from "lucide-react";
import { buildAppleMapsDirectionsUrl, buildWazeNavigationUrl } from "@/lib/mobileTools";
import { cacheOfflineMapStations } from "@/lib/stationMapOffline";
import { dedupeStationReferences, type StationReference } from "@/lib/stationReconciliation";

export type StationMapItem = {
  id?: string;
  placeId?: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  cnpj?: string | null;
  brand?: string | null;
  source?: "ANP" | "Google" | "local";
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\x27/g, "&#039;");
}

function hasCoordinates(station: StationMapItem): station is StationMapItem & { lat: number; lng: number } {
  return typeof station.lat === "number" && Number.isFinite(station.lat) && typeof station.lng === "number" && Number.isFinite(station.lng);
}

function normalizeStationText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function coordinateCacheKey(station: StationMapItem) {
  return "trajeto:station-coordinate:" + (station.cnpj || station.placeId || normalizeStationText(station.name + "|" + station.address));
}

function readCachedCoordinate(station: StationMapItem) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(coordinateCacheKey(station));
    if (!raw) return null;
    const value = JSON.parse(raw) as { lat?: unknown; lng?: unknown; source?: string };
    // Google Places content is not used as a permanent station database.
    if (value.source === "Google") return null;
    if (typeof value.lat === "number" && typeof value.lng === "number" && Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      return { lat: value.lat, lng: value.lng, source: "local" as const };
    }
  } catch {}
  return null;
}

type GooglePlaceSearchResult = {
  id?: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number } | google.maps.LatLngLiteral;
};

function googlePlaceText(place: GooglePlaceSearchResult) {
  const displayName = typeof place.displayName === "string" ? place.displayName : place.displayName?.text;
  return normalizeStationText([displayName, place.formattedAddress].filter(Boolean).join(" "));
}

function stationMatchIsPlausible(station: StationMapItem, place: GooglePlaceSearchResult) {
  const placeText = googlePlaceText(place);
  if (!placeText.includes("aguas lindas")) return false;
  const stationTokens = normalizeStationText([station.name, station.address].filter(Boolean).join(" "))
    .split(" ")
    .filter(token => token.length >= 4 && !["posto", "auto", "combustiveis", "aguas", "lindas", "goias"].includes(token));
  if (!stationTokens.length) return true;
  const hits = stationTokens.filter(token => placeText.includes(token)).length;
  return hits >= 1;
}


function sourceLabel(source?: StationMapItem["source"]) {
  if (source === "ANP") return "ANP";
  if (source === "Google") return "MAPA";
  return "LOCAL";
}

function OfflineStationMap({ stations, onSelectStation }: { stations: Array<StationMapItem & { lat: number; lng: number }>; onSelectStation?: (station: StationMapItem) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(stations[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const points = useMemo(() => {
    if (!stations.length) return [];
    const minLat = Math.min(...stations.map(item => item.lat));
    const maxLat = Math.max(...stations.map(item => item.lat));
    const minLng = Math.min(...stations.map(item => item.lng));
    const maxLng = Math.max(...stations.map(item => item.lng));
    const latSpan = Math.max(maxLat - minLat, 0.003);
    const lngSpan = Math.max(maxLng - minLng, 0.003);
    return stations.map((station, index) => ({
      station,
      index,
      x: 60 + ((station.lng - minLng) / lngSpan) * 880,
      y: 500 - ((station.lat - minLat) / latSpan) * 440,
    })).map(point => ({ ...point, x: 60 + (point.x - 60) * 0.94 + 30, y: 500 + (point.y - 500) * 0.94 + 16 }));
  }, [stations]);
  const selected = points.find(point => point.station.id === selectedId)?.station ?? points[0]?.station ?? null;
  const viewBox = (1 - 1 / zoom) * 500 + " " + (1 - 1 / zoom) * 280 + " " + 1000 / zoom + " " + 560 / zoom;
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#E8F0EA]">
      <svg viewBox={viewBox} className="absolute inset-0 h-full w-full" role="img" aria-label={"Mapa offline esquemático com " + stations.length + " postos"}>
        <defs><pattern id="station-map-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#B9C9BD" strokeWidth="1" opacity=".55" /></pattern></defs>
        <rect width="1000" height="560" fill="#E8F0EA" /><rect width="1000" height="560" fill="url(#station-map-grid)" />
        <text x="34" y="32" fontSize="18" fontWeight="800" fill="#41534A">Águas Lindas · mapa offline</text>
        <text x="34" y="54" fontSize="11" fontWeight="600" fill="#6C7E74">Coordenadas salvas neste aparelho · sem internet</text>
        {points.map(point => {
          const active = point.station.id === selectedId;
          const official = point.station.source === "ANP";
          return <g key={point.station.id || "offline-" + point.index} onClick={() => { setSelectedId(point.station.id ?? null); onSelectStation?.(point.station); }} className="cursor-pointer">
            {active && <circle cx={point.x} cy={point.y} r="18" fill={official ? "#C7FF3C" : "#3DE3FF"} opacity=".22" /> }
            <circle cx={point.x} cy={point.y} r={active ? 10 : 8} fill={official ? "#C7FF3C" : "#3DE3FF"} stroke="#163840" strokeWidth="3" />
            <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="8" fontWeight="900" fill="#163840">{point.index + 1}</text>
          </g>;
        })}
      </svg>
      <div className="absolute left-3 top-3 flex gap-1.5">
        <button type="button" onClick={() => setZoom(value => Math.min(2.5, value + 0.25))} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Aumentar zoom"><Plus className="size-4" /></button>
        <button type="button" onClick={() => setZoom(value => Math.max(1, value - 0.25))} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Diminuir zoom"><Minus className="size-4" /></button>
        <button type="button" onClick={() => setZoom(1)} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Recentrar mapa"><RotateCcw className="size-4" /></button>
      </div>
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-black/10 bg-white/92 p-3 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/20 text-[#155163]"><span className="text-[.58rem] font-black">{selected ? sourceLabel(selected.source) : "—"}</span></div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#163840]">{selected?.name ?? "Selecione um posto"}</p><p className="mt-1 line-clamp-2 text-[.61rem] leading-relaxed text-[#607169]">{selected?.address ?? "Sem coordenada salva."}</p></div>
          {selected && <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => window.open("https://www.google.com/maps/dir/?api=1&destination=" + selected.lat + "," + selected.lng + "&travelmode=driving&dir_action=navigate", "_blank", "noopener,noreferrer")} className="grid size-10 place-items-center rounded-xl bg-[#163840] text-white" aria-label="Navegar pelo Google Maps"><Navigation className="size-4" /></button>
            <button type="button" onClick={() => window.open(buildWazeNavigationUrl(selected.address, { lat: selected.lat, lng: selected.lng }), "_blank", "noopener,noreferrer")} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white text-[#163840]" aria-label="Navegar pelo Waze"><span className="text-[.55rem] font-black">WZ</span></button>
            <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(selected.lat + "," + selected.lng), "_blank", "noopener,noreferrer")} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white text-[#163840]" aria-label="Navegar pelo Apple Maps"><Apple className="size-4" /></button>
          </div>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[.5rem] font-bold text-[#7D8C84]"><span>{stations.length} posições offline</span><span>Verde = ANP · azul = referência secundária</span></div>
      </div>
    </div>
  );
}

export function StationMap({ stations, heightClassName = "h-[min(68vh,620px)]", showTraffic = false, nearbyCenter, onSelectStation }: { stations: StationMapItem[]; heightClassName?: string; showTraffic?: boolean; nearbyCenter?: { lat: number; lng: number } | null; onSelectStation?: (station: StationMapItem) => void }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [resolvedStations, setResolvedStations] = useState<StationMapItem[]>(() => stations.map(station => { const cached = readCachedCoordinate(station); return hasCoordinates(station) ? station : cached ? { ...station, ...cached } : station; }));
  const [resolvingCount, setResolvingCount] = useState(0);
  const [nearbyStations, setNearbyStations] = useState<StationMapItem[]>([]);

  useEffect(() => {
    setResolvedStations(stations.map(station => { const cached = readCachedCoordinate(station); return hasCoordinates(station) ? station : cached ? { ...station, ...cached } : station; }));
  }, [stations]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (!nearbyCenter || offline) {
      setNearbyStations([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadGoogleMapsScript();
        const placesLibrary = await google.maps.importLibrary("places") as unknown as {
          Place: {
            searchNearby: (request: Record<string, unknown>) => Promise<{ places?: Array<{
              id?: string;
              displayName?: string | { text?: string };
              formattedAddress?: string;
              location?: google.maps.LatLng | google.maps.LatLngLiteral;
              googleMapsURI?: string;
              businessStatus?: string;
            }> }>;
          };
          SearchNearbyRankPreference: { DISTANCE: string };
        };
        const result = await placesLibrary.Place.searchNearby({
          fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "businessStatus"],
          includedPrimaryTypes: ["gas_station"],
          locationRestriction: {
            center: nearbyCenter,
            radius: 5000,
          },
          maxResultCount: 20,
          rankPreference: placesLibrary.SearchNearbyRankPreference.DISTANCE,
          language: "pt-BR",
          region: "BR",
        });
        if (cancelled) return;
        const next: StationMapItem[] = (result.places ?? []).flatMap((place, index) => {
          const name = typeof place.displayName === "string" ? place.displayName : place.displayName?.text;
          const location = place.location && "toJSON" in place.location
            ? place.location.toJSON()
            : place.location;
          if (!name || !location || typeof location.lat !== "number" || typeof location.lng !== "number") return [];
          return [{
            id: place.id ?? "nearby-" + index,
            placeId: place.id,
            name,
            address: place.formattedAddress ?? "",
            lat: location.lat,
            lng: location.lng,
            cnpj: null,
            brand: null,
            source: "Google" as const,
          }];
        });
        setNearbyStations(next);
      } catch {
        if (!cancelled) setNearbyStations([]);
      }
    })();
    return () => { cancelled = true; };
  }, [nearbyCenter?.lat, nearbyCenter?.lng, offline]);

  useEffect(() => {
    if (!ready || offline || !mapRef.current || !window.google?.maps?.places) return;
    const unresolved = resolvedStations.filter(station => !hasCoordinates(station));
    if (!unresolved.length) return;
    let cancelled = false;
    type PlacesNewApi = {
      Place?: {
        searchByText?: (request: Record<string, unknown>) => Promise<{ places?: GooglePlaceSearchResult[] }>;
      };
    };
    const placeApi = (window.google.maps.places as unknown as PlacesNewApi).Place;
    const searchByText = placeApi?.searchByText;
    if (!searchByText) return;
    let cursor = 0;
    const workers = Math.min(3, unresolved.length);
    const resolveOne = async (station: StationMapItem) => {
      const query = [station.name, station.address, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(", ");
      try {
        const response = await searchByText({
          textQuery: query,
          fields: ["id", "displayName", "formattedAddress", "location"],
          includedType: "gas_station",
          language: "pt-BR",
          region: "BR",
          locationBias: { center: { lat: -15.7545, lng: -48.2816 }, radius: 30_000 },
          maxResultCount: 5,
        });
        if (cancelled) return;
        const match = response.places?.find(item => item.location && stationMatchIsPlausible(station, item));
        if (!match?.location) return;
        const lat = typeof match.location === "object" && "lat" in match.location
          ? typeof match.location.lat === "function" ? match.location.lat() : match.location.lat
          : null;
        const lng = typeof match.location === "object" && "lng" in match.location
          ? typeof match.location.lng === "function" ? match.location.lng() : match.location.lng
          : null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const resolvedLat = lat as number;
        const resolvedLng = lng as number;
        setResolvedStations(current => current.map(item => ((item.cnpj && station.cnpj && item.cnpj === station.cnpj) || item.id === station.id) ? { ...item, lat: resolvedLat, lng: resolvedLng, source: "Google" as const } : item));
      } catch {
        // Enrichment is optional; the ANP/local catalog remains the source of truth.
      }
    };
    const worker = async () => {
      while (!cancelled) { const index = cursor++; if (index >= unresolved.length) return; await resolveOne(unresolved[index]); }
    };
    setResolvingCount(unresolved.length);
    void Promise.all(Array.from({ length: workers }, () => worker())).finally(() => { if (!cancelled) setResolvingCount(0); });
    return () => { cancelled = true; };
  }, [ready, offline, resolvedStations.map(item => item.cnpj || item.id || item.name).join("|")]);

  const canonicalStations = useMemo<StationMapItem[]>(() => {
    const reconciliationInputs: StationReference[] = [
      ...resolvedStations.map(station => ({
        id: station.id,
        placeId: station.placeId,
        name: station.name,
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        cnpj: station.cnpj ?? null,
        brand: station.brand ?? null,
        source: station.source ?? "local",
      })),
      ...nearbyStations.map(station => ({
        id: station.id,
        placeId: station.placeId,
        name: station.name,
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        cnpj: station.cnpj ?? null,
        brand: station.brand ?? null,
        source: station.source ?? "Google",
      })),
    ];

    return dedupeStationReferences(reconciliationInputs).map(reference => ({
      id: reference.id,
      placeId: reference.placeId,
      name: reference.name,
      address: reference.address ?? "",
      lat: typeof reference.lat === "number" ? reference.lat : undefined,
      lng: typeof reference.lng === "number" ? reference.lng : undefined,
      cnpj: reference.cnpj ?? null,
      brand: reference.brand ?? null,
      source: reference.source,
    }));
  }, [resolvedStations, nearbyStations]);

  const drawableStations = useMemo(() => canonicalStations.filter(hasCoordinates), [canonicalStations]);

  useEffect(() => {
    if (!drawableStations.length) return;
    cacheOfflineMapStations(drawableStations
      .filter(station => station.source !== "Google" && typeof station.id === "string")
      .map(station => ({ ...station, id: station.id as string })));
  }, [resolvedStations]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps || offline) return;
    markers.current.forEach(marker => { marker.map = null; });
    markers.current = [];
    if (!drawableStations.length) return;
    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    const popup = infoWindow.current ?? new window.google.maps.InfoWindow();
    infoWindow.current = popup;

    userMarker.current?.map && (userMarker.current.map = null);
    userMarker.current = null;
    if (nearbyCenter) {
      const userPin = new window.google.maps.marker.PinElement({
        background: "#FF7D6A",
        borderColor: "#0B1014",
        glyphColor: "#FFFFFF",
        glyph: "•",
      });
      userMarker.current = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: nearbyCenter,
        title: "Sua localização · usada somente nesta sessão",
        content: userPin.element,
        zIndex: 1000,
      });
      bounds.extend(nearbyCenter);
    }

    drawableStations.forEach((station, index) => {
      const position = { lat: station.lat, lng: station.lng };
      bounds.extend(position);
      const official = station.source === "ANP";
      const pin = new window.google.maps.marker.PinElement({ background: official ? "#C7FF3C" : "#3DE3FF", borderColor: "#163840", glyphColor: "#163840", glyph: String(index + 1) });
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position, title: String(index + 1) + ". " + station.name, content: pin.element });
      marker.addListener("click", () => {
        const html = "<div style=\"min-width:220px;max-width:290px;padding:4px 2px;font-family:Arial,sans-serif\">" +
          "<strong style=\"display:block;font-size:14px;line-height:1.25\">" + String(index + 1) + ". " + escapeHtml(station.name) + "</strong>" +
          "<span style=\"display:block;margin-top:5px;font-size:12px;line-height:1.45;color:#53635d\">" + escapeHtml(station.address || "Endereço não informado") + "</span>" +
          (station.cnpj ? "<span style=\"display:block;margin-top:4px;font-size:11px;color:#7a8882\">CNPJ " + escapeHtml(station.cnpj) + "</span>" : "") +
          (station.brand ? "<span style=\"display:block;margin-top:3px;font-size:11px;color:#7a8882\">" + escapeHtml(station.brand) + "</span>" : "") +
          "<span style=\"display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;background:" + (official ? "#ECFFBA" : "#E0FBFF") + ";color:#34524A;font-size:10px;font-weight:800\">" + (official ? "Fonte ANP" : station.source === "Google" ? "Referência de mapa" : "Catálogo local") + "</span>" +
          "<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:9px\">" +
          "<a href=\"https://www.google.com/maps/dir/?api=1&destination=" + station.lat + "," + station.lng + "&travelmode=driving&dir_action=navigate\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;padding:8px 10px;border-radius:8px;background:#163840;color:#fff;text-decoration:none;font-size:11px;font-weight:700\">Google</a>" +
          "<a href=\"" + buildWazeNavigationUrl(station.address, { lat: station.lat, lng: station.lng }) + "\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;padding:8px 10px;border-radius:8px;background:#eefbff;color:#163840;text-decoration:none;font-size:11px;font-weight:700\">Waze</a>" +
          "<a href=\"" + buildAppleMapsDirectionsUrl(station.lat + "," + station.lng) + "\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;padding:8px 10px;border-radius:8px;background:#f4f4f4;color:#163840;text-decoration:none;font-size:11px;font-weight:700\">Apple</a>" +
          (station.cnpj ? "<a href=\"#posto-" + encodeURIComponent(station.cnpj) + "\" style=\"display:inline-block;padding:8px 10px;border-radius:8px;border:1px solid #d8e0dc;color:#34524A;text-decoration:none;font-size:11px;font-weight:700\">Ficha</a>" : "") +
          "</div></div>";
        popup.setContent(html);
        popup.open({ map, anchor: marker });
        onSelectStation?.(station);
      });
      markers.current.push(marker);
    });
    map.fitBounds(bounds, 44);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => { if ((map.getZoom() ?? 12) > 15) map.setZoom(15); });
    return () => {
      window.google?.maps?.event.removeListener(listener);
      userMarker.current?.map && (userMarker.current.map = null);
      userMarker.current = null;
    };
  }, [ready, canonicalStations, offline, nearbyCenter]);

  if (!drawableStations.length && offline) {
    return <div className={"grid " + heightClassName + " place-items-center bg-[#0B1014] p-6 text-center"}><div><p className="text-sm font-black text-white/60">Mapa offline ainda sem coordenadas salvas.</p><p className="mt-2 text-xs leading-relaxed text-white/35">Abra o mapa uma vez com internet para posicionar os postos e armazenar as coordenadas neste aparelho.</p></div></div>;
  }

  if (offline) {
    return <div className={"relative " + heightClassName}><OfflineStationMap stations={drawableStations} onSelectStation={onSelectStation} /></div>;
  }

  return (
    <div className="relative">
      <MapView className="h-full w-full overflow-hidden" heightClassName={heightClassName} initialCenter={{ lat: -15.7545, lng: -48.2816 }} initialZoom={12} showTraffic={showTraffic} fallback={<OfflineStationMap stations={drawableStations} onSelectStation={onSelectStation} />} onMapReady={map => { mapRef.current = map; setReady(true); }} />
      {resolvingCount > 0 && <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-2xl border border-white/10 bg-[#0B1014]/90 px-3 py-2.5 text-[0.58rem] font-black text-white shadow-xl backdrop-blur-xl" role="status" aria-live="polite">Posicionando {resolvingCount} posto(s). A ANP/local continuam sendo a base cadastral.</div>}
      {nearbyStations.length > 0 && nearbyCenter && <div className="pointer-events-none absolute left-3 right-3 top-14 z-10 rounded-2xl border border-[#3DE3FF]/20 bg-[#0B1014]/85 px-3 py-2 text-[0.52rem] font-black text-[#C9F7FF] shadow-xl backdrop-blur-xl" role="status" aria-live="polite">Perto de mim · {nearbyStations.length} referências Google · ordenadas por distância. Duplicatas são conciliadas com a base principal.</div>}
      {drawableStations.length === 0 && <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-white/10 bg-[#0B1014]/90 px-3 py-2.5 text-center text-[0.58rem] font-bold text-white/65 shadow-xl backdrop-blur-xl">Ainda buscando coordenadas dos postos. As fichas continuam disponíveis abaixo.</div>}
    </div>
  );
}