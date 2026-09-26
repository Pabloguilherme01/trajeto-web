/** Google Maps is loaded lazily through the configured Forge proxy. */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptPromise: Promise<void> | null = null;

function loadMapScript() {
  if (window.google?.maps) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;
  mapScriptPromise = new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error("Google Maps não está configurado."));
      mapScriptPromise = null;
      return;
    }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      mapScriptPromise = null;
      reject(new Error("Não foi possível carregar o Google Maps."));
    };
    document.head.appendChild(script);
  });
  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  deferUntilVisible?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  deferUntilVisible = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [shouldLoad, setShouldLoad] = useState(!deferUntilVisible);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      setLoadError(null);
      await loadMapScript();
    if (!mapContainer.current || map.current) {
      return;
    }
    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
      mapId: "DEMO_MAP_ID",
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o mapa.");
    }
  });

  useEffect(() => {
    if (shouldLoad) return;
    const target = mapContainer.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "180px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    init();
  }, [init, shouldLoad]);

  return (
    <div ref={mapContainer} role="img" aria-label="Mapa da rota" className={cn("relative w-full h-[500px] bg-[#EDF2EE]", className)}>
      {!shouldLoad && <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#EDF2EE_35%,#F8FBF7_50%,#EDF2EE_65%)]" aria-label="Mapa será carregado quando estiver próximo" />}
      {loadError && <div role="alert" className="absolute inset-0 grid place-items-center bg-[#0B1014]/95 p-6 text-center text-sm font-bold text-white"><div><p>O mapa não pôde ser carregado agora.</p><p className="mt-2 text-xs font-normal text-[#A5B5BC]">Os resultados da consulta continuam disponíveis abaixo.</p></div></div>}
    </div>
  );
}
