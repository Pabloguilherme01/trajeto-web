import React, { useEffect, useRef, useState } from "react";
import OfflineMapCanvas from "@/components/OfflineMapCanvas";
import TileStationMap from "@/components/TileStationMap";
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
type RouteStepPreview = {
  instruction: string;
  streetName?: string;
  distanceMeters: number;
  durationSeconds: number;
  location?: { lat: number; lng: number };
};
type RoutePreview = {
  id: string;
  polyline: string | null;
  selected?: boolean;
  source?: "mapbox" | "osrm" | "local-estimate";
  trafficIntervals?: TrafficInterval[];
  durationSeconds?: number | null;
  staticDurationSeconds?: number | null;
  distanceMeters?: number | null;
  toll?: { amount: number | null; currency?: string } | null;
  steps?: RouteStepPreview[];
};
type RouteMapProps = {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  stops: Stop[];
  routes?: RoutePreview[];
  privateOrigin?: boolean;
  forceOffline?: boolean;
};

export function OfflineRoutePreview({
  origin,
  destination,
  stops = [],
  routes = [],
  privateOrigin = false,
  forceOffline = false,
}: RouteMapProps) {
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState("");
  const validOrigin = isMapPoint(origin) ? origin : undefined;
  const validDestination = isMapPoint(destination) ? destination : undefined;
  const validStops = stops.filter(isMapPoint);
  const selected = routes.find(route => route.selected) ?? routes[0];
  const routePoints = decodeMapPolyline(selected?.polyline ?? "");
  const markers = [
    ...(validOrigin
      ? [{ ...validOrigin, id: "origin", name: "Origem", label: "A" }]
      : []),
    ...validStops.map((stop, i) => ({
      ...stop,
      id: "stop-" + i,
      name: stop.name,
      label: String(i + 1),
    })),
    ...(validDestination
      ? [
          {
            ...validDestination,
            id: "destination",
            name: "Destino",
            label: "B",
          },
        ]
      : []),
  ];
  if (!markers.length && !routePoints.length) return <div className="p-6 text-center text-white"><p className="font-bold">Defina a origem e o destino</p><p className="mt-2 text-sm text-white/70">O mapa mostrará os pontos informados e a geometria da rota quando disponível.</p></div>;
  const navigation = validDestination
    ? "https://www.google.com/maps/dir/?api=1" +
      (privateOrigin || !validOrigin
        ? ""
        : "&origin=" + validOrigin.lat + "," + validOrigin.lng) +
      "&destination=" +
      validDestination.lat +
      "," +
      validDestination.lng +
      "&travelmode=driving" +
      (validStops.length
        ? "&waypoints=" +
          encodeURIComponent(validStops.map(p => p.lat + "," + p.lng).join("|"))
        : "")
    : null;
  return (
    <div className="bg-[#eef2eb] text-[#163840]">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 p-3">
        <p className="min-w-0 flex-1 text-sm font-black">
          Mapa local da viagem
        </p>
        <button
          type="button"
          aria-label="Diminuir zoom da prévia"
          disabled={zoom <= 1}
          onClick={() => setZoom(v => Math.max(1, v - 0.5))}
          className="grid size-11 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom da prévia"
          disabled={zoom >= 6}
          onClick={() => setZoom(v => Math.min(6, v + 0.5))}
          className="grid size-11 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setResetKey(v => v + 1);
          }}
          className="min-h-11 rounded-xl bg-white px-3 text-sm font-bold shadow-sm"
        >
          Enquadrar
        </button>
      </div>
      <OfflineMapCanvas
        markers={markers}
        routePoints={routePoints}
        zoom={zoom}
        onZoom={setZoom}
        resetKey={resetKey}
        estimated={selected?.source === "local-estimate"}
        ariaLabel="Prévia offline da rota"
        onSelect={marker => setSelectedPoint(marker.name)}
      />
      <div className="space-y-2 border-t border-black/10 bg-white p-4 text-sm">
        {selectedPoint && <p className="font-black">{selectedPoint}</p>}
        <p>
          {selected?.source === "local-estimate"
            ? "Estimativa entre coordenadas, sem trajeto pelas ruas. Confirme o percurso no aplicativo de navegação."
            : selected?.source === "mapbox" && routePoints.length
              ? "Geometria calculada pelo Mapbox. A linha fica disponível nesta prévia; no modo direção, o tempo pode considerar o trânsito disponível no momento do cálculo."
              : routePoints.length
                ? "Geometria disponível neste aparelho. Ruas locais salvas de Águas Lindas; sem trânsito ao vivo."
                : "Somente os pontos informados. Não há geometria de rota disponível; nenhuma ligação representa um caminho transitável."}
        </p>
        {validStops.length > 0 && (
          <p>
            Paradas:{" "}
            {validStops.map((p, i) => `${i + 1}. ${p.name}`).join(" · ")}
          </p>
        )}
        {selected?.distanceMeters != null && (
          <p className="font-black">
            {(selected.distanceMeters / 1000).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}{" "}
            km
            {selected.durationSeconds != null
              ? ` · ${Math.ceil(selected.durationSeconds / 60)} min estimados`
              : ""}
          </p>
        )}
        {navigation && !forceOffline && (
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
          Ruas offline cobrem a área urbana cadastrada. A prévia local não
          oferece navegação curva a curva. O aplicativo externo pode exigir
          internet.
        </p>
      </div>
    </div>
  );
}

