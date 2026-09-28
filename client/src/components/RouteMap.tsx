import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus, Satellite, TrafficCone } from "lucide-react";

type Stop = { placeId: string; name: string; address: string; lat: number; lng: number };
type TrafficInterval = { startPolylinePointIndex?: number; endPolylinePointIndex?: number; speed?: "NORMAL" | "SLOW" | "TRAFFIC_JAM" };
type RoutePreview = { id: string; polyline: string | null; selected?: boolean; trafficIntervals?: TrafficInterval[] };
type RouteMapProps = { origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number }; stops: Stop[]; routes?: RoutePreview[] };

export function RouteMap({ origin, destination, stops, routes = [] }: RouteMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [traffic, setTraffic] = useState(false);

  const [is3D, setIs3D] = useState(false);
  const [heading, setHeading] = useState(0);
  const [offlinePreview, setOfflinePreview] = useState(false);
  const [renderingType, setRenderingType] = useState<"VECTOR" | "RASTER" | "UNINITIALIZED">("UNINITIALIZED");
  const isVector = renderingType === "VECTOR";
  const is3DAvailable = isVector;

  const activate3D = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!isVector) return;
    const next = !is3D;
    setIs3D(next);
    map.setOptions(next ? { tilt: 60, heading } : { tilt: 0, heading: 0 });
  };

  const rotateCompass = () => {
    const next = (heading + 45) % 360;
    setHeading(next);
    mapRef.current?.setHeading(next);
  };

  const trafficPath = (points: google.maps.LatLngLiteral[], interval: TrafficInterval) => {
    const start = interval.startPolylinePointIndex ?? 0;
    const endExclusive = interval.endPolylinePointIndex ?? points.length;
    return points.slice(start, Math.min(points.length, endExclusive));
  };
  const decodePolyline = (encoded: string): google.maps.LatLngLiteral[] => {
    const points: google.maps.LatLngLiteral[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte = 0;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      result = 0;
      shift = 0;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  };
  useEffect(() => {
    if (!mapRef.current || !window.google || !origin || !destination) return;
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    [origin, destination, ...stops].forEach(point => bounds.extend(point));
    routes?.filter(route => route.polyline).forEach(route => decodePolyline(route.polyline as string).forEach(point => bounds.extend(point)));
    const makeMarker = (position: google.maps.LatLngLiteral, title: string, color: string) => {
      const pin = new window.google.maps.marker.PinElement({ background: color, borderColor: "#163840", glyphColor: "#163840" });
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position, title, content: pin.element });
      markersRef.current.push(marker);
    };
    makeMarker(origin, "Origem", "#BA5B45");
    makeMarker(destination, "Destino", "#FFC928");
    stops.forEach(stop => makeMarker(stop, stop.name, "#E8EEE8"));
    map.fitBounds(bounds, 56);
  }, [mapReady, origin, destination, stops]);

  useEffect(() => {
    if (!mapRef.current || !window.google || !mapReady) return;
    polylinesRef.current.forEach(line => line.setMap(null));
    polylinesRef.current = [];
    const validRoutes = (routes || []).filter(route => route.polyline);
    validRoutes.forEach((route) => {
      const points = decodePolyline(route.polyline as string);
      const intervals = route.trafficIntervals || [];
      if (intervals.length) {
        intervals.forEach(interval => {
          const speedColor = interval.speed === "TRAFFIC_JAM" ? "#F06A6A" : interval.speed === "SLOW" ? "#FFC857" : "#6A8F8A";
          const line = new window.google.maps.Polyline({
            map: mapRef.current,
            path: trafficPath(points, interval),
            geodesic: true,
            strokeColor: speedColor,
            strokeOpacity: route.selected ? 0.95 : 0.45,
            strokeWeight: route.selected ? 6 : 3,
            zIndex: route.selected ? 4 : 2,
          });
          polylinesRef.current.push(line);
        });
      } else {
        const line = new window.google.maps.Polyline({
          map: mapRef.current,
          path: points,
          geodesic: true,
          strokeColor: route.selected ? "#BA5B45" : "#6A8F8A",
          strokeOpacity: route.selected ? 0.95 : 0.38,
          strokeWeight: route.selected ? 6 : 3,
          zIndex: route.selected ? 4 : 2,
        });
        polylinesRef.current.push(line);
      }
    });
  }, [mapReady, routes]);
  const fitRoute = () => {
    if (!mapRef.current || !origin || !destination) return;
    const bounds = new window.google.maps.LatLngBounds();
    [origin, destination, ...stops].forEach(point => bounds.extend(point));
    routes.filter(route => route.polyline).forEach(route => decodePolyline(route.polyline as string).forEach(point => bounds.extend(point)));
    const currentTilt = mapRef.current.getTilt?.() ?? 0;
    const currentHeading = mapRef.current.getHeading?.() ?? 0;
    mapRef.current.fitBounds(bounds, 56);
    if (is3D) window.setTimeout(() => mapRef.current?.moveCamera({ tilt: currentTilt || 55, heading: currentHeading }), 0);
  };
  const toggleTraffic = () => {
    if (!mapRef.current) return;
    if (!trafficRef.current) trafficRef.current = new window.google.maps.TrafficLayer();
    const next = !traffic;
    trafficRef.current.setMap(next ? mapRef.current : null);
    setTraffic(next);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]" aria-label="Mapa interativo da viagem">
