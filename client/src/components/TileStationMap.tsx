import { Apple, LocateFixed, Navigation, Minus, Plus, Layers, Scan } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  buildWazeNavigationUrl,
} from "@/lib/mobileTools";
import type { StationMapItem } from "@/components/StationMap";

import MapDestinationPicker from "@/components/MapDestinationPicker";
import MapPlaceIcon, { mapPlaceSegment } from "@/components/MapPlaceIcon";
import MapPlaceActions from "@/components/MapPlaceActions";
import { mapMarkerGroups } from "@/lib/mapMarkerGroups";

const ROUTE_STYLES = {
  teal: { label: "Verde petróleo", color: "#147b88", width: 5 },
  blue: { label: "Azul", color: "#1d4ed8", width: 5 },
  contrast: { label: "Alto contraste", color: "#111827", width: 7 },
} as const;
const TRAVEL_LABELS = { driving: "Carro", walking: "A pé", cycling: "Bicicleta", transit: "Transporte público" } as const;
const TILE = 256;
const DEFAULT_CENTER = { lat: -15.7545, lng: -48.2816 };
const TILE_URL_TEMPLATE =
  import.meta.env.VITE_PUBLIC_TILE_URL?.trim() ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function tileUrl(z: number, x: number, y: number) {
  return TILE_URL_TEMPLATE.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

function stationKey(station: StationMapItem) {
  return (
    station.id ??
    station.cnpj ??
    station.placeId ??
    `${station.name}|${station.lat}|${station.lng}`
  );
}

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}
function projectBase(lat: number, lng: number) {
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * TILE,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE,
  };
}
function project(lat: number, lng: number, zoom: number) {
  const base = projectBase(lat, lng);
  const scale = 2 ** zoom;
  return { x: base.x * scale, y: base.y * scale };
}
function unproject(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}
function wrapTile(x: number, z: number) {
  const max = 2 ** z;
  return ((x % max) + max) % max;
}

