import { Sun, Moon, Expand, Minimize, Map as MapIcon } from "lucide-react";
import { groundMetresPerPixel, roadPriority } from "@/lib/mapPresentation";
import { mapMarkerGroups } from "@/lib/mapMarkerGroups";
import MapPlaceIcon from "@/components/MapPlaceIcon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { isMapPoint, type MapPoint } from "@/lib/mapGeometry";

export type OfflineMapMarker = MapPoint & {
  id: string;
  name: string;
  label: string;
  isReference?: boolean;
  category?: string;
  source?: string;
  coordinateKind?: string;
};
type Road = {
  id: number;
  kind: string;
  name: string;
  points: [number, number][];
};
type MapPack = { schema: number; retrievedAt: string; roads: Road[] };
const ROAD_GRID = 4096;
let packPromise: Promise<MapPack> | undefined;
export function loadOfflineMapPack() {
  if (!packPromise)
    packPromise = fetch(appUrl("/data/aguas-lindas-offline-map.json"))
      .then(async response => {
        if (!response.ok) throw new Error("map unavailable");
        const data = (await response.json()) as MapPack;
        if (
          data.schema !== 1 ||
          !Number.isFinite(Date.parse(data.retrievedAt)) ||
          !Array.isArray(data.roads) ||
          data.roads.length > 12000
        )
          throw new Error("map invalid");
        const roads = data.roads.filter(
          road =>
            Number.isFinite(road.id) &&
            typeof road.name === "string" &&
            typeof road.kind === "string" &&
            Array.isArray(road.points) &&
            road.points.length >= 2 &&
            road.points.length < 10000 &&
            road.points.every(
              p => Array.isArray(p) && isMapPoint({ lat: p[0], lng: p[1] })
            )
        );
        if (!roads.length) throw new Error("map empty");
        return { ...data, roads };
      })
      .catch(error => {
        packPromise = undefined;
        throw error;
      });
  return packPromise;
}
function world(point: MapPoint) {
  const lat = (Math.max(-85, Math.min(85, point.lat)) * Math.PI) / 180;
  return {
    x: (point.lng + 180) / 360,
    y: (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2,
  };
}

export default function OfflineMapCanvas({
  markers,
  selectedMarkerId,
  routePoints = [],
  estimated = false,
  initialDark = true,
  controls,
  zoom,
  onZoom,
  resetKey = 0,
  focusRequest,
  followPoint,
  onManualInteraction,
  ariaLabel = "Mapa vetorial offline",
  onSelect,
  className = "h-[360px]",
}: {
  markers: OfflineMapMarker[];
  selectedMarkerId?: string | null;
  routePoints?: MapPoint[];
  estimated?: boolean;
  initialDark?: boolean;
  controls?: React.ReactNode;
  zoom: number;
  onZoom: (zoom: number) => void;
  resetKey?: number;
  focusRequest?: { point: MapPoint; key: number } | null;
  followPoint?: MapPoint;
  onManualInteraction?: () => void;
  ariaLabel?: string;
  onSelect?: (marker: OfflineMapMarker) => void;
  className?: string;
}) {
  const [pack, setPack] = useState<MapPack | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("trajeto-map-theme");
      return saved === "dark" ? true : saved === "light" ? false : initialDark;
    } catch { return initialDark; }
  });
  useEffect(() => {
    try { localStorage.setItem("trajeto-map-theme", dark ? "dark" : "light"); } catch { /* Map stays usable when storage is unavailable. */ }
  }, [dark]);
  const [showAllStreetNames, setShowAllStreetNames] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 360 });
  const viewport = useRef<HTMLDivElement>(null);
  const gestureZoom = useRef(zoom);
  gestureZoom.current = zoom;
  const gestureStarted = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const validMarkers = useMemo(() => markers.filter(isMapPoint), [markers]);
  const validGeometry = useMemo(() => routePoints.filter(isMapPoint), [routePoints]);
  const geometry = useMemo(() => {
    const stride = Math.max(1, Math.ceil(validGeometry.length / 6000));
    return stride === 1
      ? validGeometry
      : [
          ...validGeometry.filter((_, i) => i % stride === 0),
          validGeometry[validGeometry.length - 1],
        ];
  }, [validGeometry]);
  // Nearby references must not zoom the trip out beyond its endpoints.
  const anchors = useMemo(() => {
    const tripMarkers = validMarkers.filter(
      p => p.id === "origin" || p.id === "destination" || (geometry.length < 2 && p.id.startsWith("stop-"))
    );
    return tripMarkers.length
      ? tripMarkers
      : validMarkers.filter(
          p => p.id !== "live-position" && p.id !== "device-location"
        );
  }, [validMarkers, geometry.length]);
  const fingerprint = useMemo(
    () =>
      (anchors.length || geometry.length ? anchors : validMarkers)
        .map(p => `${p.id}:${p.lat}:${p.lng}`)
        .join("|") +
      ":" +
      geometry.map(p => `${p.lat}:${p.lng}`).join("|"),
    [anchors, geometry, validMarkers]
  );
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    pointers.current.clear();
    gestureStarted.current = false;
  }, [resetKey, fingerprint]);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void loadOfflineMapPack()
      .then(data => {
        if (!cancelled) setPack(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  useEffect(() => {
    const recover = () => {
      if (!pack) setAttempt(v => v + 1);
    };
    window.addEventListener("online", recover);
    return () => window.removeEventListener("online", recover);
  }, [pack]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => {
      const next = { width: el.clientWidth || 320, height: el.clientHeight || 360 };
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
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const camera = useMemo(() => {
    const points = (
      anchors.length || geometry.length
        ? [...anchors, ...geometry]
        : validMarkers
    ).map(world);
    if (!points.length) points.push(world({ lat: -15.7545, lng: -48.2816 }));
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const scale = Math.min(
      (size.width - 70) / Math.max(maxX - minX, 0.00004),
      (size.height - 100) / Math.max(maxY - minY, 0.00004)
    );
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, scale: scale * zoom };
  }, [fingerprint, size.width, size.height, zoom]);
  const lastFocusRequest = useRef<typeof focusRequest>(null);
  useEffect(() => {
    if (!focusRequest || lastFocusRequest.current === focusRequest) return;
    lastFocusRequest.current = focusRequest;
    const point = world(focusRequest.point);
    setPan({
      x: -(point.x - camera.x) * camera.scale,
      y: -(point.y - camera.y) * camera.scale,
    });
  }, [focusRequest, camera]);
  useEffect(() => {
    if (!isMapPoint(followPoint)) return;
    const point = world(followPoint);
    setPan({
      x: -(point.x - camera.x) * camera.scale,
      y: -(point.y - camera.y) * camera.scale,
    });
  }, [followPoint?.lat, followPoint?.lng, camera]);
  const markerWorld = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    for (const marker of validMarkers) result.set(marker.id, world(marker));
    return result;
  }, [validMarkers]);
  const baseProject = (point: OfflineMapMarker) => {
    const p = markerWorld.get(point.id) ?? world(point);
    return {
      x: size.width / 2 + (p.x - camera.x) * camera.scale,
      y: size.height / 2 + (p.y - camera.y) * camera.scale,
    };
  };
  const project = (point: MapPoint) => {
    const p = "id" in point && typeof point.id === "string"
      ? markerWorld.get(point.id) ?? world(point)
      : world(point);
    return {
      x: size.width / 2 + (p.x - camera.x) * camera.scale + pan.x,
      y: size.height / 2 + (p.y - camera.y) * camera.scale + pan.y,
    };
  };
  // Only supporting references are suppressed; trip endpoints and GPS remain selectable.
  const displayedMarkers = useMemo(() => {
    const occupied = validMarkers
      .filter(marker => !marker.isReference)
      .map(baseProject);
    return validMarkers.filter(marker => {
      if (!marker.isReference) return true;
      const point = baseProject(marker);
      if (
        occupied.some(
          other => Math.hypot(point.x - other.x, point.y - other.y) < 44
        )
      )
        return false;
      occupied.push(point);
      return true;
    });
  }, [validMarkers, markerWorld, camera.x, camera.y, camera.scale, size.width, size.height]);
  const markerGroups = useMemo(
    () =>
      mapMarkerGroups(
        displayedMarkers,
        baseProject,
        marker =>
          zoom >= 6 ||
          marker.id === selectedMarkerId ||
          ["origin", "destination", "live-position", "device-location"].includes(marker.id)
      ),
    [displayedMarkers, markerWorld, camera.x, camera.y, camera.scale, size.width, size.height, zoom, selectedMarkerId]
  );
  const markerCollisionPoints = useMemo(
    () =>
      validMarkers.flatMap(marker => {
        const point = markerWorld.get(marker.id);
        if (!point) return [];
        return [{
          x: size.width / 2 + (point.x - camera.x) * camera.scale,
          y: size.height / 2 + (point.y - camera.y) * camera.scale,
        }];
      }),
    [validMarkers, markerWorld, camera.x, camera.y, camera.scale, size.width, size.height]
  );
  const geometryPath = useMemo(
    () =>
      geometry
        .map(point => world(point))
        .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(8)} ${point.y.toFixed(8)}`)
        .join(" "),
    [fingerprint]
  );
  // Project and bound each road once per pack, rather than walking every
  // coordinate on each gesture. Only visible roads become SVG paths.
  const roads = useMemo(
    () =>
      pack?.roads.map(road => {
        const points = road.points.map(([lat, lng]) => world({ lat, lng }));
        const bounds = {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        };
        for (const point of points) {
          bounds.minX = Math.min(bounds.minX, point.x);
          bounds.maxX = Math.max(bounds.maxX, point.x);
          bounds.minY = Math.min(bounds.minY, point.y);
          bounds.maxY = Math.max(bounds.maxY, point.y);
        }
        const path = points
          .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(8)} ${point.y.toFixed(8)}`)
          .join(" ");
        return { ...road, priority: roadPriority(road.kind), world: points, bounds, path };
      }).sort((a, b) => a.priority - b.priority) ?? [],
    [pack]
  );
  const roadGrid = useMemo(() => {
    const buckets = new Map<string, number[]>();
    roads.forEach((road, index) => {
      const minX = Math.floor(road.bounds.minX * ROAD_GRID);
      const maxX = Math.floor(road.bounds.maxX * ROAD_GRID);
      const minY = Math.floor(road.bounds.minY * ROAD_GRID);
      const maxY = Math.floor(road.bounds.maxY * ROAD_GRID);
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const key = `${x}:${y}`;
          const bucket = buckets.get(key);
          if (bucket) bucket.push(index);
          else buckets.set(key, [index]);
        }
      }
    });
    return buckets;
  }, [roads]);
  const visible = useMemo(() => {
    const left = size.width / 2 - camera.x * camera.scale + pan.x;
    const top = size.height / 2 - camera.y * camera.scale + pan.y;
    const minWorldX = (-80 - left) / camera.scale;
    const maxWorldX = (size.width + 80 - left) / camera.scale;
    const minWorldY = (-80 - top) / camera.scale;
    const maxWorldY = (size.height + 80 - top) / camera.scale;
    const minCellX = Math.floor(minWorldX * ROAD_GRID);
    const maxCellX = Math.floor(maxWorldX * ROAD_GRID);
    const minCellY = Math.floor(minWorldY * ROAD_GRID);
    const maxCellY = Math.floor(maxWorldY * ROAD_GRID);
    const cellCount = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);
    const candidates = new Set<number>();
    if (cellCount > 144) {
      roads.forEach((_, index) => candidates.add(index));
    } else {
      for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
          for (const index of roadGrid.get(`${x}:${y}`) ?? [])
            candidates.add(index);
        }
      }
    }
    return [...candidates]
      .sort((a, b) => a - b)
      .map(index => roads[index])
      .filter(({ bounds }) =>
        bounds.maxX >= minWorldX &&
        bounds.minX <= maxWorldX &&
        bounds.maxY >= minWorldY &&
        bounds.minY <= maxWorldY
      );
  }, [roads, roadGrid, size.width, size.height, camera.x, camera.y, camera.scale, pan.x, pan.y]);
  const namedRoads = [...visible].reverse();
  const labels = new Set<string>();
  const labelBoxes: { x: number; y: number; width: number }[] = [];
  const mapTransform = `translate(${size.width / 2 + pan.x - camera.x * camera.scale} ${size.height / 2 + pan.y - camera.y * camera.scale}) scale(${camera.scale})`;
  const metresPerPixel =
    groundMetresPerPixel(camera.y - pan.y / camera.scale, camera.scale);
  const scaleMetres =
    [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(
      m => m / metresPerPixel >= 45
    ) ?? 10000;
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    if (!gestureStarted.current) {
      if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6) return;
      gestureStarted.current = true;
      onManualInteraction?.();
    }
    const other = [...pointers.current.entries()].find(
      ([id]) => id !== event.pointerId
    )?.[1];
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y),
        after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (before > 10) {
        const currentZoom = gestureZoom.current;
        const nextZoom = Math.max(
          1,
          Math.min(6, (currentZoom * after) / before)
        );
        const ratio = nextZoom / currentZoom;
        gestureZoom.current = nextZoom;
        const rect = viewport.current?.getBoundingClientRect();
        const oldX = (previous.x + other.x) / 2 - (rect?.left ?? 0);
        const oldY = (previous.y + other.y) / 2 - (rect?.top ?? 0);
        const nextX = (event.clientX + other.x) / 2 - (rect?.left ?? 0);
        const nextY = (event.clientY + other.y) / 2 - (rect?.top ?? 0);
        setPan(p => ({
          x: nextX - size.width / 2 - ratio * (oldX - size.width / 2 - p.x),
          y: nextY - size.height / 2 - ratio * (oldY - size.height / 2 - p.y),
        }));
        onZoom(nextZoom);
      }
    } else
      setPan(p => ({
        x: p.x + event.clientX - previous.x,
        y: p.y + event.clientY - previous.y,
      }));
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  };
  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) gestureStarted.current = false;
  };
  return (
    <div
      className={
        "offline-map relative overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,.24)] " +
        (dark ? "bg-[#18272d]" : "bg-[#eef2eb]")
      }
    >
      <div
        ref={viewport}
        data-map-surface
        className={
          "relative isolate touch-none overflow-hidden outline-offset-[-3px] " +
          (expanded ? "h-[75dvh] min-h-[360px]" : className)
        }
        role="region"
        tabIndex={0}
        aria-label="Explorar mapa offline"
        aria-description="Arraste para mover, use dois dedos para zoom. No teclado, setas movem e Home enquadra."
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [50, 0],
            ArrowRight: [-50, 0],
            ArrowUp: [0, 50],
            ArrowDown: [0, -50],
          };
          if (delta[event.key])
            setPan(p => ({
              x: p.x + delta[event.key][0],
              y: p.y + delta[event.key][1],
            }));
          else if (event.key === "Home") {
            setPan({ x: 0, y: 0 });
            onZoom(1);
          } else if (["+", "="].includes(event.key))
            onZoom(Math.min(6, zoom + 0.5));
          else if (event.key === "-") onZoom(Math.max(1, zoom - 0.5));
          else return;
          onManualInteraction?.();
          event.preventDefault();
        }}
        onPointerDown={event => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (pointers.current.size >= 2) return;
          if (event.target instanceof Element && event.target.closest("button"))
            return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pointers.current.size === 2) {
            gestureStarted.current = true;
            onManualInteraction?.();
          }
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <div aria-hidden="true" className={"pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b " + (dark ? "from-[#07191f]/55 to-transparent" : "from-white/35 to-transparent")} />
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label={ariaLabel}
          className="absolute inset-0"
        >
          <title>Ruas locais salvas e pontos da viagem</title>
          <g data-offline-world-layer transform={mapTransform}>
            {visible.map(road => {
              const priority = road.priority;
              const major = priority >= 2;
              const width = major ? 3 + priority * 0.65 : (zoom >= 2 ? 2.25 : 1.5);
              return (
                <g key={road.id}>
                  <path
                    d={road.path}
                    fill="none"
                    stroke={dark ? "#263e48" : major ? "#d6c9a8" : "#d6ddd0"}
                    strokeWidth={width + (major ? 2.5 : 1.5)}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={road.path}
                    fill="none"
                    stroke={
                      dark
                        ? major
                          ? "#60777d"
                          : "#40585e"
                        : major
                          ? "#ffe9b3"
                          : "#ffffff"
                    }
                    strokeWidth={width}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
            {geometry.length > 1 && (
              <>
                <path
                  data-offline-route-geometry
                  d={geometryPath}
                  fill="none"
                  stroke={dark ? "#07191f" : "#ffffff"}
                  strokeWidth="11"
                  strokeOpacity="0.92"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={geometryPath}
                  fill="none"
                  stroke={
                    estimated
                      ? dark
                        ? "#819399"
                        : "#718287"
                      : dark
                        ? "#50F3EA"
                        : "#1a73e8"
                  }
                  strokeWidth="6"
                  strokeDasharray={estimated ? "8 8" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </g>
          {namedRoads
            .filter(
              road =>
                road.name &&
                (showAllStreetNames ||
                  zoom >= 2 ||
                  road.priority >= 2)
            )
            .map(road => {
              const p = road.world[Math.floor(road.world.length / 2)];
              const baseX = size.width / 2 + (p.x - camera.x) * camera.scale;
              const baseY = size.height / 2 + (p.y - camera.y) * camera.scale;
              const x = baseX + pan.x;
              const y = baseY + pan.y;
              const text = road.name.slice(0, 42);
              const width = text.length * 6.5 + 12;
              if (
                labels.has(road.name) ||
                labels.size >= (showAllStreetNames ? 140 : 60) ||
                x < width / 2 + 8 ||
                x > size.width - width / 2 - 8 ||
                y < 50 ||
                y > size.height - 40 ||
                labelBoxes.some(
                  box =>
                    Math.abs(box.y - baseY) < 22 &&
                    Math.abs(box.x - baseX) < (box.width + width) / 2
                ) ||
                markerCollisionPoints.some(point =>
                  Math.abs(point.y - baseY) < 30 &&
                  Math.abs(point.x - baseX) < width / 2 + 24
                )
              )
                return null;
              labels.add(road.name);
              labelBoxes.push({ x: baseX, y: baseY, width });
              return (
                <text
                  key={road.id}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={road.priority >= 4 ? "700" : "500"}
                  fill={dark ? "#e3edec" : "#566760"}
                  paintOrder="stroke"
                  stroke={dark ? "#18272d" : "#eef2eb"}
                  strokeWidth="3"
                >
                  {text}
                </text>
              );
            })}

        </svg>
        {markerGroups.groups.filter(group => group.x + pan.x >= -30 && group.x + pan.x <= size.width + 30 && group.y + pan.y >= -30 && group.y + pan.y <= size.height + 30).map(group => <button key={group.key} type="button" aria-label={`Ampliar grupo de ${group.items.length} lugares`} onPointerDown={event => event.stopPropagation()} onClick={() => {
          onManualInteraction?.();
          const next = Math.min(6, zoom * 1.8);
          setPan({ x: -(group.x - size.width / 2) * next / zoom, y: -(group.y - size.height / 2) * next / zoom });
          onZoom(next);
        }} className="absolute z-[1] grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#e4edff] text-sm font-black text-[#2457b8] shadow-md ring-4 ring-blue-500/10" style={{ left: group.x + pan.x, top: group.y + pan.y }}>{group.items.length}</button>)}
        {markerGroups.singles.map(marker => {
          const p = project(marker);
          return (
            <button
              key={marker.id}
              type="button"
              aria-label={"Selecionar " + marker.name}
              aria-pressed={selectedMarkerId === marker.id}
              onClick={() => onSelect?.(marker)}
              onPointerDown={e => e.stopPropagation()}
              className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:ring-4 focus-visible:ring-[#1278cc]"
              style={{
                left: p.x,
                top: p.y,
                zIndex:
                  marker.id === selectedMarkerId
                    ? 3
                    : marker.id === "live-position"
                    ? 2
                    : marker.isReference
                      ? 0
                      : 1,
              }}
            >
              {marker.id === "live-position" && (
                <span className="pointer-events-none absolute size-10 rounded-full bg-[#50F3EA]/30 motion-safe:animate-ping" />
              )}
              <span
                className={
                  "relative grid size-9 place-items-center rounded-2xl border-[3px] border-white text-xs font-black shadow-lg " +
                  (selectedMarkerId === marker.id ? "ring-4 ring-primary " : "") +
                  (marker.id === "destination"
                    ? "bg-[#ff765e] text-white"
                    : marker.id === "live-position"
                      ? "bg-[#1a73e8] text-white"
                      : marker.id === "origin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#5b7cff] text-white")
                }
              >
                {marker.id === "live-position" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path d="M12 3 21 21 12 17 3 21Z" fill="currentColor" />
                  </svg>
                ) : (
                  marker.id === "origin" || marker.id === "destination" || marker.id === "device-location"
                    ? marker.label : <MapPlaceIcon item={marker} />
                )}
              </span>
              {(marker.id === "origin" ||
                marker.id === "destination" ||
                marker.id === "live-position" ||
                selectedMarkerId === marker.id || zoom >= 2) && (
                <span
                  className={
                    "pointer-events-none absolute left-1/2 top-8 max-w-[10rem] -translate-x-1/2 truncate rounded-lg border px-2 py-1 text-xs font-bold shadow-sm " +
                    (dark
                      ? "border-white/10 bg-[#101c24]/95 text-[#f2ffff]"
                      : "border-black/5 bg-white/95 text-[#27414b]")
                  }
                  title={marker.name}
                >
                  {marker.name}
                </span>
              )}
            </button>
          );
        })}
        {controls}
        <div
          className={
            "pointer-events-none absolute left-3 top-3 z-20 rounded-full border px-3 py-2 text-xs font-black shadow-lg backdrop-blur-md " +
            (dark
              ? "bg-[#162733]/95 text-[#e9ffff]"
              : "bg-white/95 text-[#27414b]")
          }
        >
          N ↑ · mapa local
        </div>
        <button
          type="button"
          aria-label={dark ? "Usar mapa claro" : "Usar mapa escuro"}
          aria-pressed={dark}
          onClick={() => setDark(v => !v)}
          className={
            "absolute right-3 top-3 z-20 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-lg backdrop-blur-md " +
            (dark
              ? "bg-[#162733]/95 text-[#e9ffff]"
              : "bg-white/95 text-[#27414b]")
          }
        >
          {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}<span className="hidden sm:inline">{dark ? "Claro" : "Escuro"}</span>
        </button>
        <button
          type="button"
          aria-label={
            showAllStreetNames
              ? "Ocultar nomes das ruas"
              : "Mostrar nomes de todas as ruas"
          }
          aria-pressed={showAllStreetNames}
          onClick={() => setShowAllStreetNames(value => !value)}
          className={
            "absolute right-3 top-[4.25rem] z-20 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-lg backdrop-blur-md " +
            (showAllStreetNames
              ? "bg-[#37e6df] text-primary-foreground"
              : dark
                ? "bg-[#162733]/95 text-[#e9ffff]"
                : "bg-white/95 text-[#27414b]")
          }
        >
          <MapIcon className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{showAllStreetNames ? "Ruas: todas" : "Ruas"}</span>
        </button>
        <button
          type="button"
          aria-label={expanded ? "Reduzir mapa" : "Ampliar mapa"}
          aria-pressed={expanded}
          onClick={() => setExpanded(v => !v)}
          className={
            "absolute bottom-3 right-3 z-20 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-lg backdrop-blur-md " +
            (dark
              ? "bg-[#162733]/95 text-[#e9ffff]"
              : "bg-white/95 text-[#27414b]")
          }
        >
          {expanded ? <Minimize className="size-4" aria-hidden="true" /> : <Expand className="size-4" aria-hidden="true" />}<span className="hidden sm:inline">{expanded ? "Reduzir" : "Ampliar"}</span>
        </button>
        <div
          className={
            "pointer-events-none absolute bottom-3 left-3 z-20 rounded-xl border p-2 text-xs font-black shadow-lg backdrop-blur-md " +
            (dark
              ? "bg-[#162733]/90 text-[#e9ffff]"
              : "bg-white/90 text-[#27414b]")
          }
        >
          <div
            style={{ width: Math.min(100, scaleMetres / metresPerPixel) }}
            className={"border-x border-b " + (dark ? "border-[#e9ffff]" : "border-[#27414b]")}
          />
          {scaleMetres >= 1000
            ? scaleMetres / 1000 + " km"
            : scaleMetres + " m"}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-[linear-gradient(180deg,#ffffff,#f3f8f5)] px-3 py-2.5 text-xs font-semibold text-[#536760]">
        <span role="status">
          {pack
            ? `Ruas locais disponíveis · ${pack.roads.length.toLocaleString("pt-BR")} trechos viários · ${new Date(pack.retrievedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
            : failed
              ? "Ruas indisponíveis neste aparelho; pontos e rota continuam disponíveis."
              : "Carregando ruas locais…"}
        </span>
        {failed && (
          <button
            type="button"
            onClick={() => setAttempt(v => v + 1)}
            className="min-h-11 rounded-lg border border-[#536760]/30 px-3 font-bold"
          >
            Tentar recuperar ruas
          </button>
        )}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          © OpenStreetMap · ODbL
        </a>
      </div>
    </div>
  );
}