export function RouteMap({
  origin,
  destination,
  stops,
  routes = [],
  privateOrigin = false,
  forceOffline = false,
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

  if (forceOffline) {
    return (
      <section className="overflow-hidden rounded-2xl border border-white/10" aria-label="Mapa offline da viagem">
        <OfflineRoutePreview origin={origin} destination={destination} stops={stops} routes={routes} privateOrigin={privateOrigin} forceOffline />
      </section>
    );
  }

  if (privateOrigin) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]"
        aria-label="Prévia privada da viagem"
      >
        <OfflineRoutePreview
          origin={origin}
          destination={destination}
          routes={routes}
          stops={stops}
          privateOrigin
        />
      </section>
    );
  }

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

  if (
    isGitHubPagesRuntime() &&
    (selectedRoute?.source === "mapbox" || selectedRoute?.source === "osrm") &&
    decodeMapPolyline(selectedRoute?.polyline ?? "").length > 1
  ) {
    const points = decodeMapPolyline(selectedRoute?.polyline ?? "");
    return (
      <section
        className="overflow-hidden rounded-2xl border border-white/10"
        aria-label="Mapa independente da viagem"
      >
        <TileStationMap
          selectionLabel="Escolher ponto da viagem"
          routePoints={points}
          stations={[
            ...(isMapPoint(origin)
              ? [
                  {
                    id: "origin",
                    name: "Origem",
                    address: "Início da viagem",
                    ...origin,
                  },
                ]
              : []),
            ...(isMapPoint(destination)
              ? [
                  {
                    id: "destination",
                    name: "Destino",
                    address: "Chegada da viagem",
                    ...destination,
                  },
                ]
              : []),
            ...stops,
            ...((selectedRoute?.steps ?? [])
              .filter(step => isMapPoint(step.location))
              .slice(0, 40)
              .map((step, index) => ({
                id: "maneuver-" + index,
                name: (index + 1) + ". " + step.instruction,
                address: step.streetName || "Ponto de conversão da rota",
                lat: step.location!.lat,
                lng: step.location!.lng,
              }))),
          ]}
          fallback={
            <div className="relative">
              <OfflineRoutePreview
                origin={origin}
                destination={destination}
                routes={routes}
                stops={stops}
              />
            </div>
          }
        />
      </section>
    );
  }

  if (isGitHubPagesRuntime()) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D151B]"
        aria-label="Mapa independente da viagem"
      >
        <OfflineRoutePreview
          origin={origin}
          destination={destination}
          routes={routes}
          stops={stops}
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
        initialCenter={{ lat: -15.7942, lng: -47.8822 }}
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
          <div className="absolute right-3 top-[7rem] z-10 flex flex-wrap justify-end gap-2">
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
