import React from "react";
import MapPlaceActions from "@/components/MapPlaceActions";
import MapDestinationPicker from "@/components/MapDestinationPicker";
import { mapPlaceSegment } from "@/components/MapPlaceIcon";
import OfflineMapCanvas from "@/components/OfflineMapCanvas";
import { MapView } from "@/components/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, LocateFixed, Navigation, Minus, Plus, RotateCcw } from "lucide-react";
import { buildAppleMapsDirectionsUrl, buildWazeNavigationUrl } from "@/lib/mobileTools";
import { cacheOfflineMapStations } from "@/lib/stationMapOffline";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import TileStationMap from "@/components/TileStationMap";

export type StationMapItem = {
  id?: string;
  placeId?: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  cnpj?: string | null;
  brand?: string | null;
  category?: string;
  coordinateKind?: "mapped-point" | "street-midpoint" | "area-reference";
  coordinateLabel?: string;
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

function offlineStationKey(station: StationMapItem) {
  return station.id ?? station.cnpj ?? station.placeId ?? `${station.name}|${station.lat}|${station.lng}`;
}

export function OfflineStationMap({ stations, onSelectStation, heightClassName = "h-[min(60vh,480px)] min-h-[320px]", itemLabel = "posto", onPlanDestination }: {
  stations: Array<StationMapItem & { lat: number; lng: number }>; onSelectStation?: (station: StationMapItem) => void; heightClassName?: string; itemLabel?: string; onPlanDestination?: (station: StationMapItem) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(stations[0] ? offlineStationKey(stations[0]) : null);
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{ point: { lat: number; lng: number }; key: number } | null>(null);
  const selected = stations.find(station => offlineStationKey(station) === selectedId) ?? stations[0] ?? null;
  const markers = stations.map((station, i) => ({ ...station, id: offlineStationKey(station), label: String(i + 1) }));
  const select = (id: string) => { setSelectedId(id); const station = stations.find(item => offlineStationKey(item) === id); if (station) { setFocusRequest(previous => ({ point: station, key: (previous?.key ?? 0) + 1 })); onSelectStation?.(station); } };
  return <div className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-[#eef2eb] text-[#163840] shadow-[0_24px_70px_rgba(15,35,45,.22)]">
    <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[linear-gradient(110deg,#f8fbf9,#edf5f1)] p-3">
      <button type="button" onClick={() => setZoom(v => Math.min(6, v + .5))} disabled={zoom >= 6} className="grid size-11 place-items-center rounded-2xl border border-white bg-white/95 shadow-lg disabled:opacity-40" aria-label="Aumentar zoom"><Plus className="size-4" /></button>
      <button type="button" onClick={() => setZoom(v => Math.max(1, v - .5))} disabled={zoom <= 1} className="grid size-11 place-items-center rounded-2xl border border-white bg-white/95 shadow-lg disabled:opacity-40" aria-label="Diminuir zoom"><Minus className="size-4" /></button>
      <button type="button" onClick={() => { setFocusRequest(null); setZoom(1); setResetKey(v => v + 1); }} className="grid size-11 place-items-center rounded-2xl border border-white bg-white/95 shadow-lg" aria-label="Recentrar mapa"><RotateCcw className="size-4" /></button>
      <span className="text-xs font-black">Disponível sem conexão</span>
      <div className="w-full"><MapDestinationPicker label={`Escolher ${itemLabel} no mapa offline`} value={selected ? offlineStationKey(selected) : null} items={stations.map(station => ({ ...station, id: offlineStationKey(station) }))} onSelect={select} /></div>
    </div>
    <OfflineMapCanvas markers={markers} selectedMarkerId={selectedId} zoom={zoom} onZoom={setZoom} resetKey={resetKey} focusRequest={focusRequest} className={heightClassName} ariaLabel={"Mapa offline vetorial com " + stations.length + " destinos"} onSelect={marker => select(marker.id)} />
    <div className="border-t border-black/10 bg-white p-4">
      <p className="break-words text-base font-black">{selected?.name ?? "Nenhum ponto nesta categoria"}</p><p className="mt-1 break-words text-sm leading-relaxed text-[#607169]">{selected?.address}</p>
      {selected?.coordinateLabel && <p className="mt-2 break-words text-xs text-[#765100]">{selected.coordinateLabel}</p>}
      {selected && <div className="mt-3 flex flex-wrap gap-2">
        {onPlanDestination && <button type="button" onClick={() => onPlanDestination(selected)} className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-sm font-black">Planejar até aqui</button>}
        <button type="button" onClick={() => window.open("https://www.google.com/maps/dir/?api=1&destination=" + selected.lat + "," + selected.lng + "&travelmode=driving&dir_action=navigate", "_blank", "noopener,noreferrer")} className="grid size-11 place-items-center rounded-xl bg-[#163840] text-white" aria-label="Navegar pelo Google Maps"><Navigation className="size-4" /></button>
        <button type="button" onClick={() => window.open(buildWazeNavigationUrl(selected.address, { lat: selected.lat, lng: selected.lng }), "_blank", "noopener,noreferrer")} className="grid size-11 place-items-center rounded-xl border border-black/10" aria-label="Navegar pelo Waze"><span className="text-xs font-black">WZ</span></button>
        <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(selected.lat + "," + selected.lng), "_blank", "noopener,noreferrer")} className="grid size-11 place-items-center rounded-xl border border-black/10" aria-label="Navegar pelo Apple Maps"><Apple className="size-4" /></button>
      </div>}
      {selected && <MapPlaceActions place={selected} />}
      <p className="mt-3 text-xs text-[#607169]">{stations.length} posições locais · ruas da área urbana cadastrada · sem trânsito ao vivo</p>
    </div>
  </div>;
}

export function StationMap({ stations, heightClassName = "min-h-[320px] h-[min(68vh,620px)]", showTraffic = false, onSelectStation = null }: { stations: StationMapItem[]; heightClassName?: string; showTraffic?: boolean; onSelectStation?: (station: StationMapItem) => void }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [resolvedStations, setResolvedStations] = useState<StationMapItem[]>(() => stations.map(station => { const cached = readCachedCoordinate(station); return hasCoordinates(station) ? station : cached ? { ...station, ...cached } : station; }));
  const [resolvingCount, setResolvingCount] = useState(0);

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
    if (!ready || offline || !mapRef.current || !window.google?.maps?.places) return;
    const unresolved = resolvedStations.filter(station => !hasCoordinates(station));
    if (!unresolved.length) return;
    // Resolve a bounded batch per mount so weak phones are not flooded with
    // concurrent Places work when a large directory is opened.
    const pending = unresolved.slice(0, 12);
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
    const workers = Math.min(2, pending.length);
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
      while (!cancelled) { const index = cursor++; if (index >= pending.length) return; await resolveOne(pending[index]); }
    };
    setResolvingCount(pending.length);
    void Promise.all(Array.from({ length: workers }, () => worker())).finally(() => { if (!cancelled) setResolvingCount(0); });
    return () => { cancelled = true; };
  }, [ready, offline, resolvedStations.map(item => item.cnpj || item.id || item.name).join("|")]);

  const drawableStations = useMemo(() => resolvedStations.filter(hasCoordinates), [resolvedStations]);

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
    drawableStations.forEach((station, index) => {
      const position = { lat: station.lat, lng: station.lng };
      bounds.extend(position);
      const official = station.source === "ANP";
      const pin = new window.google.maps.marker.PinElement({ background: official ? "#C7FF3C" : "#3DE3FF", borderColor: "#163840", glyphColor: "#163840", glyph: mapPlaceSegment(station).glyph });
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position, title: station.name, content: pin.element });
      marker.addListener("click", () => {
        const html = "<div style=\"min-width:220px;max-width:290px;padding:4px 2px;font-family:Arial,sans-serif\">" +
          "<strong style=\"display:block;font-size:14px;line-height:1.25\">" + String(index + 1) + ". " + escapeHtml(station.name) + "</strong>" +
          "<span style=\"display:block;margin-top:5px;font-size:12px;line-height:1.45;color:#53635d\">" + escapeHtml(station.address || "Endereço não informado") + "</span>" +
          (station.cnpj ? "<span style=\"display:block;margin-top:4px;font-size:11px;color:#7a8882\">CNPJ " + escapeHtml(station.cnpj) + "</span>" : "") +
          (station.brand ? "<span style=\"display:block;margin-top:3px;font-size:11px;color:#7a8882\">" + escapeHtml(station.brand) + "</span>" : "") +
          "<span style=\"display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;background:" + (official ? "#ECFFBA" : "#E0FBFF") + ";color:#34524A;font-size:10px;font-weight:800\">" + (official ? "Fonte ANP" : "Referência de mapa") + "</span>" +
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
    return () => window.google?.maps?.event.removeListener(listener);
  }, [ready, resolvedStations, offline]);

  const toggleTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !tiltEnabled;
    map.setTilt(next ? 45 : 0);
    setTiltEnabled(next);
  };

  if (!drawableStations.length && offline) {
    return <div className={"grid " + heightClassName + " place-items-center bg-[#0B1014] p-6 text-center"}><div><p className="text-sm font-black text-white/60">Mapa offline ainda sem coordenadas salvas.</p><p className="mt-2 text-xs leading-relaxed text-white/35">Abra o mapa uma vez com internet para posicionar os postos e armazenar as coordenadas neste aparelho.</p></div></div>;
  }

  if (isGitHubPagesRuntime()) {
    return <TileStationMap stations={resolvedStations} heightClassName={heightClassName} onSelectStation={onSelectStation} fallback={<OfflineStationMap stations={drawableStations} heightClassName={heightClassName} onSelectStation={onSelectStation} />} />;
  }

  if (offline || mapUnavailable) {
    return <OfflineStationMap stations={drawableStations} heightClassName={heightClassName} onSelectStation={onSelectStation} />;
  }

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,.24)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[#07191f]/35 to-transparent" />
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
        <button type="button" onClick={toggleTilt} className={"min-h-11 rounded-xl border px-3 text-xs font-black shadow-lg backdrop-blur " + (tiltEnabled ? "border-[#C7FF3C]/30 bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-[#0B1014]/90 text-white")}>
          {tiltEnabled ? "2.5D ativo" : "2.5D"}
        </button>
        <button type="button" onClick={() => { setMapMessage(null); mapRef.current?.setZoom(12); mapRef.current?.setCenter({ lat: -15.7545, lng: -48.2816 }); }} className="min-h-11 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur">
          Centro
        </button>
      </div>
      {mapMessage && <div role="status" className="absolute left-3 right-3 top-[4.65rem] z-20 rounded-xl border border-white/10 bg-[#0B1014]/95 px-3 py-2 text-xs font-bold text-white shadow-lg">{mapMessage}</div>}
      <MapView className="h-full w-full overflow-hidden" heightClassName={heightClassName} initialCenter={{ lat: -15.7545, lng: -48.2816 }} initialZoom={12} showTraffic={showTraffic} onLoadError={() => setMapUnavailable(true)} onMapReady={map => { mapRef.current = map; setReady(true); }} />
      {resolvingCount > 0 && <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-2xl border border-white/10 bg-[#0B1014]/90 px-3 py-2.5 text-xs font-black text-white shadow-xl backdrop-blur-xl" role="status" aria-live="polite">Posicionando {resolvingCount} posto(s). A ANP continua sendo a fonte cadastral principal.</div>}
      {drawableStations.length === 0 && <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-white/10 bg-[#0B1014]/90 px-3 py-2.5 text-center text-xs font-bold text-white/65 shadow-xl backdrop-blur-xl">Ainda buscando coordenadas dos postos. As fichas continuam disponíveis abaixo.</div>}
    </div>
  );
}