<MapView className="h-[min(68vh,620px)] min-h-[420px] overflow-hidden" initialCenter={{ lat: -15.7942, lng: -47.8822 }} initialZoom={11} onMapReady={map => { mapRef.current = map; setMapReady(true); }}
        onRenderingTypeChange={type => { setRenderingType(type as "VECTOR" | "RASTER" | "UNINITIALIZED"); if (type !== window.google.maps.RenderingType.VECTOR) setIs3D(false); }} />
      <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
        <button type="button" onClick={fitRoute} disabled={!mapReady} aria-label="Enquadrar viagem" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur disabled:opacity-40"><LocateFixed className="size-4" />Viagem</button>
        <button type="button" onClick={toggleTraffic} disabled={!mapReady} aria-pressed={traffic} className={"inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " + (traffic ? "bg-[#C7FF3C] text-[#0B1014]" : "bg-[#0B1014]/90 text-white")}><TrafficCone className="size-4" />Trânsito</button>
        <button type="button" onClick={() => { const map = mapRef.current; if (!map) return; const next = !satellite; map.setMapTypeId(next ? "satellite" : "roadmap"); setSatellite(next); }} disabled={!mapReady} aria-pressed={satellite} className={"inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " + (satellite ? "bg-white text-[#0B1014]" : "bg-[#0B1014]/90 text-white")}><Satellite className="size-4" />Satélite</button>
      </div>
      <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-2">
        <span className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-[0.58rem] font-black text-white shadow-lg backdrop-blur">
          {isVector ? "3D · VETORIAL" : renderingType === google.maps.RenderingType.RASTER ? "2D · COMPATIBILIDADE" : "MAPA · INICIALIZANDO"}
        </span>
        <button type="button" onClick={activate3D} disabled={!mapReady || !is3DAvailable} aria-pressed={is3D} className={"min-h-10 rounded-xl border px-3 text-[0.62rem] font-black shadow-lg backdrop-blur " + (is3D ? "border-[#C7FF3C]/40 bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-[#0B1014]/90 text-white")}>{is3D ? "2D" : "3D"}</button>
        <button type="button" onClick={rotateCompass} disabled={!mapReady} aria-label={`Girar mapa para ${heading} graus`} className="min-h-10 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-[0.62rem] font-black text-white shadow-lg backdrop-blur">N {Math.round(heading)}°</button>
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button type="button" onClick={() => mapRef.current?.setZoom(Math.min(21, (mapRef.current?.getZoom() || 11) + 1))} disabled={!mapReady} aria-label="Aumentar zoom" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"><Plus className="size-5" /></button>
        <button type="button" onClick={() => mapRef.current?.setZoom(Math.max(2, (mapRef.current?.getZoom() || 11) - 1))} disabled={!mapReady} aria-label="Diminuir zoom" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"><Minus className="size-5" /></button>
      </div>
    </section>
  );
}