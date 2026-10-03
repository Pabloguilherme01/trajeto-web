import React, { useEffect, useMemo, useRef, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { isMapPoint, type MapPoint } from "@/lib/mapGeometry";

export type OfflineMapMarker = MapPoint & {
  id: string;
  name: string;
  label: string;
};
type Road = {
  id: number;
  kind: string;
  name: string;
  points: [number, number][];
};
type MapPack = { schema: number; retrievedAt: string; roads: Road[] };
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
  routePoints = [],
  estimated = false,
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
  routePoints?: MapPoint[];
  estimated?: boolean;
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
  const [dark, setDark] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 360 });
  const viewport = useRef<HTMLDivElement>(null);
  const gestureZoom = useRef(zoom);
  gestureZoom.current = zoom;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const validMarkers = markers.filter(isMapPoint);
  const validGeometry = routePoints.filter(isMapPoint);
  const stride = Math.max(1, Math.ceil(validGeometry.length / 6000));
  const geometry =
    stride === 1
      ? validGeometry
      : [
          ...validGeometry.filter((_, i) => i % stride === 0),
          validGeometry[validGeometry.length - 1],
        ];
  const anchors = validMarkers.filter(p => p.id !== "live-position" && p.id !== "device-location");
  const fingerprint =
    (anchors.length || geometry.length ? anchors : validMarkers).map(p => `${p.id}:${p.lat}:${p.lng}`).join("|") +
    ":" + geometry.map(p => `${p.lat}:${p.lng}`).join("|");
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    pointers.current.clear();
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
    const measure = () =>
      setSize({ width: el.clientWidth || 320, height: el.clientHeight || 360 });
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
    const points = (anchors.length || geometry.length ? [...anchors, ...geometry] : validMarkers).map(world);
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
    setPan({ x: -(point.x - camera.x) * camera.scale, y: -(point.y - camera.y) * camera.scale });
  }, [focusRequest, camera]);
  useEffect(() => {
    if (!isMapPoint(followPoint)) return;
    const point = world(followPoint);
    setPan({ x: -(point.x - camera.x) * camera.scale, y: -(point.y - camera.y) * camera.scale });
  }, [followPoint?.lat, followPoint?.lng, camera]);
  const project = (point: MapPoint) => {
    const p = world(point);
    return {
      x: size.width / 2 + (p.x - camera.x) * camera.scale + pan.x,
      y: size.height / 2 + (p.y - camera.y) * camera.scale + pan.y,
    };
  };
  const path = (points: MapPoint[]) =>
    points
      .map((point, i) => {
        const p = project(point);
        return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(" ");
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
        return { ...road, world: points, bounds };
      }) ?? [],
    [pack]
  );
  const visible = roads.filter(({ bounds }) => {
    const left = size.width / 2 - camera.x * camera.scale + pan.x;
    const top = size.height / 2 - camera.y * camera.scale + pan.y;
    return (
      bounds.maxX * camera.scale + left > -80 &&
      bounds.minX * camera.scale + left < size.width + 80 &&
      bounds.maxY * camera.scale + top > -80 &&
      bounds.minY * camera.scale + top < size.height + 80
    );
  });
  const labels = new Set<string>();
  const labelBoxes: { x: number; y: number; width: number }[] = [];
  const metresPerPixel =
    (40075016.686 * Math.cos((15.75 * Math.PI) / 180)) / camera.scale;
  const scaleMetres =
    [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(
      m => m / metresPerPixel >= 45
    ) ?? 10000;
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
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
  const end = (event: React.PointerEvent<HTMLDivElement>) =>
    pointers.current.delete(event.pointerId);
  return (
    <div
      className={
        "offline-map relative overflow-hidden rounded-2xl " +
        (dark ? "bg-[#18272d]" : "bg-[#eef2eb]")
      }
    >
      <div
        ref={viewport}
        className={
          "relative touch-none overflow-hidden outline-offset-[-3px] " +
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
          if (event.target instanceof Element && event.target.closest("button"))
            return;
          onManualInteraction?.();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label={ariaLabel}
          className="absolute inset-0"
        >
          <title>Ruas locais salvas e pontos da viagem</title>
          {visible.map(road => {
            const major = [
              "motorway",
              "trunk",
              "primary",
              "secondary",
              "tertiary",
            ].includes(road.kind);
            const d = road.world
              .map(
                (p, i) =>
                  `${i ? "L" : "M"}${(size.width / 2 + (p.x - camera.x) * camera.scale + pan.x).toFixed(1)} ${(size.height / 2 + (p.y - camera.y) * camera.scale + pan.y).toFixed(1)}`
              )
              .join(" ");
            return (
              <g key={road.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={dark ? "#334b53" : "#d6ddd0"}
                  strokeWidth={major ? 7 : 3}
                  strokeLinecap="round"
                />
                <path
                  d={d}
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
                  strokeWidth={major ? 4 : 1.5}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {visible
            .filter(
              road =>
                road.name &&
                (zoom >= 2 ||
                  [
                    "motorway",
                    "trunk",
                    "primary",
                    "secondary",
                    "tertiary",
                  ].includes(road.kind))
            )
            .map(road => {
              const p = road.world[Math.floor(road.world.length / 2)];
              const x =
                  size.width / 2 + (p.x - camera.x) * camera.scale + pan.x,
                y = size.height / 2 + (p.y - camera.y) * camera.scale + pan.y;
              const text = road.name.slice(0, 42);
              const width = text.length * 6.5 + 12;
              if (
                labels.has(road.name) ||
                labelBoxes.some(
                  box =>
                    Math.abs(box.y - y) < 22 &&
                    Math.abs(box.x - x) < (box.width + width) / 2
                ) ||
                validMarkers.some(marker => {
                  const point = project(marker);
                  return (
                    Math.abs(point.y - y) < 30 &&
                    Math.abs(point.x - x) < width / 2 + 24
                  );
                }) ||
                labels.size >= 35 ||
                x < width / 2 + 8 ||
                x > size.width - width / 2 - 8 ||
                y < 50 ||
                y > size.height - 40
              )
                return null;
              labels.add(road.name);
              labelBoxes.push({ x, y, width });
              return (
                <text
                  key={road.id}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill={dark ? "#e3edec" : "#566760"}
                  paintOrder="stroke"
                  stroke={dark ? "#18272d" : "#eef2eb"}
                  strokeWidth="3"
                >
                  {text}
                </text>
              );
            })}
          {geometry.length > 1 && (
            <>
              <path
                d={path(geometry)}
                fill="none"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={path(geometry)}
                fill="none"
                stroke={estimated ? "#667a80" : dark ? "#37e6df" : "#1278cc"}
                strokeWidth="5"
                strokeDasharray={estimated ? "8 8" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
        {validMarkers.map(marker => {
          const p = project(marker);
          return (
            <button
              key={marker.id}
              type="button"
              aria-label={"Selecionar " + marker.name}
              onClick={() => onSelect?.(marker)}
              onPointerDown={e => e.stopPropagation()}
              className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:ring-4 focus-visible:ring-[#1278cc]"
              style={{ left: p.x, top: p.y }}
            >
              <span className={"grid size-8 place-items-center rounded-full border-[3px] border-white text-xs font-black text-white shadow-lg " + (marker.id === "destination" ? "bg-[#ff765e]" : marker.id === "live-position" ? "bg-[#37e6df] text-[#102028]" : "bg-[#5b7cff]")}>
                {marker.label}
              </span>
            </button>
          );
        })}
        <div className={"pointer-events-none absolute left-3 top-3 rounded-full px-3 py-2 text-xs font-bold shadow " + (dark ? "bg-[#162733]/95 text-[#e9ffff]" : "bg-white/95 text-[#27414b]")}>
          N ↑ · mapa local
        </div>
        <button
          type="button"
          aria-label={dark ? "Usar mapa claro" : "Usar mapa escuro"}
          aria-pressed={dark}
          onClick={() => setDark(v => !v)}
          className={"absolute right-3 top-3 min-h-11 rounded-xl px-3 text-xs font-bold shadow " + (dark ? "bg-[#162733]/95 text-[#e9ffff]" : "bg-white/95 text-[#27414b]")}
        >
          {dark ? "Claro" : "Escuro"}
        </button>
        <button type="button" aria-label={expanded ? "Reduzir mapa" : "Ampliar mapa"} aria-pressed={expanded} onClick={() => setExpanded(v => !v)} className={"absolute bottom-3 right-3 min-h-11 rounded-xl px-3 text-xs font-bold shadow " + (dark ? "bg-[#162733]/95 text-[#e9ffff]" : "bg-white/95 text-[#27414b]")}>{expanded ? "Reduzir" : "Ampliar"}</button>
        <div className={"pointer-events-none absolute bottom-3 left-3 rounded-lg p-2 text-xs font-bold " + (dark ? "bg-[#162733]/90 text-[#e9ffff]" : "bg-white/90 text-[#27414b"])}>
          <div
            style={{ width: Math.min(100, scaleMetres / metresPerPixel) }}
            className="border-x border-b border-[#27414b]"
          />
          {scaleMetres >= 1000
            ? scaleMetres / 1000 + " km"
            : scaleMetres + " m"}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 text-xs text-[#536760]">
        <span role="status">
          {pack
            ? `Ruas locais disponíveis · ${new Date(pack.retrievedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
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
