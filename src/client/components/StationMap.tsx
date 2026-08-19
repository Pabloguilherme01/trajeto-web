import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";

type Station = { placeId: string; name: string; address: string; lat: number; lng: number };

export function StationMap({ stations }: { stations: Station[] }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google || !stations.length) return;
    markers.current.forEach(marker => marker.map = null);
    markers.current = [];
    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    stations.forEach((station, index) => {
      bounds.extend(station);
      const pin = new window.google.maps.marker.PinElement({ background: "#FFC928", borderColor: "#163840", glyphColor: "#163840", glyph: String(index + 1) });
      markers.current.push(new window.google.maps.marker.AdvancedMarkerElement({ map, position: station, title: `${index + 1}. ${station.name}`, content: pin.element }));
    });
    map.fitBounds(bounds, 40);
  }, [ready, stations]);

  return <MapView className="h-[360px] overflow-hidden border-4 border-[#163840]" initialCenter={{ lat: -15.7942, lng: -47.8822 }} initialZoom={11} onMapReady={map => { mapRef.current = map; setReady(true); }} />;
}
