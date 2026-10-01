import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { decodeMapPolyline, isMapPoint } from "@/lib/mapGeometry";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { LocateFixed, Minus, Plus, Satellite, TrafficCone } from "lucide-react";

type Stop = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};
type TrafficInterval = {
  startPolylinePointIndex?: number;
  endPolylinePointIndex?: number;
  speed?: "NORMAL" | "SLOW" | "TRAFFIC_JAM";
};
type RoutePreview = {
  id: string;
  polyline: string | null;
  selected?: boolean;
  trafficIntervals?: TrafficInterval[];
  durationSeconds?: number | null;
  staticDurationSeconds?: number | null;
  distanceMeters?: number | null;
  toll?: { amount: number | null; currency?: string } | null;
};
type RouteMapProps = {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  stops: Stop[];
  routes?: RoutePreview[];
};

export function OfflineRoutePreview({
  origin,
  destination,
  stops = [],
  routes = [],
}: RouteMapProps) {
  const [zoom, setZoom] = useState(1);
  const validOrigin = isMapPoint(origin) ? origin : undefined;
  const validDestination = isMapPoint(destination) ? destination : undefined;
  const validStops = stops.filter(isMapPoint);
  const selected = routes.find(route => route.selected) ?? routes[0];
  const pathPoints = decodeMapPolyline(selected?.polyline ?? "");
  const points = [
    validOrigin,
    validDestination,
    ...validStops,
    ...pathPoints,
  ].filter(isMapPoint);
  if (!points.length)
    return (
      <div className="grid h-full place-items-center p-6 text-center text-white">
        <div>
          <p className="font-bold">Defina a origem e o destino</p>
          <p className="mt-2 text-sm text-white/70">
            O mapa mostrará os pontos informados e a geometria da rota quando
            disponível.
          </p>
        </div>
      </div>
    );
  const minLat = Math.min(...points.map(p => p.lat)),
    maxLat = Math.max(...points.map(p => p.lat));
  const minLng = Math.min(...points.map(p => p.lng)),
    maxLng = Math.max(...points.map(p => p.lng));
  const project = (p: { lat: number; lng: number }) => ({
    x: 60 + ((p.lng - minLng) / Math.max(maxLng - minLng, 0.002)) * 880,
    y: 500 - ((p.lat - minLat) / Math.max(maxLat - minLat, 0.002)) * 440,
  });
  const line = pathPoints
    .map((p, i) => {
      const v = project(p);
      return `${i ? "L" : "M"}${v.x} ${v.y}`;
    })
    .join(" ");
  const markers = [
    ...(validOrigin
      ? [{ point: validOrigin, label: "A", name: "Origem" }]
      : []),
    ...validStops.map((point, i) => ({
      point,
      label: String(i + 1),
      name: point.name,
    })),
    ...(validDestination
      ? [{ point: validDestination, label: "B", name: "Destino" }]
      : []),
  ];
  const navigation =
    validOrigin && validDestination
      ? "https://www.google.com/maps/dir/?api=1&origin=" +
        validOrigin.lat +
        "," +
        validOrigin.lng +
        "&destination=" +
        validDestination.lat +
        "," +
        validDestination.lng +
        "&travelmode=driving" +
        (validStops.length
          ? "&waypoints=" +
            encodeURIComponent(
              validStops.map(p => p.lat + "," + p.lng).join("|")
            )
          : "")
      : null;
  return (
    <div className="flex h-full flex-col bg-[#E8F0EA] text-[#163840]">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 p-3">
        <p className="flex-1 text-sm font-bold">Prévia local da viagem</p>
        <button
          type="button"
          aria-label="Diminuir zoom da prévia"
          disabled={zoom <= 1}
          onClick={() => setZoom(v => Math.max(1, v - 0.5))}
          className="grid size-11 place-items-center rounded-xl bg-white disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom da prévia"
          disabled={zoom >= 3}
          onClick={() => setZoom(v => Math.min(3, v + 0.5))}
          className="grid size-11 place-items-center rounded-xl bg-white disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-h-11 rounded-xl bg-white px-3 text-sm"
        >
          Enquadrar
        </button>
      </div>
      <svg
        viewBox="0 0 1000 560"
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label="Prévia offline da rota"
      >
        <title>
          {pathPoints.length
            ? "Geometria da rota disponível"
            : "Pontos da viagem; trajeto indisponível"}
        </title>
        <g transform={`translate(500 280) scale(${zoom}) translate(-500 -280)`}>
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#163840"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {markers.map((m, i) => {
            const p = project(m.point);
            return (
              <g key={i}>
                <title>{m.name}</title>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="20"
                  fill={m.label === "B" ? "#C7FF3C" : "#3DE3FF"}
                  stroke="#163840"
                  strokeWidth="3"
                />
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="space-y-2 border-t border-black/10 bg-white/90 p-3 text-sm">
        <p>
          {pathPoints.length
            ? "Geometria disponível neste aparelho. Sem ruas de fundo ou trânsito ao vivo."
            : "Somente os pontos informados. Não há geometria de rota disponível; nenhuma ligação representa um caminho transitável."}
        </p>
        {validStops.length > 0 && (
          <p>
            Paradas:{" "}
            {validStops.map((p, i) => `${i + 1}. ${p.name}`).join(" · ")}
          </p>
        )}
        {selected?.distanceMeters != null && (
          <p>
            {(selected.distanceMeters / 1000).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}{" "}
            km
            {selected.durationSeconds != null
              ? ` · ${Math.ceil(selected.durationSeconds / 60)} min estimados`
              : ""}
          </p>
        )}
        {navigation && (
          <a
            href={navigation}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#163840] px-3 font-bold text-white"
          >
            Abrir no Google Maps
          </a>
        )}
        <p className="text-xs text-[#607169]">
          O aplicativo externo pode exigir internet. A prévia local não oferece
          navegação curva a curva.
        </p>
      </div>
    </div>
  );
}


const TILE_SIZE = 256;

function clampMapLatitude(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function projectTilePoint(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((clampMapLatitude(lat) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
      scale,
  };
}

function unprojectTilePoint(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function wrapTileX(x: number, zoom: number) {
  const max = 2 ** zoom;
  return ((x % max) + max) % max;
}

export function TileRouteMap({
  origin,
  destination,
  stops = [],
  routes = [],
  fallback,
}: RouteMapProps & { fallback: React.ReactNode }) {
  const selected = routes.find(route => route.selected) ?? routes[0];
  const routePoints = useMemo(
    () => decodeMapPolyline(selected?.polyline ?? ""),
    [selected?.polyline]
  );
  const validOrigin = isMapPoint(origin) ? origin : undefined;
  const validDestination = isMapPoint(destination) ? destination : undefined;
  const validStops = stops.filter(isMapPoint);
  const allPoints = useMemo(
    () =>
      [validOrigin, validDestination, ...validStops, ...routePoints].filter(
        isMapPoint
      ),
    [
      validOrigin?.lat,
      validOrigin?.lng,
      validDestination?.lat,
      validDestination?.lng,
      validStops.map(point => point.placeId).join("|"),
      selected?.polyline,
    ]
  );
  const initialCenter = allPoints.length
    ? {
        lat:
          allPoints.reduce((sum, point) => sum + point.lat, 0) /
          allPoints.length,
        lng:
          allPoints.reduce((sum, point) => sum + point.lng, 0) /
          allPoints.length,
      }
    : { lat: -15.7545, lng: -48.2816 };
  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(13);
  const [size, setSize] = useState({ width: 320, height: 460 });
  const [tileErrors, setTileErrors] = useState(0);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    cx: number;
    cy: number;
  } | null>(null);

  const fitRoute = React.useCallback(() => {
    if (!allPoints.length) return;
    const minLat = Math.min(...allPoints.map(point => point.lat));
    const maxLat = Math.max(...allPoints.map(point => point.lat));
    const minLng = Math.min(...allPoints.map(point => point.lng));
    const maxLng = Math.max(...allPoints.map(point => point.lng));
    setCenter({
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    });
    let nextZoom = 17;
    while (nextZoom > 8) {
      const a = projectTilePoint(minLat, minLng, nextZoom);
      const b = projectTilePoint(maxLat, maxLng, nextZoom);
      if (
        Math.abs(b.x - a.x) <= Math.max(80, size.width - 72) &&
        Math.abs(b.y - a.y) <= Math.max(100, size.height - 150)
      )
        break;
      nextZoom -= 1;
    }
    setZoom(nextZoom);
  }, [allPoints, size.width, size.height]);

  useEffect(() => {
    const target = viewport.current;
    if (!target) return;
    const measure = () =>
      setSize({
        width: target.clientWidth || 320,
        height: target.clientHeight || 460,
      });
    measure();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(target);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    fitRoute();
  }, [fitRoute, selected?.polyline]);

  if (!allPoints.length) return <>{fallback}</>;
  if (tileErrors >= 5) return <>{fallback}</>;

  const centerPx = projectTilePoint(center.lat, center.lng, zoom);
  const baseTileX = Math.floor(centerPx.x / TILE_SIZE);
  const baseTileY = Math.floor(centerPx.y / TILE_SIZE);
  const radius = 2;
  const tiles: Array<{
    key: string;
    x: number;
    y: number;
    left: number;
    top: number;
  }> = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const rawX = baseTileX + dx;
      const y = baseTileY + dy;
      tiles.push({
        key: `${zoom}:${rawX}:${y}`,
        x: wrapTileX(rawX, zoom),
        y,
        left: (dx + radius) * TILE_SIZE,
        top: (dy + radius) * TILE_SIZE,
      });
    }
  }

  const screenPoint = (point: { lat: number; lng: number }) => {
    const projected = projectTilePoint(point.lat, point.lng, zoom);
    return {
      x: size.width / 2 + projected.x - centerPx.x,
      y: size.height / 2 + projected.y - centerPx.y,
    };
  };
  const routePath = routePoints
    .map((point, index) => {
      const screen = screenPoint(point);
      return `${index ? "L" : "M"}${screen.x} ${screen.y}`;
    })
    .join(" ");

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cx: centerPx.x,
      cy: centerPx.y,
    };
    setDragging(true);
  };
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.id !== event.pointerId) return;
    setCenter(
      unprojectTilePoint(
        state.cx - (event.clientX - state.x),
        state.cy - (event.clientY - state.y),
        zoom
      )
    );
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };
  const changeZoom = (delta: number) =>
    setZoom(value => Math.max(8, Math.min(18, value + delta)));

  const markerItems = [
    ...(validOrigin
      ? [{ point: validOrigin, label: "A", name: "Origem", tone: "bg-[#3DE3FF]" }]
      : []),
    ...validStops.map((point, index) => ({
      point,
      label: String(index + 1),
      name: point.name,
      tone: "bg-white",
    })),
    ...(validDestination
      ? [{ point: validDestination, label: "B", name: "Destino", tone: "bg-[#C7FF3C]" }]
      : []),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#dfe9e2] text-[#163840]">
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewport}
          role="region"
          aria-label="Mapa de ruas da rota"
          tabIndex={0}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            const offsets: Record<string, [number, number]> = {
              ArrowRight: [80, 0],
              ArrowLeft: [-80, 0],
              ArrowDown: [0, 80],
              ArrowUp: [0, -80],
            };
            const offset = offsets[event.key];
            if (offset)
              setCenter(
                unprojectTilePoint(
                  centerPx.x + offset[0],
                  centerPx.y + offset[1],
                  zoom
                )
              );
            else if (event.key === "+" || event.key === "=") changeZoom(1);
            else if (event.key === "-") changeZoom(-1);
            else if (event.key === "Home") fitRoute();
            else return;
            event.preventDefault();
          }}
          onPointerDown={beginDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={
            "absolute inset-0 select-none touch-none overflow-hidden " +
            (dragging ? "cursor-grabbing" : "cursor-grab")
          }
        >
          <div
            className="absolute"
            style={{
              width: TILE_SIZE * (radius * 2 + 1),
              height: TILE_SIZE * (radius * 2 + 1),
              left:
                size.width / 2 -
                radius * TILE_SIZE -
                (centerPx.x - baseTileX * TILE_SIZE),
              top:
                size.height / 2 -
                radius * TILE_SIZE -
                (centerPx.y - baseTileY * TILE_SIZE),
            }}
          >
            {tiles.map(tile => (
              <img
                key={tile.key}
                src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
                alt=""
                draggable={false}
                onError={() => setTileErrors(value => value + 1)}
                className="absolute size-64 max-w-none"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
          </div>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {routePath && (
              <>
                <path
                  d={routePath}
                  fill="none"
                  stroke="rgba(255,255,255,.92)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={routePath}
                  fill="none"
                  stroke="#163840"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0">
            {markerItems.map((marker, index) => {
              const position = screenPoint(marker.point);
              return (
                <span
                  key={marker.name + index}
                  className={
                    "absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#163840] text-xs font-black shadow-lg " +
                    marker.tone
                  }
                  style={{ left: position.x, top: position.y }}
                  title={marker.name}
                >
                  {marker.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="absolute left-3 top-3 z-20 flex gap-1.5">
          <button
            type="button"
            onClick={() => changeZoom(1)}
            className="grid size-11 place-items-center rounded-xl bg-white/95 shadow-lg"
            aria-label="Aumentar zoom"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            className="grid size-11 place-items-center rounded-xl bg-white/95 shadow-lg"
            aria-label="Diminuir zoom"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={fitRoute}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/95 px-3 text-xs font-black shadow-lg"
          >
            <LocateFixed className="size-4" />
            Rota
          </button>
        </div>

        {selected?.distanceMeters != null && (
          <div className="absolute bottom-3 left-3 z-20 rounded-xl bg-[#0B1014]/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
            {(selected.distanceMeters / 1000).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}{" "}
            km
            {selected.durationSeconds != null
              ? " · " + Math.max(1, Math.round(selected.durationSeconds / 60)) + " min"
              : ""}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-3 py-2 text-xs font-bold text-[#607169]">
        <span>Rota no próprio Trajeto</span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 inline-flex items-center"
        >
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
}

export function RouteMap({
  origin,
  destination,
  stops,
  routes = [],
}: RouteMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [traffic, setTraffic] = useState(false);

  const [is3D, setIs3D] = useState(false);
  const [heading, setHeading] = useState(0);

  const [renderingType, setRenderingType] = useState<
    "VECTOR" | "RASTER" | "UNINITIALIZED"
  >("UNINITIALIZED");
  const isVector = renderingType === "VECTOR";
  const is3DAvailable = isVector;

  useEffect(() => {
    if (!mapRef.current) return;
    const updateRenderingType = () => {
      const mapsApi =
        typeof window !== "undefined" ? window.google?.maps : undefined;
      const type = mapRef.current?.getRenderingType?.();
      if (!mapsApi?.RenderingType) return;
      if (type === mapsApi.RenderingType.VECTOR) setRenderingType("VECTOR");
      else if (type === mapsApi.RenderingType.RASTER) {
        setRenderingType("RASTER");
        setIs3D(false);
      }
    };
    updateRenderingType();
    const listener = mapRef.current.addListener(
      "renderingtype_changed",
      updateRenderingType
    );
    return () => listener.remove();
  }, [mapReady]);

  useEffect(
    () => () => {
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      polylinesRef.current.forEach(line => line.setMap(null));
      trafficRef.current?.setMap(null);
    },
    []
  );

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

  const trafficPath = (
    points: google.maps.LatLngLiteral[],
    interval: TrafficInterval
  ) => {
    const start = interval.startPolylinePointIndex ?? 0;
    const endExclusive = interval.endPolylinePointIndex ?? points.length;
    return points.slice(start, Math.min(points.length, endExclusive));
  };
  const decodePolyline = decodeMapPolyline;
  useEffect(() => {
    if (!mapRef.current || !window.google || !origin || !destination) return;
    markersRef.current.forEach(marker => (marker.map = null));
    markersRef.current = [];
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (
      !maps?.LatLngBounds ||
      !maps.marker?.PinElement ||
      !maps.marker?.AdvancedMarkerElement
    )
      return;

    const bounds = new maps.LatLngBounds();
    [origin, destination, ...stops].forEach(point => bounds.extend(point));
    routes
      ?.filter(route => route.polyline)
      .forEach(route =>
        decodePolyline(route.polyline as string).forEach(point =>
          bounds.extend(point)
        )
      );
    const makeMarker = (
      position: google.maps.LatLngLiteral,
      title: string,
      color: string
    ) => {
      const pin = new window.google.maps.marker.PinElement({
        background: color,
        borderColor: "#163840",
        glyphColor: "#163840",
      });
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title,
        content: pin.element,
      });
      markersRef.current.push(marker);
    };
    makeMarker(origin, "Origem", "#BA5B45");
    makeMarker(destination, "Destino", "#FFC928");
    stops.forEach(stop => makeMarker(stop, stop.name, "#E8EEE8"));
    map.fitBounds(bounds, 56);
  }, [mapReady, origin, destination, stops, routes]);

  useEffect(() => {
    if (!mapRef.current || !window.google || !mapReady) return;
    polylinesRef.current.forEach(line => line.setMap(null));
    polylinesRef.current = [];
    const validRoutes = (routes || []).filter(route => route.polyline);
    validRoutes.forEach(route => {
      const points = decodePolyline(route.polyline as string);
      const intervals = route.trafficIntervals || [];
      if (intervals.length) {
        intervals.forEach(interval => {
          const speedColor =
            interval.speed === "TRAFFIC_JAM"
              ? "#F06A6A"
              : interval.speed === "SLOW"
                ? "#FFC857"
                : "#6A8F8A";
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
    routes
      .filter(route => route.polyline)
      .forEach(route =>
        decodePolyline(route.polyline as string).forEach(point =>
          bounds.extend(point)
        )
      );
    const currentTilt = mapRef.current.getTilt?.() ?? 0;
    const currentHeading = mapRef.current.getHeading?.() ?? 0;
    mapRef.current.fitBounds(bounds, 56);
    if (is3D)
      window.setTimeout(
        () =>
          mapRef.current?.moveCamera({
            tilt: currentTilt || 55,
            heading: currentHeading,
          }),
        0
      );
  };
  const selectedRoute = routes.find(route => route.selected) || routes[0];
  const trafficCounts = (selectedRoute?.trafficIntervals || []).reduce(
    (acc, item) => {
      if (item.speed === "SLOW") acc.slow += 1;
      if (item.speed === "TRAFFIC_JAM") acc.jam += 1;
      return acc;
    },
    { slow: 0, jam: 0 }
  );
  const trafficImpactSeconds =
    selectedRoute?.durationSeconds != null &&
    selectedRoute?.staticDurationSeconds != null
      ? Math.max(
          0,
          selectedRoute.durationSeconds - selectedRoute.staticDurationSeconds
        )
      : null;
  const trafficImpactMinutes =
    trafficImpactSeconds == null
      ? null
      : Math.max(0, Math.round(trafficImpactSeconds / 60));

  const toggleTraffic = () => {
    if (!mapRef.current) return;
    const next = !traffic;

    // Em ambientes de teste, SSR ou fallback sem Google Maps carregado,
    // o controle continua funcional sem tentar acessar window.google.maps.
    if (window.google?.maps) {
      if (!trafficRef.current)
        trafficRef.current = new window.google.maps.TrafficLayer();
      trafficRef.current.setMap(next ? mapRef.current : null);
    }

    setTraffic(next);
  };

  if (isGitHubPagesRuntime()) {
    const fallback = (
      <OfflineRoutePreview
        origin={origin}
        destination={destination}
        routes={routes}
        stops={stops}
      />
    );
    return (
      <section
        className="relative h-[min(68vh,620px)] min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]"
        aria-label="Mapa independente da viagem"
      >
        <TileRouteMap
          origin={origin}
          destination={destination}
          routes={routes}
          stops={stops}
          fallback={fallback}
        />
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]"
      aria-label="Mapa interativo da viagem"
    >
      <MapView
        className="h-[min(68vh,620px)] min-h-[420px] overflow-hidden"
        initialCenter={{ lat: -15.7545, lng: -48.2816 }}
        initialZoom={11}
        fallback={
          <OfflineRoutePreview
            origin={origin}
            destination={destination}
            routes={routes}
            stops={stops}
          />
        }
        onMapReady={map => {
          mapRef.current = map;
          setMapReady(true);
        }}
      />
      {mapReady && (
        <>
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
            <button
              type="button"
              onClick={fitRoute}
              disabled={!mapReady}
              aria-label="Enquadrar viagem"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur disabled:opacity-40"
            >
              <LocateFixed className="size-4" />
              Viagem
            </button>
            <button
              type="button"
              onClick={toggleTraffic}
              disabled={!mapReady}
              aria-pressed={traffic}
              className={
                "inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " +
                (traffic
                  ? "bg-[#C7FF3C] text-[#0B1014]"
                  : "bg-[#0B1014]/90 text-white")
              }
            >
              <TrafficCone className="size-4" />
              Trânsito
            </button>
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current;
                if (!map) return;
                const next = !satellite;
                map.setMapTypeId(next ? "satellite" : "roadmap");
                setSatellite(next);
              }}
              disabled={!mapReady}
              aria-pressed={satellite}
              className={
                "inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-black shadow-lg backdrop-blur " +
                (satellite
                  ? "bg-white text-[#0B1014]"
                  : "bg-[#0B1014]/90 text-white")
              }
            >
              <Satellite className="size-4" />
              Satélite
            </button>
          </div>
          <div className="absolute right-3 top-[7rem] z-10 hidden flex-wrap justify-end gap-2 sm:flex">
            <span className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur">
              {isVector
                ? "3D · VETORIAL"
                : renderingType === "RASTER"
                  ? "2D · COMPATIBILIDADE"
                  : "MAPA · INICIALIZANDO"}
            </span>
            <button
              type="button"
              onClick={activate3D}
              disabled={!mapReady || !is3DAvailable}
              aria-pressed={is3D}
              className={
                "min-h-11 rounded-xl border px-3 text-xs font-black shadow-lg backdrop-blur " +
                (is3D
                  ? "border-[#C7FF3C]/40 bg-[#C7FF3C] text-[#0B1014]"
                  : "border-white/10 bg-[#0B1014]/90 text-white")
              }
            >
              {is3D ? "2D" : "3D"}
            </button>
            <button
              type="button"
              onClick={rotateCompass}
              disabled={!mapReady || !isVector}
              aria-label={`Girar mapa para ${(heading + 45) % 360} graus`}
              className="min-h-11 rounded-xl border border-white/10 bg-[#0B1014]/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur"
            >
              N {Math.round(heading)}°
            </button>
          </div>
          {selectedRoute && (
            <div
              className="absolute bottom-3 left-3 max-w-[min(360px,calc(100%-84px))] rounded-xl border border-white/10 bg-[#0B1014]/90 p-3 text-white shadow-lg backdrop-blur"
              aria-live="polite"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#3DE3FF]">
                Rota em análise
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                {selectedRoute.distanceMeters != null && (
                  <span>
                    {(selectedRoute.distanceMeters / 1000).toLocaleString(
                      "pt-BR",
                      {
                        maximumFractionDigits: 1,
                      }
                    )}{" "}
                    km
                  </span>
                )}
                {trafficImpactMinutes != null && (
                  <span>+{trafficImpactMinutes} min trânsito</span>
                )}
                {selectedRoute.toll?.amount != null && (
                  <span>
                    {selectedRoute.toll.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: selectedRoute.toll.currency || "BRL",
                    })}{" "}
                    pedágio
                  </span>
                )}
              </div>
              {(trafficCounts.slow > 0 || trafficCounts.jam > 0) && (
                <p className="mt-1 text-xs text-white/50">
                  {trafficCounts.slow} trecho(s) lento(s) · {trafficCounts.jam}{" "}
                  congestionado(s)
                </p>
              )}
            </div>
          )}

          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() =>
                mapRef.current?.setZoom(
                  Math.min(21, (mapRef.current?.getZoom() || 11) + 1)
                )
              }
              disabled={!mapReady}
              aria-label="Aumentar zoom"
              className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"
            >
              <Plus className="size-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                mapRef.current?.setZoom(
                  Math.max(2, (mapRef.current?.getZoom() || 11) - 1)
                )
              }
              disabled={!mapReady}
              aria-label="Diminuir zoom"
              className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0B1014]/90 text-white shadow-lg backdrop-blur disabled:opacity-40"
            >
              <Minus className="size-5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