export default function TileStationMap({
  stations,
  userCoords = null,
  heightClassName = "min-h-[320px] h-[min(68vh,620px)]",
  onSelectStation,
  fallback,
  selectionLabel = "Escolher posto no mapa",
  routePoints = [],
  onPlanDestination,
  travelMode = "driving",
}: {
  stations: StationMapItem[];
  userCoords?: { lat: number; lng: number } | null;
  heightClassName?: string;
  onSelectStation?: (station: StationMapItem) => void;
  fallback?: React.ReactNode;
  selectionLabel?: string;
  routePoints?: Array<{ lat: number; lng: number }>;
  onPlanDestination?: (station: StationMapItem) => void;
  travelMode?: "driving" | "walking" | "cycling" | "transit";
}) {
  const drawable = useMemo(
    () =>
      stations.filter(
        item =>
          typeof item.lat === "number" &&
          Number.isFinite(item.lat) &&
          typeof item.lng === "number" &&
          Number.isFinite(item.lng) &&
          Math.abs(item.lat) <= 90 &&
          Math.abs(item.lng) <= 180
      ) as Array<StationMapItem & { lat: number; lng: number }>,
    [stations]
  );

  const singlePointKey = drawable.length === 1 ? `${drawable[0].lat},${drawable[0].lng}` : "";
  const drawableByKey = useMemo(
    () => new Map(drawable.map(item => [stationKey(item), item] as const)),
    [drawable]
  );
  const pickerItems = useMemo(
    () => drawable.map(station => ({ ...station, id: stationKey(station) })),
    [drawable]
  );
  const drawableWorld = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    for (const station of drawable)
      result.set(stationKey(station), projectBase(station.lat, station.lng));
    return result;
  }, [drawable]);

  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const update = () => { setOffline(!navigator.onLine); if (navigator.onLine) setTileErrors(0); };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [routeStyle, setRouteStyle] = useState<keyof typeof ROUTE_STYLES>("blue");
  const [localLayer, setLocalLayer] = useState(false);
  const appearance = ROUTE_STYLES[routeStyle];
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState(() => userCoords ?? DEFAULT_CENTER);
  const [selectedId, setSelectedId] = useState<string | null>(
    drawable[0] ? stationKey(drawable[0]) : null
  );
  const [size, setSize] = useState({ width: 320, height: 520 });
  const [tileErrors, setTileErrors] = useState(0);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number; anchor: { lat: number; lng: number } } | null>(null);
  const [following, setFollowing] = useState(true);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    cx: number;
    cy: number;
  } | null>(null);

  useEffect(() => {
    if (userCoords && following) setCenter(userCoords);
  }, [userCoords?.lat, userCoords?.lng, following]);

  useEffect(() => {
    if (!selectedId || !drawableByKey.has(selectedId))
      setSelectedId(drawable[0] ? stationKey(drawable[0]) : null);
  }, [drawable, drawableByKey, selectedId]);

  useEffect(() => {
    const target = viewport.current;
    if (!target) return;
    const measure = () => {
      const next = {
        width: target.clientWidth || 320,
        height: target.clientHeight || 520,
      };
      setSize(current =>
        current.width === next.width && current.height === next.height
          ? current
          : next
      );
    };
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(target);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [drawable.length, tileErrors >= 5, offline, localLayer]);
  const width = size.width;
  const height = size.height;
  const zoomScale = 2 ** zoom;
  const centerBase = useMemo(
    () => projectBase(center.lat, center.lng),
    [center.lat, center.lng]
  );
  const centerPx = useMemo(
    () => ({ x: centerBase.x * zoomScale, y: centerBase.y * zoomScale }),
    [centerBase, zoomScale]
  );
  const tileZoom = Math.floor(zoom);
  const tileScale = 2 ** (zoom - tileZoom);
  const tileCenter = useMemo(() => {
    const scale = 2 ** tileZoom;
    return { x: centerBase.x * scale, y: centerBase.y * scale };
  }, [centerBase, tileZoom]);
  const metersPerPixel = 40075016.686 * Math.cos(center.lat * Math.PI / 180) / (TILE * 2 ** zoom);
  const scaleMeters = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find(value => value / metersPerPixel >= 60) ?? 50000;
  const baseTileX = Math.floor(tileCenter.x / TILE);
  const baseTileY = Math.floor(tileCenter.y / TILE);
  const radiusX = Math.ceil(width / (2 * TILE * tileScale)) + 1;
  const radiusY = Math.ceil(height / (2 * TILE * tileScale)) + 1;
  const tiles = useMemo(() => {
    const result: Array<{
      x: number;
      y: number;
      key: string;
      left: number;
      top: number;
    }> = [];
    for (let dy = -radiusY; dy <= radiusY; dy++) {
      for (let dx = -radiusX; dx <= radiusX; dx++) {
        const rawX = baseTileX + dx;
        const y = baseTileY + dy;
        result.push({
          x: wrapTile(rawX, tileZoom),
          y,
          key: `${tileZoom}:${rawX}:${y}`,
          left: (dx + radiusX) * TILE,
          top: (dy + radiusY) * TILE,
        });
      }
    }
    return result;
  }, [baseTileX, baseTileY, radiusX, radiusY, tileZoom]);

  const markerWorldPixels = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    for (const station of drawable) {
      const base = drawableWorld.get(stationKey(station));
      if (!base) continue;
      result.set(stationKey(station), {
        x: base.x * zoomScale,
        y: base.y * zoomScale,
      });
    }
    return result;
  }, [drawable, drawableWorld, zoomScale]);
  const selected = selectedId ? drawableByKey.get(selectedId) ?? null : null;
  const markerGroups = useMemo(
    () =>
      mapMarkerGroups(
        drawable,
        item => markerWorldPixels.get(stationKey(item)) ?? { x: -100000, y: -100000 },
        item =>
          zoom >= 17 ||
          stationKey(item) === selectedId ||
          ["origin", "destination"].includes(item.id ?? "")
      ),
    [drawable, markerWorldPixels, selectedId, zoom]
  );
  const markerPositions = useMemo(() => {
    const result = new Map<string, { left: number; top: number }>();
    for (const station of markerGroups.singles) {
      const world = markerWorldPixels.get(stationKey(station));
      if (!world) continue;
      result.set(stationKey(station), {
        left: width / 2 + world.x - centerPx.x,
        top: height / 2 + world.y - centerPx.y,
      });
    }
    return result;
  }, [markerGroups, markerWorldPixels, width, height, centerPx.x, centerPx.y]);
  const routeGeometryKey = routePoints.map(point => `${point.lat},${point.lng}`).join(";");
  const routeWorld = useMemo(
    () => routePoints.map(point => projectBase(point.lat, point.lng)),
    [routeGeometryKey]
  );
  const userWorld = useMemo(
    () => userCoords ? projectBase(userCoords.lat, userCoords.lng) : null,
    [userCoords?.lat, userCoords?.lng]
  );
  const routePolylinePoints = useMemo(
    () => routeWorld.map(base =>
      `${base.x * zoomScale},${base.y * zoomScale}`
    ).join(" "),
    [routeWorld, zoomScale]
  );
  const routePanTransform = `translate(${width / 2 - centerPx.x} ${height / 2 - centerPx.y})`;

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointers.current.size >= 2) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      setFollowing(false);
      setDragging(true);
      const [a, b] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      pinch.current = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        zoom,
        anchor: unproject(centerPx.x + (a.x + b.x) / 2 - rect.left - width / 2, centerPx.y + (a.y + b.y) / 2 - rect.top - height / 2, zoom),
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cx: centerPx.x,
      cy: centerPx.y,
    };
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const state = pinch.current;
      const nextZoom = Math.max(8, Math.min(17, state.zoom + Math.log2(Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) / state.distance)));
      const anchor = project(state.anchor.lat, state.anchor.lng, nextZoom);
      const rect = event.currentTarget.getBoundingClientRect();
      setZoom(nextZoom);
      setCenter(unproject(anchor.x - ((a.x + b.x) / 2 - rect.left - width / 2), anchor.y - ((a.y + b.y) / 2 - rect.top - height / 2), nextZoom));
      return;
    }
    const state = dragRef.current;
    if (!state || state.id !== event.pointerId) return;
    if (!dragging && Math.hypot(event.clientX - state.x, event.clientY - state.y) < 6) return;
    setFollowing(false);
    setDragging(true);
    const next = unproject(
      state.cx - (event.clientX - state.x),
      state.cy - (event.clientY - state.y),
      zoom
    );
    setCenter(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    const remaining = [...pointers.current.entries()][0];
    dragRef.current = remaining ? { id: remaining[0], x: remaining[1].x, y: remaining[1].y, cx: centerPx.x, cy: centerPx.y } : null;
    setDragging(Boolean(remaining));
  };

  const recenter = () => {
    if (!userCoords && routePoints.length > 1) { fitStations(); return; }
    setFollowing(true);
    setCenter(userCoords ?? DEFAULT_CENTER);
  };

  const changeZoom = (delta: number) => {
    setZoom(value => Math.max(8, Math.min(17, value + delta)));
  };

  const fitStations = () => {
    if (!drawable.length && !routePoints.length) return;
    const points = [
      ...(routePoints.length > 1 ? routePoints : drawable),
      ...(userCoords ? [userCoords] : []),
    ];
    const minLat = Math.min(...points.map(p => p.lat)),
      maxLat = Math.max(...points.map(p => p.lat));
    const minLng = Math.min(...points.map(p => p.lng)),
      maxLng = Math.max(...points.map(p => p.lng));
    setFollowing(false);
    let next = 17;
    while (next > 8) {
      const a = project(minLat, minLng, next),
        b = project(maxLat, maxLng, next);
      if (
        Math.abs(b.x - a.x) <= Math.max(80, width - 80) &&
        Math.abs(b.y - a.y) <= Math.max(80, height - 260)
      )
        break;
      next--;
    }
    setZoom(next);
    const a = project(minLat, minLng, next), b = project(maxLat, maxLng, next);
    setCenter(unproject((a.x + b.x) / 2, (a.y + b.y) / 2, next));
  };

  // A new array with the same geometry must not undo a user pan or zoom.
  useEffect(() => {
    if (routePoints.length > 1) fitStations();
  }, [routeGeometryKey]);

  useEffect(() => {
    if (singlePointKey && !routePoints.length) {
      setCenter({ lat: drawable[0].lat, lng: drawable[0].lng });
    }
  }, [singlePointKey]);

  const routeEndpoints = useMemo(
    () =>
      routePoints.length > 1
        ? drawable.filter(
            point => point.id === "origin" || point.id === "destination"
          )
        : [],
    [drawable, routePoints.length]
  );
  const focusEndpoint = (point: (typeof drawable)[number]) => {
    setFollowing(false);
    setSelectedId(stationKey(point));
    setCenter({ lat: point.lat, lng: point.lng });
    setZoom(value => Math.max(15, value));
  };

  const tileFallback = Boolean(fallback && (localLayer || offline || tileErrors >= 5));

  if (tileFallback)
    return (
      <div>
        {localLayer && !offline && <button type="button" onClick={() => setLocalLayer(false)} className="m-3 flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-800 shadow"><Layers className="size-4" />Voltar ao mapa de ruas</button>}
        {fallback}
        {!offline && !localLayer && (
          <button
            type="button"
            onClick={() => setTileErrors(0)}
            className="m-3 min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-white"
          >
            Tentar carregar mapa de ruas
          </button>
        )}
      </div>
    );

  if (!drawable.length) {
    return (
      <div
        className={
          "grid " +
          heightClassName +
          " place-items-center bg-[#E8F0EA] p-6 text-center text-[#163840]"
        }
      >
        {fallback ?? (
          <div>
            <p className="text-sm font-black">
              Mapa sem coordenadas suficientes.
            </p>
            <p className="mt-2 text-xs text-[#607169]">
              Os locais continuam disponíveis em lista.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={"min-w-0 max-w-full overflow-hidden rounded-[1.25rem] bg-[#dfe9e2]"}>
      <div data-map-surface className={"relative " + heightClassName}>
        <div aria-label="Escala do mapa" className="pointer-events-none absolute bottom-9 left-3 z-20 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-900">
          {scaleMeters >= 1000 ? `${scaleMeters / 1000} km` : `${scaleMeters} m`}
          <div className="h-1 border-x-2 border-b-2 border-slate-900" style={{ width: scaleMeters / metersPerPixel }} />
        </div>
        <div
          ref={viewport}
          role="region"
          aria-label={
            selectionLabel === "Escolher posto no mapa"
              ? "Mapa dos postos"
              : "Mapa de destinos"
          }
          aria-description="Use as setas para mover, mais e menos para zoom e Home para recentrar."
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
            if (offset) {
              setFollowing(false);
              setCenter(
                unproject(centerPx.x + offset[0], centerPx.y + offset[1], zoom)
              );
            }
            else if (event.key === "+" || event.key === "=") changeZoom(1);
            else if (event.key === "-") changeZoom(-1);
            else if (event.key === "Home") recenter();
            else return;
            event.preventDefault();
          }}
          className={
            "absolute inset-0 select-none touch-none overflow-hidden " +
            (dragging ? "cursor-grabbing" : "cursor-grab")
          }
          style={{ contain: "layout paint", overscrollBehavior: "contain" }}
          onPointerDown={beginDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onDoubleClick={event => {
            if (event.target instanceof Element && event.target.closest("button")) return;
            setFollowing(false);
            const rect = event.currentTarget.getBoundingClientRect();
            const nextZoom = Math.min(17, zoom + 1);
            const anchor = unproject(centerPx.x + event.clientX - rect.left - width / 2, centerPx.y + event.clientY - rect.top - height / 2, zoom);
            const projected = project(anchor.lat, anchor.lng, nextZoom);
            setZoom(nextZoom);
            setCenter(unproject(projected.x - (event.clientX - rect.left - width / 2), projected.y - (event.clientY - rect.top - height / 2), nextZoom));
          }}
        >
          <div
            data-map-tile-layer
            className="absolute"
            style={{
              width: TILE * (radiusX * 2 + 1),
              height: TILE * (radiusY * 2 + 1),
              left: 0,
              top: 0,
              transform: `translate3d(${width / 2 - (radiusX * TILE + tileCenter.x - baseTileX * TILE) * tileScale}px, ${height / 2 - (radiusY * TILE + tileCenter.y - baseTileY * TILE) * tileScale}px, 0) scale(${tileScale})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {tiles.map(tile => (
              <img
                key={tile.key}
                src={tileUrl(tileZoom, tile.x, tile.y)}
                referrerPolicy="origin"
                decoding="async"
                alt=""
                onError={() =>
                  setTileErrors(value => (value >= 5 ? value : value + 1))
                }
                draggable={false}
                className="absolute size-64 max-w-none"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
          </div>

          {routePoints.length > 1 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-label="Trajeto pelas ruas"
              role="img"
            >
              <g data-route-geometry transform={routePanTransform}>
                {["#ffffff", appearance.color].map((color, index) => (
                  <polyline
                    key={color}
                    fill="none"
                    stroke={color}
                    strokeWidth={index ? appearance.width : appearance.width + 4}
                    strokeDasharray={index && travelMode === "walking" ? "2 9" : index && travelMode === "cycling" ? "10 6" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={routePolylinePoints}
                  />
                ))}
              </g>
            </svg>
          )}
          <div className="pointer-events-none absolute inset-0">
            {markerGroups.groups.map(group => {
              const left = width / 2 + group.x - centerPx.x;
              const top = height / 2 + group.y - centerPx.y;
              if (left < -30 || left > width + 30 || top < -30 || top > height + 30) return null;
              return <button key={group.key} type="button" aria-label={`Ampliar grupo de ${group.items.length} lugares`} onPointerDown={event => event.stopPropagation()} onClick={() => {
                setFollowing(false);
                setCenter(unproject(group.x, group.y, zoom));
                setZoom(value => Math.min(17, value + 2));
              }} className="pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#e4edff] text-sm font-black text-[#2457b8] shadow-md ring-4 ring-blue-500/10" style={{ left, top }}>{group.items.length}</button>;
            })}
            {markerGroups.singles.map(station => {
              const position = markerPositions.get(stationKey(station));
              if (!position) return null;
              if (
                position.left < -30 ||
                position.left > width + 30 ||
                position.top < -40 ||
                position.top > height + 40
              )
                return null;
              const active = stationKey(station) === selectedId;
              return (
                <button
                  key={stationKey(station)}
                  type="button"
                  className="pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-full place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163840]"
                  style={{ left: position.left, top: position.top, zIndex: active ? 10 : 1 }}
                  onPointerDown={event => event.stopPropagation()}
                  onClick={() => {
                    setSelectedId(stationKey(station));
                    onSelectStation?.(station);
                  }}
                  aria-label={"Abrir " + station.name}
                  aria-pressed={active}
                  title={station.name + " · " + mapPlaceSegment(station).label}
                >
                  <span
                    className={
                      "grid size-9 place-items-center rounded-2xl border-2 border-white shadow-lg motion-safe:transition-transform " +
                      (routePoints.length > 1 && station.id === "destination"
                        ? "bg-[#163840] text-white"
                        : routePoints.length > 1 && station.id === "origin"
                          ? "bg-white text-[#163840]"
                          : active
                        ? "scale-110 bg-[#C7FF3C] text-[#163840]"
                        : station.coordinateKind === "street-midpoint"
                          ? "bg-amber-300 text-[#163840]"
                          : station.source === "ANP"
                          ? "bg-[#C7FF3C] text-[#163840]"
                          : "bg-[#3DE3FF] text-[#163840]")
                    }
                  >
                    <span className="text-xs font-black">{routePoints.length > 1 && station.id === "origin" ? "A" : routePoints.length > 1 && station.id === "destination" ? "B" : <MapPlaceIcon item={station} />}</span>
                  </span>
                </button>
              );
            })}

            {userCoords && userWorld &&
              (() => {
                const left = width / 2 + userWorld.x * zoomScale - centerPx.x;
                const top = height / 2 + userWorld.y * zoomScale - centerPx.y;
                return (
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#3DE3FF] shadow-[0_0_0_10px_rgba(61,227,255,.18)]"
                    style={{ left, top, width: 14, height: 14 }}
                    aria-label="Sua localização"
                  />
                );
              })()}
          </div>
        </div>

        {routeEndpoints.length > 0 && (
          <div
            role="group"
            aria-label="Pontos do percurso"
            className="absolute left-3 right-16 top-20 z-20 flex flex-wrap gap-2"
          >
            {routeEndpoints.map(point => (
              <button
                key={stationKey(point)}
                type="button"
                onClick={() => focusEndpoint(point)}
                className="min-h-11 rounded-xl bg-white/95 px-3 text-xs font-bold text-[#163840] shadow-md focus-visible:outline-2 focus-visible:outline-[#1a73e8]"
              >
                {point.id === "origin" ? "Ver origem" : "Ver destino"}
              </button>
            ))}
          </div>
        )}
        <div role="group" aria-label="Controles do mapa" className="absolute right-3 top-20 z-20 flex w-11 flex-col gap-2">
          <button
            type="button"
            onClick={() => changeZoom(1)}
            className="grid size-11 place-items-center rounded-2xl bg-white/95 text-[#163840] shadow-lg disabled:opacity-40"
            aria-label="Aumentar zoom"
            disabled={zoom >= 17}
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            className="grid size-11 place-items-center rounded-2xl bg-white/95 text-[#163840] shadow-lg disabled:opacity-40"
            aria-label="Diminuir zoom"
            disabled={zoom <= 8}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={recenter}
            className="grid size-11 place-items-center rounded-2xl bg-white/95 text-[#163840] shadow-lg"
            aria-label="Recentrar mapa"
            aria-pressed={following}
          >
            <LocateFixed className="size-4" />
          </button>
          <button
            type="button"
            onClick={fitStations}
            className="grid size-11 place-items-center rounded-2xl bg-white/95 text-[#163840] shadow-lg"
            aria-label="Ver todos"
            title={routePoints.length > 1 ? "Enquadrar percurso" : "Ver todos os lugares"}
          >
            <Scan className="size-4" />
          </button>

        </div>

        {fallback && <button type="button" onClick={() => setLocalLayer(true)} aria-label="Abrir mapa local offline" title="Mapa local · claro ou escuro" className="absolute bottom-3 right-16 z-20 grid size-11 place-items-center rounded-2xl bg-white/95 text-[#163840] shadow-lg"><Layers className="size-4" /></button>}

        <div className="absolute left-3 right-3 top-3 z-20 min-w-0">
          <MapDestinationPicker label={selectionLabel} value={selectedId}
            items={pickerItems}
            onSelect={id => {
              const station = drawableByKey.get(id);
              if (!station) return;
              setSelectedId(id);
              onSelectStation?.(station);
              setFollowing(false);
              setCenter({ lat: station.lat, lng: station.lng });
              setZoom(value => Math.max(13, value));
            }} />
        </div>
      </div>

      <div className="relative min-w-0 border-t border-black/10 bg-white/95 p-3.5 sm:p-4">
        {routePoints.length > 1 && <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">{TRAVEL_LABELS[travelMode]} · {travelMode === "walking" ? "linha pontilhada" : travelMode === "cycling" ? "linha tracejada" : "linha contínua"}</p>
            <label className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-700">Cor do trajeto
              <select value={routeStyle} onChange={event => setRouteStyle(event.target.value as keyof typeof ROUTE_STYLES)}
                className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-base text-slate-900">
                {Object.entries(ROUTE_STYLES).map(([value, style]) => <option key={value} value={value}>{style.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">Personalize o traçado sem alterar o caminho. A escolha vale enquanto este mapa estiver aberto.</p>
        </div>}
        {selected ? (
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#163840] text-white">
              <span className="text-xs font-black">
                <MapPlaceIcon item={selected} className="size-5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base leading-snug font-black text-[#163840]">
                {selected.name}
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#607169]">
                {selected.address || "Endereço não informado"}
              </p>
              {selected.coordinateLabel && <p className="mt-2 break-words text-xs font-bold text-[#765100]">{selected.coordinateLabel}</p>}
              {selected.coordinateKind === "street-midpoint" && <p className="mt-2 text-xs font-bold text-[#765100]">Centro aproximado da via · confirme quadra, lote e entrada.</p>}
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                {onPlanDestination && (
                  <button
                    type="button"
                    onClick={() => onPlanDestination(selected)}
                    className="min-h-11 min-w-0 rounded-lg bg-[#C7FF3C] px-2 text-xs font-black text-[#163840]"
                  >
                    Planejar até aqui
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      buildGoogleMapsDirectionsUrl(
                        "",
                        selected.lat + "," + selected.lng,
                        travelMode === "cycling" ? "bicycling" : travelMode,
                        true
                      ),
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg bg-[#163840] px-2 text-xs font-black text-white"
                >
                  <Navigation className="size-3" /> Google
                </button>
                {travelMode === "driving" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          buildWazeNavigationUrl(selected.address, {
                            lat: selected.lat,
                            lng: selected.lng,
                          }),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border border-black/10 px-2 text-xs font-black text-[#163840]"
                    >
                      Waze
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          buildAppleMapsDirectionsUrl(
                            selected.lat + "," + selected.lng
                          ),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border border-black/10 px-2 text-xs font-black text-[#163840]"
                    >
                      <Apple className="size-3" /> Apple
                    </button>
                  </>
                )}
              </div>
              <MapPlaceActions place={selected} />
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-[#607169]">
            Toque em um marcador para abrir a ficha.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#607169]">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center"
          >
            © OpenStreetMap contributors
          </a>
          <a
            href="https://www.openstreetmap.org/fixthemap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center underline decoration-dotted underline-offset-2"
          >
            Corrigir mapa
          </a>
          <span>ruas de fundo exigem internet</span>
        </div>
      </div>
    </div>
  );
}
