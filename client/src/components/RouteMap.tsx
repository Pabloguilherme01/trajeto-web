import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";

type Stop = { placeId: string; name: string; address: string; lat: number; lng: number };

type RouteMapProps = {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  stops: Stop[];
};

export function RouteMap({ origin, destination, stops }: RouteMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !window.google || !origin || !destination) return;
    markersRef.current.forEach(marker => marker.map = null);
    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    [origin, destination, ...stops].forEach(point => bounds.extend(point));

    const makeMarker = (position: google.maps.LatLngLiteral, title: string, color: string) => {
      const pin = new window.google.maps.marker.PinElement({ background: color, borderColor: "#163840", glyphColor: "#163840" });
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position, title, content: pin.element });
      markersRef.current.push(marker);
    };

    makeMarker(origin, "Origem", "#BA5B45");
    makeMarker(destination, "Destino", "#FFC928");
    stops.forEach(stop => makeMarker(stop, stop.name, "#E8EEE8"));
    map.fitBounds(bounds, 46);
  }, [mapReady, origin, destination, stops]);

  return (
    <MapView
      className="h-[340px] overflow-hidden rounded-2xl border border-[#C9D2CA]"
      initialCenter={{ lat: -15.7942, lng: -47.8822 }}
      initialZoom={11}
      onMapReady={map => { mapRef.current = map; setMapReady(true); }}
    />
  );
}
