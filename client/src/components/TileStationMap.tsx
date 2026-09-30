import { Apple, LocateFixed, Navigation, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildWazeNavigationUrl } from "@/lib/mobileTools";
import type { StationMapItem } from "@/components/StationMap";

const TILE = 256;
const DEFAULT_CENTER = { lat: -15.7545, lng: -48.2816 };

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}
function project(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
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
  heightClassName = "h-[min(68vh,620px)]",
  onSelectStation,
  fallback,
}: {
  stations: StationMapItem[];
  userCoords?: { lat: number; lng: number } | null;
  heightClassName?: string;
  onSelectStation?: (station: StationMapItem) => void;
  fallback?: React.ReactNode;
}) {
  const drawable = useMemo(() => stations.filter(item =>
    typeof item.lat === "number" && Number.isFinite(item.lat) &&
    typeof item.lng === "number" && Number.isFinite(item.lng)
  ) as Array<StationMapItem & { lat: number; lng: number }>, [stations]);

  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState(() => userCoords ?? DEFAULT_CENTER);
  const [selectedId, setSelectedId] = useState<string | null>(drawable[0]?.id ?? null);
  const [threeD, setThreeD] = useState(false);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    if (userCoords) setCenter(userCoords);
  }, [userCoords?.lat, userCoords?.lng]);

  useEffect(() => {
    if (!selectedId && drawable[0]) setSelectedId(drawable[0].id ?? null);
  }, [drawable, selectedId]);

  const width = viewport.current?.clientWidth ?? 720;
  const height = viewport.current?.clientHeight ?? 520;
  const centerPx = project(center.lat, center.lng, zoom);
  const baseTileX = Math.floor(centerPx.x / TILE);
  const baseTileY = Math.floor(centerPx.y / TILE);
  const radius = 2;
  const tiles: Array<{ x: number; y: number; key: string; left: number; top: number }> = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const rawX = baseTileX + dx;
      const y = baseTileY + dy;
      tiles.push({
        x: wrapTile(rawX, zoom),
        y,
        key: `${zoom}:${rawX}:${y}`,
        left: (dx + radius) * TILE,
        top: (dy + radius) * TILE,
      });
    }
  }

  const markerPosition = (station: StationMapItem & { lat: number; lng: number }) => {
    const p = project(station.lat, station.lng, zoom);
    return { left: width / 2 + p.x - centerPx.x, top: height / 2 + p.y - centerPx.y };
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: centerPx.x, cy: centerPx.y };
    setDragging(true);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.id !== event.pointerId) return;
    const next = unproject(state.cx - (event.clientX - state.x), state.cy - (event.clientY - state.y), zoom);
    setCenter(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const recenter = () => setCenter(userCoords ?? DEFAULT_CENTER);

  const changeZoom = (delta: number) => {
    setZoom(value => Math.max(11, Math.min(17, value + delta)));
  };

  if (!drawable.length) {
    return <div className={"grid " + heightClassName + " place-items-center bg-[#E8F0EA] p-6 text-center text-[#163840]"}>{fallback ?? <div><p className="text-sm font-black">Mapa sem coordenadas suficientes.</p><p className="mt-2 text-xs text-[#607169]">Os locais continuam disponíveis em lista.</p></div>}</div>;
  }

  const selected = drawable.find(item => item.id === selectedId) ?? null;

  return (
    <div className={"relative overflow-hidden rounded-[1.25rem] bg-[#dfe9e2] " + heightClassName}>
      <div
        ref={viewport}
        className={"absolute inset-0 select-none touch-none overflow-hidden " + (dragging ? "cursor-grabbing" : "cursor-grab")}
        onPointerDown={beginDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute"
          style={{
            width: TILE * (radius * 2 + 1),
            height: TILE * (radius * 2 + 1),
            left: width / 2 - radius * TILE - (centerPx.x - baseTileX * TILE),
            top: height / 2 - radius * TILE - (centerPx.y - baseTileY * TILE),
            transform: threeD ? "perspective(1000px) rotateX(30deg) scale(1.06)" : undefined,
            transformOrigin: "50% 50%",
          }}
        >
          {tiles.map(tile => (
            <img
              key={tile.key}
              src={"https://tile.openstreetmap.org/" + zoom + "/" + tile.x + "/" + tile.y + ".png"}
              alt=""
              draggable={false}
              className="absolute size-64 max-w-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0">
          {drawable.map((station, index) => {
            const position = markerPosition(station);
            if (position.left < -30 || position.left > width + 30 || position.top < -40 || position.top > height + 40) return null;
            const active = station.id === selectedId;
            return (
              <button
                key={station.id ?? station.cnpj ?? String(index)}
                type="button"
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
                style={{ left: position.left, top: position.top }}
                onPointerDown={event => event.stopPropagation()}
                onClick={() => { setSelectedId(station.id ?? null); onSelectStation?.(station); }}
                aria-label={"Abrir " + station.name}
              >
                <span className={"grid size-8 place-items-center rounded-full border-2 border-white shadow-lg transition " + (active ? "scale-110 bg-[#C7FF3C] text-[#163840]" : station.source === "ANP" ? "bg-[#C7FF3C] text-[#163840]" : "bg-[#3DE3FF] text-[#163840]")}>
                  <span className="text-[0.55rem] font-black">{index + 1}</span>
                </span>
              </button>
            );
          })}

          {userCoords && (() => {
            const p = project(userCoords.lat, userCoords.lng, zoom);
            const left = width / 2 + p.x - centerPx.x;
            const top = height / 2 + p.y - centerPx.y;
            return <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#3DE3FF] shadow-[0_0_0_10px_rgba(61,227,255,.18)]" style={{ left, top, width: 14, height: 14 }} aria-label="Sua localização" />;
          })()}
        </div>
      </div>

      <div className="absolute left-3 top-3 z-20 flex gap-1.5">
        <button type="button" onClick={() => changeZoom(1)} className="grid size-10 place-items-center rounded-xl bg-white/92 text-[#163840] shadow-lg" aria-label="Aumentar zoom"><Plus className="size-4" /></button>
        <button type="button" onClick={() => changeZoom(-1)} className="grid size-10 place-items-center rounded-xl bg-white/92 text-[#163840] shadow-lg" aria-label="Diminuir zoom"><Minus className="size-4" /></button>
        <button type="button" onClick={recenter} className="grid size-10 place-items-center rounded-xl bg-white/92 text-[#163840] shadow-lg" aria-label="Recentrar mapa"><LocateFixed className="size-4" /></button>
        <button type="button" onClick={() => setThreeD(value => !value)} className={"rounded-xl px-3 text-[0.56rem] font-black shadow-lg " + (threeD ? "bg-[#C7FF3C] text-[#163840]" : "bg-white/92 text-[#163840]")}>{threeD ? "2.5D" : "2D"}</button>
      </div>

      <div className="absolute right-3 top-3 z-20 rounded-full bg-white/92 px-2.5 py-1 text-[0.5rem] font-black text-[#607169] shadow">Mapa geográfico · OpenStreetMap</div>

      <div className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-xl backdrop-blur">
        {selected ? (
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#163840] text-white"><span className="text-[0.52rem] font-black">{selected.source === "ANP" ? "ANP" : "LOCAL"}</span></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-[#163840]">{selected.name}</p>
              <p className="mt-1 line-clamp-2 text-[0.6rem] leading-relaxed text-[#607169]">{selected.address || "Endereço não informado"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => window.open(buildGoogleMapsDestinationUrl(selected.lat + "," + selected.lng, true), "_blank", "noopener,noreferrer")} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#163840] px-2.5 text-[0.56rem] font-black text-white"><Navigation className="size-3" /> Google</button>
                <button type="button" onClick={() => window.open(buildWazeNavigationUrl(selected.address, { lat: selected.lat, lng: selected.lng }), "_blank", "noopener,noreferrer")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/10 px-2.5 text-[0.56rem] font-black text-[#163840]">Waze</button>
                <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(selected.lat + "," + selected.lng), "_blank", "noopener,noreferrer")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/10 px-2.5 text-[0.56rem] font-black text-[#163840]"><Apple className="size-3" /> Apple</button>
              </div>
            </div>
          </div>
        ) : <p className="text-xs font-bold text-[#607169]">Toque em um marcador para abrir a ficha.</p>}
        <p className="mt-2 text-[0.48rem] text-[#78867f]">© OpenStreetMap contributors. O mapa pode ficar disponível offline depois de ser aberto neste aparelho.</p>
      </div>
    </div>
  );
}
