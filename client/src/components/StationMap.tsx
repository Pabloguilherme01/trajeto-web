import { MapView } from "@/components/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, Navigation, Minus, Plus, RotateCcw } from "lucide-react";
import { buildAppleMapsDirectionsUrl, buildWazeNavigationUrl } from "@/lib/mobileTools";
import { cacheOfflineMapStations } from "@/lib/stationMapOffline";

export type StationMapItem = {
  id?: string;
  placeId?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cnpj?: string | null;
  brand?: string | null;
  source?: "ANP" | "Google" | "local";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sourceLabel(source?: StationMapItem["source"]) {
  if (source === "ANP") return "ANP";
  if (source === "Google") return "mapa";
  return "local";
}

function OfflineStationMap({ stations, onSelectStation }: { stations: StationMapItem[]; onSelectStation?: (station: StationMapItem) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(stations[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);

  const points = useMemo(() => {
    if (!stations.length) return [];
    const lats = stations.map(station => station.lat);
    const lngs = stations.map(station => station.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.003);
    const lngSpan = Math.max(maxLng - minLng, 0.003);
    const pad = 0.06;
    return stations.map((station, index) => ({
      station,
      index,
      x: 60 + ((station.lng - minLng) / lngSpan) * 880,
      y: 500 - ((station.lat - minLat) / latSpan) * 440,
    })).map(point => ({
      ...point,
      x: 60 + (point.x - 60) * (1 - pad) + 500 * pad,
      y: 500 + (point.y - 500) * (1 - pad) + 280 * pad,
    }));
  }, [stations]);

  const selected = points.find(point => point.station.id === selectedId)?.station ?? points[0]?.station ?? null;
  const viewBox = `${(1 - 1 / zoom) * 500} ${(1 - 1 / zoom) * 280} ${1000 / zoom} ${560 / zoom}`;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#E8F0EA]">
      <svg viewBox={viewBox} className="absolute inset-0 h-full w-full" role="img" aria-label={`Mapa offline esquemático com ${stations.length} postos`}>
        <defs>
          <pattern id="station-map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#B9C9BD" strokeWidth="1" opacity=".55" />
          </pattern>
        </defs>
        <rect width="1000" height="560" fill="#E8F0EA" />
        <rect width="1000" height="560" fill="url(#station-map-grid)" />
        <text x="34" y="32" fontSize="18" fontWeight="800" fill="#41534A">Águas Lindas · mapa offline esquemático</text>
        <text x="34" y="54" fontSize="11" fontWeight="600" fill="#6C7E74">Posições reais salvas no aparelho · sem depender do Google Maps</text>

        {points.map(point => {
          const isSelected = point.station.id === selectedId;
          const official = point.station.source === "ANP";
          return (
            <g key={point.station.id || `station-${point.index}`} onClick={() => { setSelectedId(point.station.id ?? null); onSelectStation?.(point.station); }} className="cursor-pointer">
              {isSelected && <circle cx={point.x} cy={point.y} r="18" fill={official ? "#C7FF3C" : "#3DE3FF"} opacity=".22" />}
              <circle cx={point.x} cy={point.y} r={isSelected ? 10 : 8} fill={official ? "#C7FF3C" : "#3DE3FF"} stroke="#163840" strokeWidth="3" />
              <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="8" fontWeight="900" fill="#163840">{point.index + 1}</text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-3 top-3 flex gap-1.5">
        <button type="button" onClick={() => setZoom(value => Math.min(2.5, value + .25))} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Aumentar zoom"><Plus className="size-4" /></button>
        <button type="button" onClick={() => setZoom(value => Math.max(1, value - .25))} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Diminuir zoom"><Minus className="size-4" /></button>
        <button type="button" onClick={() => setZoom(1)} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white/90 text-[#163840] shadow-sm" aria-label="Recentrar mapa"><RotateCcw className="size-4" /></button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-black/10 bg-white/92 p-3 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected?.source === "ANP" ? "bg-[#C7FF3C] text-[#163840]" : "bg-[#3DE3FF]/20 text-[#155163]"}`}>
            <span className="text-[.62rem] font-black">{selected ? sourceLabel(selected.source) : "—"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[#163840]">{selected?.name ?? "Selecione um posto"}</p>
            <p className="mt-1 line-clamp-2 text-[.61rem] leading-relaxed text-[#607169]">{selected?.address ?? "Nenhum posto com coordenada armazenada."}</p>
            {selected?.cnpj && <p className="mt-1 text-[.52rem] font-semibold text-[#7D8C84]">CNPJ {selected.cnpj}{selected.brand ? " · " + selected.brand : ""}</p>}
          </div>
          {selected && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}&travelmode=driving&dir_action=navigate`, "_blank", "noopener,noreferrer")}
                className="grid size-10 place-items-center rounded-xl bg-[#163840] text-white"
                aria-label="Navegar pelo Google Maps"
              >
                <Navigation className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => window.open(buildWazeNavigationUrl(selected.address, { lat: selected.lat, lng: selected.lng }), "_blank", "noopener,noreferrer")}
                className="grid size-10 place-items-center rounded-xl border border-[#163840]/10 bg-white text-[#163840]"
                aria-label="Navegar pelo Waze"
              >
                <span className="text-[.55rem] font-black">WZ</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(buildAppleMapsDirectionsUrl(`${selected.lat},${selected.lng}`), "_blank", "noopener,noreferrer")}
                className="grid size-10 place-items-center rounded-xl border border-[#163840]/10 bg-white text-[#163840]"
                aria-label="Navegar pelo Apple Maps"
              >
                <Apple className="size-4" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[.5rem] font-bold text-[#7D8C84]">
          <span>{stations.length} referências com coordenadas salvas</span>
          <span>Verde = ANP · azul = mapa secundário</span>
        </div>
      </div>
    </div>
  );
}

export function StationMap({
  stations,
  heightClassName = "h-[min(68vh,620px)]",
  showTraffic = false,
  onSelectStation,
}: {
  stations: StationMapItem[];
  heightClassName?: string;
  showTraffic?: boolean;
  onSelectStation?: (station: StationMapItem) => void;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps || offline) return;

    markers.current.forEach(marker => { marker.map = null; });
    markers.current = [];

    if (!stations.length) return;

    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    const popup = infoWindow.current ?? new window.google.maps.InfoWindow();
    infoWindow.current = popup;

    stations.forEach((station, index) => {
      const position = { lat: station.lat, lng: station.lng };
      bounds.extend(position);

      const official = station.source === "ANP";
      const pin = new window.google.maps.marker.PinElement({
        background: official ? "#C7FF3C" : "#3DE3FF",
        borderColor: "#163840",
        glyphColor: "#163840",
        glyph: String(index + 1),
      });

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: `${index + 1}. ${station.name}`,
        content: pin.element,
      });

      marker.addListener("click", () => {
        popup.setContent(
          `<div style="min-width:220px;max-width:290px;padding:4px 2px;font-family:Arial,sans-serif">
            <strong style="display:block;font-size:14px;line-height:1.25">${index + 1}. ${escapeHtml(station.name)}</strong>
            <span style="display:block;margin-top:5px;font-size:12px;line-height:1.45;color:#53635d">${escapeHtml(station.address || "Endereço não informado")}</span>
            ${station.cnpj ? `<span style="display:block;margin-top:4px;font-size:11px;color:#7a8882">CNPJ ${escapeHtml(station.cnpj)}</span>` : ""}
            ${station.brand ? `<span style="display:block;margin-top:3px;font-size:11px;color:#7a8882">${escapeHtml(station.brand)}</span>` : ""}
            <span style="display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;background:${official ? "#ECFFBA" : "#E0FBFF"};color:#34524A;font-size:10px;font-weight:800">${official ? "Fonte ANP" : "Referência de mapa"}</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving&dir_action=navigate" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 10px;border-radius:8px;background:#163840;color:#fff;text-decoration:none;font-size:11px;font-weight:700">Google</a>
              <a href="${buildWazeNavigationUrl(station.address, { lat: station.lat, lng: station.lng })}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 10px;border-radius:8px;background:#eefbff;color:#163840;text-decoration:none;font-size:11px;font-weight:700">Waze</a>
              <a href="${buildAppleMapsDirectionsUrl(`${station.lat},${station.lng}`)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 10px;border-radius:8px;background:#f4f4f4;color:#163840;text-decoration:none;font-size:11px;font-weight:700">Apple</a>
              ${station.cnpj ? `<a href="#posto-${encodeURIComponent(station.cnpj)}" style="display:inline-block;padding:8px 10px;border-radius:8px;border:1px solid #d8e0dc;color:#34524A;text-decoration:none;font-size:11px;font-weight:700">Ficha</a>` : ""}
            </div>
          </div>`,
        );
        popup.open({ map, anchor: marker });
        onSelectStation?.(station);
      });

      markers.current.push(marker);
    });

    map.fitBounds(bounds, 44);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 12) > 15) map.setZoom(15);
    });

    return () => window.google?.maps?.event.removeListener(listener);
  }, [ready, stations, offline]);

  if (!stations.length) {
    return <div className={`grid ${heightClassName} place-items-center bg-[#0B1014] p-6 text-center`}><p className="text-sm font-black text-white/60">Nenhuma coordenada disponível para desenhar o mapa.</p></div>;
  }

  if (offline) {
    return <div className={`relative ${heightClassName}`}><OfflineStationMap stations={stations} onSelectStation={onSelectStation} /></div>;
  }

  return (
    <MapView
      className="h-full w-full overflow-hidden"
      heightClassName={heightClassName}
      initialCenter={{ lat: -15.7545, lng: -48.2816 }}
      initialZoom={12}
      showTraffic={showTraffic}
      fallback={<OfflineStationMap stations={stations} onSelectStation={onSelectStation} />}
      onMapReady={map => {
        mapRef.current = map;
        setReady(true);
      }}
    />
    {resolvingCount > 0 && (
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-2xl border border-white/10 bg-[#0B1014]/90 px-3 py-2.5 text-[0.58rem] font-black text-white shadow-xl backdrop-blur-xl" role="status" aria-live="polite">
        Posicionando {resolvingCount} posto(s) automaticamente… as coordenadas serão salvas para uso offline.
      </div>
    )}
    </div>
  );
}
