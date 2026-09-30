import React, { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { LocateFixed, Minus, Plus, Satellite, TrafficCone } from "lucide-react";

type Stop = { placeId: string; name: string; address: string; lat: number; lng: number };
type TrafficInterval = { startPolylinePointIndex?: number; endPolylinePointIndex?: number; speed?: "NORMAL" | "SLOW" | "TRAFFIC_JAM" };
type RoutePreview = { id: string; polyline: string | null; selected?: boolean; trafficIntervals?: TrafficInterval[]; durationSeconds?: number | null; staticDurationSeconds?: number | null; distanceMeters?: number | null; toll?: { amount: number | null; currency?: string } | null };
type RouteMapProps = { origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number }; stops: Stop[]; routes?: RoutePreview[] };


function OfflineRoutePreview({ origin, destination, routes = [] }: Pick<RouteMapProps, "origin" | "destination" | "routes">) {
  const safeOrigin = origin ?? { lat: -15.7545, lng: -48.2816 };
  const safeDestination = destination ?? { lat: -15.7942, lng: -47.8822 };
  const decode = (encoded: string) => {
    const points: google.maps.LatLngLiteral[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 31) << shift;
        shift += 5;
      } while (byte >= 32);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 31) << shift;
        shift += 5;
      } while (byte >= 32);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  };

  const encodedRoute = routes.find(route => route.selected && route.polyline)?.polyline ??
    routes.find(route => route.polyline)?.polyline ??
    null;
  const pathPoints = encodedRoute ? decode(encodedRoute) : [safeOrigin, safeDestination];

  const allPoints: google.maps.LatLngLiteral[] = [safeOrigin, safeDestination, ...pathPoints];
  const minLat = Math.min(...allPoints.map(point => point.lat));
  const maxLat = Math.max(...allPoints.map(point => point.lat));
  const minLng = Math.min(...allPoints.map(point => point.lng));
  const maxLng = Math.max(...allPoints.map(point => point.lng));
  const latSpan = Math.max(maxLat - minLat, 0.002);
  const lngSpan = Math.max(maxLng - minLng, 0.002);
  const project = (point: google.maps.LatLngLiteral) => ({
    x: 60 + ((point.lng - minLng) / lngSpan) * 880,
    y: 500 - ((point.lat - minLat) / latSpan) * 440,
  });
  const projected = pathPoints.map(project);
  const line = projected.map((point, index) => (index === 0 ? "M" : "L") + point.x.toFixed(1) + " " + point.y.toFixed(1)).join(" ");

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#E8F0EA]">
      <svg viewBox="0 0 1000 560" className="absolute inset-0 h-full w-full" role="img" aria-label="Prévia offline da rota">
        <defs>
          <pattern id="route-preview-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#B9C9BD" strokeWidth="1" opacity=".5" />
          </pattern>
          <filter id="route-preview-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#163840" floodOpacity=".12" />
          </filter>
        </defs>
        <rect width="1000" height="560" fill="#E8F0EA" />
        <rect width="1000" height="560" fill="url(#route-preview-grid)" />
        <path d="M20 120 C 220 70, 350 170, 510 120 S 800 70, 980 150" fill="none" stroke="#D4DFD7" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 410 C 260 360, 420 470, 620 400 S 820 340, 980 430" fill="none" stroke="#D4DFD7" strokeWidth="12" strokeLinecap="round" />
        {line && <path d={line} fill="none" stroke="#163840" strokeOpacity=".16" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />}
        {line && <path d={line} fill="none" stroke="#163840" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />}
        {[{ label: "A", point: project(safeOrigin), fill: "#3DE3FF" }, { label: "B", point: project(safeDestination), fill: "#C7FF3C" }].map(item => (
          <g key={item.label}>
            <circle cx={item.point.x} cy={item.point.y} r="22" fill={item.fill} opacity=".24" />
            <circle cx={item.point.x} cy={item.point.y} r="12" fill={item.fill} stroke="#163840" strokeWidth="4" filter="url(#route-preview-shadow)" />
            <text x={item.point.x} y={item.point.y + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#163840">{item.label}</text>
          </g>
        ))}
      </svg>
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-black/10 bg-white/92 px-3 py-2.5 text-[#163840] shadow-lg backdrop-blur">
          <p className="text-[0.52rem] font-black uppercase tracking-[.14em]">Mapa independente</p>
          <p className="mt-1 text-[0.62rem] font-bold">Rota continua visível mesmo sem Google Maps.</p>
        </div>
        <button
          type="button"
          onClick={() => window.open("https://www.google.com/maps/dir/?api=1&origin=" + safeOrigin.lat + "," + safeOrigin.lng + "&destination=" + safeDestination.lat + "," + safeDestination.lng + "&travelmode=driving&dir_action=navigate", "_blank", "noopener,noreferrer")}
          className="min-h-11 rounded-xl bg-[#163840] px-3 text-[0.58rem] font-black text-white shadow-lg"
        >
          Navegar
        </button>
      </div>
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-black/10 bg-white/92 p-3 text-[#163840] shadow-lg backdrop-blur">
        <div className="grid grid-cols-2 gap-2 text-[0.58rem] font-bold">
          <span><strong>Origem</strong><br />{safeOrigin.lat.toFixed(5)}, {safeOrigin.lng.toFixed(5)}</span>
          <span><strong>Destino</strong><br />{safeDestination.lat.toFixed(5)}, {safeDestination.lng.toFixed(5)}</span>
        </div>
        <p className="mt-2 text-[0.5rem] font-semibold text-[#64746B]">Prévia local da geometria da rota. A navegação ao vivo fica no navegador escolhido.</p>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (!mapRef.current) return;
    const updateRenderingType = () => {
      const mapsApi = typeof window !== "undefined" ? window.google?.maps : undefined;
      const type = mapRef.current?.getRenderingType?.();
      if (!mapsApi?.RenderingType) return;
      if (type === mapsApi.RenderingType.VECTOR) setRenderingType("VECTOR");
      else if (type === mapsApi.RenderingType.RASTER) {
        setRenderingType("RASTER");
        setIs3D(false);
      }
    };
    updateRenderingType();
    const listener = mapRef.current.addListener("renderingtype_changed", updateRenderingType);
    return () => listener.remove();
  }, [mapReady]);

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
    const maps = window.google?.maps;
    if (!maps?.LatLngBounds || !maps.marker?.PinElement || !maps.marker?.AdvancedMarkerElement) return;

    const bounds = new maps.LatLngBounds();
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
  const selectedRoute = routes.find(route => route.selected) || routes[0];
  const trafficCounts = (selectedRoute?.trafficIntervals || []).reduce((acc, item) => {
    if (item.speed === "SLOW") acc.slow += 1;
    if (item.speed === "TRAFFIC_JAM") acc.jam += 1;
    return acc;
  }, { slow: 0, jam: 0 });
  const trafficImpactSeconds = selectedRoute?.durationSeconds != null && selectedRoute?.staticDurationSeconds != null
    ? Math.max(0, selectedRoute.durationSeconds - selectedRoute.staticDurationSeconds)
    : null;
  const trafficImpactMinutes = trafficImpactSeconds == null ? null : Math.max(0, Math.round(trafficImpactSeconds / 60));

  const toggleTraffic = () => {
    if (!mapRef.current) return;
    const next = !traffic;

    // Em ambientes de teste, SSR ou fallback sem Google Maps carregado,
    // o controle continua funcional sem tentar acessar window.google.maps.
    if (window.google?.maps) {
      if (!trafficRef.current) trafficRef.current = new window.google.maps.TrafficLayer();
      trafficRef.current.setMap(next ? mapRef.current : null);
    }

    setTraffic(next);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]" aria-label="Mapa interativo da viagem">
<MapView className="h-[min(68vh,620px)] min-h-[420px] overflow-hidden" initialCenter={{ lat: -15.7942, lng: -47.8822 }} initialZoom={11} fallback={<OfflineRoutePreview origin={origin} destination={destination} routes={routes} />} onMapReady={map => { mapRef.current = map; setMapReady(true); }} />
      <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
        <button type="button" onClick={fitRoute} disabled={!mapReady} aria-label="Enquadrar viagem" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur disabled:opacity-40"><LocateFixed className="size-4" />Viagem</button>
        <button type="button" onClick={toggleTraffic} disabled={!mapReady} aria-pressed={traffic} className={"inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " + (traffic ? "bg-[#C7FF3C] text-[#0B1014]" : "bg-[#0B1014]/90 text-white")}><TrafficCone className="size-4" />Trânsito</button>
        <button type="button" onClick={() => { const map = mapRef.current; if (!map) return; const next = !satellite; map.setMapTypeId(next ? "satellite" : "roadmap"); setSatellite(next); }} disabled={!mapReady} aria-pressed={satellite} className={"inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " + (satellite ? "bg-white text-[#0B1014]" : "bg-[#0B1014]/90 text-white")}><Satellite className="size-4" />Satélite</button>
      </div>
      <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-2">
        <span className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-[0.58rem] font-black text-white shadow-lg backdrop-blur">
          {isVector ? "3D · VETORIAL" : renderingType === "RASTER" ? "2D · COMPATIBILIDADE" : "MAPA · INICIALIZANDO"}
        </span>
        <button type="button" onClick={activate3D} disabled={!mapReady || !is3DAvailable} aria-pressed={is3D} className={"min-h-10 rounded-xl border px-3 text-[0.62rem] font-black shadow-lg backdrop-blur " + (is3D ? "border-[#C7FF3C]/40 bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-[#0B1014]/90 text-white")}>{is3D ? "2D" : "3D"}</button>
        <button type="button" onClick={rotateCompass} disabled={!mapReady} aria-label={`Girar mapa para ${heading} graus`} className="min-h-10 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-[0.62rem] font-black text-white shadow-lg backdrop-blur">N {Math.round(heading)}°</button>
      </div>
      {selectedRoute && (
        <div className="absolute bottom-3 left-3 max-w-[min(360px,calc(100%-84px))] rounded-xl border border-white/10 bg-[#0B1014]/90 p-3 text-white shadow-lg backdrop-blur" aria-live="polite">
          <p className="text-[0.54rem] font-black uppercase tracking-[0.14em] text-[#3DE3FF]">Rota em análise</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.62rem] font-bold">
            {selectedRoute.distanceMeters != null && <span>{(selectedRoute.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}
            {trafficImpactMinutes != null && <span>+{trafficImpactMinutes} min trânsito</span>}
            {selectedRoute.toll?.amount != null && <span>{selectedRoute.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: selectedRoute.toll.currency || "BRL" })} pedágio</span>}
          </div>
          {(trafficCounts.slow > 0 || trafficCounts.jam > 0) && (
            <p className="mt-1 text-[0.56rem] text-white/50">{trafficCounts.slow} trecho(s) lento(s) · {trafficCounts.jam} congestionado(s)</p>
          )}
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button type="button" onClick={() => mapRef.current?.setZoom(Math.min(21, (mapRef.current?.getZoom() || 11) + 1))} disabled={!mapReady} aria-label="Aumentar zoom" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"><Plus className="size-5" /></button>
        <button type="button" onClick={() => mapRef.current?.setZoom(Math.max(2, (mapRef.current?.getZoom() || 11) - 1))} disabled={!mapReady} aria-label="Diminuir zoom" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"><Minus className="size-5" /></button>
      </div>
    </section>
  );
}