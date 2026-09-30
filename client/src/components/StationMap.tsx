import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";

export type StationMapItem = {
  id: string;
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

export function StationMap({
  stations,
  heightClassName = "h-[min(68vh,620px)]",
  showTraffic = false,
}: {
  stations: StationMapItem[];
  heightClassName?: string;
  showTraffic?: boolean;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

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

      const pin = new window.google.maps.marker.PinElement({
        background: "#C7FF3C",
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
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:9px;padding:7px 10px;border-radius:8px;background:#163840;color:#fff;text-decoration:none;font-size:11px;font-weight:700">Navegar</a>
          </div>`,
        );
        popup.open({ map, anchor: marker });
      });

      markers.current.push(marker);
    });

    map.fitBounds(bounds, 44);
    const listener = window.google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 12) > 15) map.setZoom(15);
    });

    return () => window.google?.maps?.event.removeListener(listener);
  }, [ready, stations]);

  return (
    <MapView
      className="h-full w-full overflow-hidden"
      heightClassName={heightClassName}
      initialCenter={{ lat: -15.7545, lng: -48.2816 }}
      initialZoom={12}
      showTraffic={showTraffic}
      onMapReady={map => {
        mapRef.current = map;
        setReady(true);
      }}
    />
  );
}
