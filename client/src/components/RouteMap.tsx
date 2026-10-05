import { atlasDestinationReference } from "@/lib/cityAtlas";
import React, { useEffect, useRef, useState, useMemo, useId } from "react";
import { useBusinessCatalog } from "@/hooks/useBusinessCatalog";
import MapExplorerFrame from "@/components/MapExplorerFrame";
import OfflineMapCanvas from "@/components/OfflineMapCanvas";
import TileStationMap from "@/components/TileStationMap";
import { MapView } from "@/components/Map";
import { decodeMapPolyline, isMapPoint } from "@/lib/mapGeometry";
import { currentRouteGuidance, maneuverSymbol, nearbyBusinessReferences, nearbyRouteReferences } from "@/lib/routeMapLogic";
import type { RouteStep } from "@/lib/routeMapLogic";
export { currentRouteGuidance, maneuverSymbol, nearbyBusinessReferences, nearbyRouteReferences } from "@/lib/routeMapLogic";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import {
  ChevronDown,
  LocateFixed,
  Minus,
  Navigation2,
  Plus,
  Satellite,
  TrafficCone,
  Gauge,
  Clock3,
  MapPin,
  AlertTriangle,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  Undo2,
  Flag,
  RotateCw,
} from "lucide-react";

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

type LiveProgress = {
  distanceMeters: number;
  durationSeconds: number;
  offRoute: boolean;
  nearDestination: boolean;
};

function ManeuverIcon({
  maneuver,
  className = "size-7",
}: {
  maneuver?: string;
  className?: string;
}) {
  const symbol = maneuverSymbol(maneuver);
  const Icon = {
    arrival: Flag,
    uturn: Undo2,
    roundabout: RotateCw,
    left: CornerUpLeft,
    right: CornerUpRight,
    "slight-left": ArrowUpLeft,
    "slight-right": ArrowUpRight,
    straight: ArrowUp,
  }[symbol];
  return <Icon aria-hidden="true" className={className} />;
}

function compactDistance(meters: number | null | undefined) {
  if (!Number.isFinite(meters)) return "—";
  const value = Number(meters);
  return value >= 1000
    ? (value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) +
        " km"
    : Math.max(0, Math.round(value)).toLocaleString("pt-BR") + " m";
}

function compactDuration(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.max(0, Math.round(Number(seconds) / 60));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? hours + "h " + rest + "min" : hours + "h";
  }
  return minutes + " min";
}

function arrivalTime(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds)) return "—";
  return new Date(
    Date.now() + Math.max(0, Number(seconds)) * 1000
  ).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function gpsQuality(accuracy: number | null | undefined) {
  if (!Number.isFinite(accuracy)) return "GPS ativo";
  if (Number(accuracy) <= 20) return "GPS bom";
  if (Number(accuracy) <= 50) return "GPS moderado";
  return "GPS impreciso";
}
type RoutePreview = {
  id: string;
  polyline: string | null;
  selected?: boolean;
  source?: "mapbox" | "osrm" | "offline-road" | "local-estimate";
  trafficIntervals?: TrafficInterval[];
  durationSeconds?: number | null;
  staticDurationSeconds?: number | null;
  distanceMeters?: number | null;
  toll?: { amount: number | null; currency?: string } | null;
  steps?: RouteStep[];
};
const travelModeLabels = {
  driving: "Carro",
  walking: "A pé",
  cycling: "Bicicleta",
  transit: "Transporte público",
};

function RouteOverview({
  route,
  travelMode = "driving",
}: {
  route?: RoutePreview;
  travelMode?: keyof typeof travelModeLabels;
}) {
  if (!route) return null;
  return (
    <section
      aria-label="Resumo do percurso no mapa"
      className="grid min-w-0 grid-cols-3 gap-2 border-b border-border bg-card px-3 py-3 text-card-foreground"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">Distância</p>
        <p className="mt-1 break-words text-base font-extrabold">
          {compactDistance(route.distanceMeters)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">Duração</p>
        <p className="mt-1 break-words text-base font-extrabold">
          {compactDuration(route.durationSeconds)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">Modo</p>
        <p className="mt-1 break-words text-sm font-bold">
          {travelModeLabels[travelMode]}
        </p>
      </div>
    </section>
  );
}

function RouteInstructions({
  steps,
  currentIndex,
}: {
  steps: RouteStep[];
  currentIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  if (!steps.length) return null;
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3 text-card-foreground">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(value => !value)}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Navigation2 aria-hidden="true" className="size-5 shrink-0" />
          <span className="break-words">
            Instruções pelas ruas · {steps.length} passos
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={
            "size-5 shrink-0 transition-transform " + (open ? "rotate-180" : "")
          }
        />
      </button>
      <ol id={contentId} hidden={!open} className="mt-2 space-y-2">
        {open &&
          steps.map((step, index) => (
            <li
              key={index}
              aria-current={index === currentIndex ? "step" : undefined}
              className={
                "flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 " +
                (index === currentIndex
                  ? "border-accent bg-accent/10"
                  : "border-transparent bg-card")
              }
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
                aria-label={"Passo " + (index + 1)}
              >
                <ManeuverIcon maneuver={step.maneuver} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-bold">
                  {step.instruction}
                </span>
                {step.name && (
                  <span className="mt-1 block break-words text-xs text-muted-foreground">
                    Via: {step.name}
                  </span>
                )}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {compactDistance(step.distanceMeters)}
                  {step.durationSeconds > 0
                    ? " · " + compactDuration(step.durationSeconds)
                    : ""}
                </span>
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}

type RouteMapProps = {
  livePosition?: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: number;
  };
  origin?: { lat: number; lng: number };
  travelMode?: "driving" | "walking" | "cycling" | "transit";
  destination?: { lat: number; lng: number };
  stops: Stop[];
  routes?: RoutePreview[];
  privateOrigin?: boolean;
  forceOffline?: boolean;
  liveProgress?: LiveProgress | null;
  liveSpeedMps?: number | null;
  showRouteDetails?: boolean;
};

export function OfflineRoutePreview({
  origin,
  destination,
  stops = [],
  routes = [],
  privateOrigin = false,
  forceOffline = false,
  travelMode = "driving",
  livePosition,
  liveProgress,
  liveSpeedMps,
  showRouteDetails = true,
}: RouteMapProps) {
  const businesses = useBusinessCatalog();
  const nearbyBusinesses = useMemo(
    () => nearbyBusinessReferences(businesses.items, destination),
    [businesses.items, destination?.lat, destination?.lng]
  );
  const [showReferences, setShowReferences] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState("");
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const hasLivePosition = isMapPoint(livePosition);
  const [following, setFollowing] = useState(hasLivePosition);
  const [focusRequest, setFocusRequest] = useState<{
    point: { lat: number; lng: number };
    key: number;
  } | null>(null);
  const focus = (point: { lat: number; lng: number }) => {
    setFollowing(false);
    setZoom(v => Math.max(2, v));
    setFocusRequest(previous => ({ point, key: (previous?.key ?? 0) + 1 }));
  };
  useEffect(() => {
    // Start following once when GPS becomes available; updates must not undo a manual pan.
    setFollowing(hasLivePosition);
    if (hasLivePosition) {
      setFocusRequest(null);
      setZoom(value => Math.max(2, value));
    }
  }, [hasLivePosition]);
  const validOrigin = isMapPoint(origin) ? origin : undefined;
  const validDestination = isMapPoint(destination) ? destination : undefined;
  const validStops = stops.filter(isMapPoint);
  const selected = routes.find(route => route.selected) ?? routes[0];
  const routePoints = useMemo(
    () => decodeMapPolyline(selected?.polyline ?? ""),
    [selected?.polyline]
  );
  const destinationReference = validDestination
    ? atlasDestinationReference(validDestination)
    : undefined;
  const guidance = currentRouteGuidance(
    selected?.steps ?? [],
    selected?.distanceMeters,
    liveProgress?.distanceMeters
  );
  const progressPercent =
    Number.isFinite(selected?.distanceMeters) &&
    Number(selected?.distanceMeters) > 0 &&
    Number.isFinite(liveProgress?.distanceMeters)
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (1 -
                Number(liveProgress?.distanceMeters) /
                  Number(selected?.distanceMeters)) *
                100
            )
          )
        )
      : null;
  const routeSourceLabel =
    selected?.source === "mapbox"
      ? "Mapbox"
      : selected?.source === "osrm"
        ? "OpenStreetMap/OSRM"
        : selected?.source === "offline-road"
          ? "Malha viária offline"
          : "Cálculo local";
  const routeReferences = useMemo(
    () => nearbyRouteReferences(validOrigin, validDestination, routePoints),
    [
      validOrigin?.lat,
      validOrigin?.lng,
      validDestination?.lat,
      validDestination?.lng,
      routePoints,
    ]
  );
  const nearbyNamedPlaces = [
    ...nearbyBusinesses.map(item => ({
      id: item.id,
      name: item.name,
      detail: item.precision
        ? "Catálogo local · " + item.precision
        : "Empresa próxima ao destino",
    })),
    ...routeReferences.map(item => ({
      id: item.id,
      name: item.name,
      detail: item.address,
    })),
  ]
    .filter(
      (item, index, list) =>
        list.findIndex(candidate => candidate.id === item.id) === index
    )
    .slice(0, 8);
  const markers = [
    ...nearbyBusinesses.map(point => ({ ...point, isReference: true })),
    ...routeReferences.map(point => ({
      ...point,
      label: "R",
      isReference: true,
    })),
    ...(isMapPoint(livePosition)
      ? [
          {
            ...livePosition,
            id: "live-position",
            name: "Você agora",
            label: "GPS",
          },
        ]
      : []),
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
  if (!markers.length && !routePoints.length)
    return (
      <div className="p-6 text-center text-white">
        <p className="font-bold">Defina a origem e o destino</p>
        <p className="mt-2 text-sm text-white/70">
          O mapa mostrará os pontos informados e a geometria da rota quando
          disponível.
        </p>
      </div>
    );
  const navigation = validDestination
    ? "https://www.google.com/maps/dir/?api=1" +
      (privateOrigin || !validOrigin
        ? ""
        : "&origin=" + validOrigin.lat + "," + validOrigin.lng) +
      "&destination=" +
      validDestination.lat +
      "," +
      validDestination.lng +
      "&travelmode=" +
      (travelMode === "cycling" ? "bicycling" : travelMode) +
      (validStops.length
        ? "&waypoints=" +
          encodeURIComponent(validStops.map(p => p.lat + "," + p.lng).join("|"))
        : "")
    : null;
  const mapControls = (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      role="group"
      aria-label="Controles da viagem"
    >
      <div className="pointer-events-auto absolute right-3 top-[8rem] overflow-hidden rounded-full border border-border bg-card shadow-md">
        <button
          type="button"
          aria-label="Diminuir zoom da prévia"
          disabled={zoom <= 1}
          onClick={() => setZoom(v => Math.max(1, v - 0.5))}
          className="grid size-11 place-items-center rounded-t-full bg-card shadow-sm disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>{" "}
        <button
          type="button"
          aria-label="Aumentar zoom da prévia"
          disabled={zoom >= 6}
          onClick={() => setZoom(v => Math.min(6, v + 0.5))}
          className="grid size-11 place-items-center rounded-b-full bg-card shadow-sm disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <button
        type="button"
        aria-label="Ver rota inteira"
        onClick={() => {
          setFollowing(false);
          setFocusRequest(null);
          setZoom(1);
          setResetKey(v => v + 1);
        }}
        className="pointer-events-auto absolute left-3 top-[4.25rem] flex min-h-11 items-center gap-2 rounded-full bg-card px-3 text-xs font-bold shadow-md"
      >
        <Navigation2 className="size-4" aria-hidden="true" />
        Rota inteira
      </button>
      {hasLivePosition && (
        <button
          type="button"
          aria-pressed={following}
          onClick={() => {
            setFocusRequest(null);
            setFollowing(value => !value);
            setZoom(value => Math.max(2, value));
          }}
          className={
            "pointer-events-auto absolute left-3 top-[8rem] flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-bold shadow-md " +
            (following ? "bg-accent text-accent-foreground" : "bg-card text-card-foreground")
          }
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          Seguir GPS
        </button>
      )}
    </div>
  );
  return (
    <div
      className="route-navigation bg-background text-card-foreground"
      data-live={Boolean(livePosition)}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
          {livePosition
            ? "GPS ao vivo neste aparelho"
            : selected?.source === "offline-road"
              ? "Rota offline pelas ruas"
              : selected?.source === "local-estimate" || forceOffline
                ? "Mapa local/offline"
                : "Rota pelas ruas"}
        </span>
        <span>
          {selected?.source === "offline-road"
            ? "Trajeto calculado na malha salva · sem trânsito ao vivo"
            : selected?.source === "local-estimate"
              ? "Estimativa em linha reta · sem curvas confirmadas"
              : routePoints.length
                ? "Geometria da rota disponível"
                : "Sem geometria viária confirmada"}
        </span>
      </div>
      {livePosition && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-accent/20 bg-secondary px-3 py-2 text-xs text-secondary-foreground"
          role="status"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 font-black text-accent">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            AO VIVO
          </span>
          <span>
            {livePosition.accuracy && Number.isFinite(livePosition.accuracy)
              ? "Precisão aproximada: " +
                Math.round(livePosition.accuracy) +
                " m"
              : "Posição atualizada neste aparelho"}
          </span>
          {livePosition.timestamp &&
            Number.isFinite(livePosition.timestamp) && (
              <span className="text-muted-foreground">
                {new Date(livePosition.timestamp).toLocaleTimeString("pt-BR")}
              </span>
            )}
        </div>
      )}
      {livePosition && (
        <section
          className="route-guidance-panel border-b border-border bg-background p-3 sm:p-4"
          aria-label="Painel de navegação"
        >
          <div className="route-guidance-content overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-[0_14px_34px_rgba(22,56,64,0.12)]">
            {liveProgress?.offRoute ? (
              <div className="flex min-w-0 items-start gap-3 bg-warning/10 p-4 text-warning">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning/15">
                  <AlertTriangle className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-black uppercase tracking-[.14em] text-warning">
                    Atenção
                  </p>
                  <p className="mt-1 text-lg font-black">
                    Fora do trajeto calculado
                  </p>
                  <p className="mt-1 break-words text-xs leading-relaxed">
                    O GPS está distante da geometria da rota. Recalcule antes de
                    confiar na próxima rua.
                  </p>
                </div>
              </div>
            ) : guidance && !liveProgress?.nearDestination ? (
              <div className="route-turn-banner bg-gradient-to-br from-secondary to-card p-4 text-white sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-card-foreground shadow-lg">
                    <ManeuverIcon maneuver={guidance.step.maneuver} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[.14em] text-primary">
                        Agora
                      </span>
                      <span className="text-xs font-bold text-white/65">
                        {compactDistance(guidance.distanceToManeuver)} neste
                        trecho
                      </span>
                    </div>
                    <p className="mt-2 break-words text-[clamp(1.05rem,5vw,1.45rem)] font-black leading-tight">
                      {guidance.step.instruction}
                    </p>
                    {guidance.step.name && (
                      <p className="mt-1 break-words text-sm font-bold text-secondary-foreground/80">
                        Via: {guidance.step.name}
                      </p>
                    )}
                  </div>
                </div>
                {guidance.nextStep && (
                  <div className="mt-4 flex min-w-0 items-start gap-2 rounded-2xl border border-white/10 bg-white/[.07] px-3 py-2.5">
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[.12em] text-white/65">
                      Depois
                    </span>
                    <ManeuverIcon
                      maneuver={guidance.nextStep.maneuver}
                      className="size-5 shrink-0"
                    />
                    <p className="min-w-0 break-words text-xs font-bold leading-relaxed text-white/80">
                      {guidance.nextStep.instruction}
                    </p>
                  </div>
                )}
              </div>
            ) : liveProgress?.nearDestination ? (
              <div className="p-4">
                <p className="text-[0.65rem] font-black uppercase tracking-[.14em] text-muted-foreground">
                  Chegada
                </p>
                <p className="mt-1 text-lg font-black text-card-foreground">
                  Você está próximo ao destino
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confira a entrada correta do local antes de encerrar o
                  acompanhamento.
                </p>
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                <p className="font-black text-card-foreground">
                  Acompanhamento sem instruções curva a curva
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  O mapa acompanha sua posição, mas não inventa nomes de ruas
                  quando o provedor não forneceu passos confirmados.
                </p>
              </div>
            )}

            <div className="route-telemetry grid grid-cols-2 border-t border-border sm:grid-cols-4">
              <div className="min-w-0 border-b border-r border-border p-3 sm:border-b-0">
                <MapPin className="size-4 text-accent" />
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                  Restante
                </p>
                <p className="mt-1 break-words text-base font-black text-card-foreground">
                  {compactDistance(liveProgress?.distanceMeters)}
                </p>
              </div>
              <div className="min-w-0 border-b border-border p-3 sm:border-b-0 sm:border-r">
                <Clock3 className="size-4 text-accent" />
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                  Tempo
                </p>
                <p className="mt-1 break-words text-base font-black text-card-foreground">
                  {compactDuration(liveProgress?.durationSeconds)}
                </p>
              </div>
              <div className="min-w-0 border-r border-border p-3">
                <Gauge className="size-4 text-accent" />
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                  Velocidade
                </p>
                <p className="mt-1 break-words text-base font-black text-card-foreground">
                  {Number.isFinite(liveSpeedMps)
                    ? Math.round(Number(liveSpeedMps) * 3.6) + " km/h"
                    : "—"}
                </p>
              </div>
              <div className="min-w-0 p-3">
                <LocateFixed className="size-4 text-accent" />
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                  GPS
                </p>
                <p className="mt-1 break-words text-sm font-black text-card-foreground">
                  {gpsQuality(livePosition.accuracy)}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">
                  {Number.isFinite(livePosition.accuracy)
                    ? "±" + Math.round(Number(livePosition.accuracy)) + " m"
                    : "posição ativa"}
                </p>
              </div>
            </div>

            <div className="route-arrival border-t border-border bg-background px-3 py-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                    Chegada estimada
                  </p>
                  <p className="mt-0.5 text-sm font-black text-card-foreground">
                    {arrivalTime(liveProgress?.durationSeconds)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[0.58rem] font-black uppercase tracking-[.1em] text-muted-foreground">
                    Guia
                  </p>
                  <p className="mt-0.5 text-xs font-black text-card-foreground">
                    {selected?.steps?.length
                      ? "Guia completo"
                      : "Guia limitado"}
                  </p>
                </div>
              </div>
              {progressPercent !== null && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[0.65rem] font-bold text-muted-foreground">
                    <span>Progresso da viagem</span>
                    <span>{progressPercent}% concluído</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Progresso da viagem"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300"
                      style={{ width: progressPercent + "%" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {showRouteDetails && !hasLivePosition && (
        <RouteOverview route={selected} travelMode={travelMode} />
      )}
      <OfflineMapCanvas
        selectedMarkerId={selectedMarkerId}
        controls={mapControls}
        initialDark={false}
        className="h-[min(62dvh,560px)] min-h-[320px]"
        markers={showReferences ? markers : markers.filter(marker => !("isReference" in marker && marker.isReference))}
        routePoints={routePoints}
        zoom={zoom}
        onZoom={setZoom}
        resetKey={resetKey}
        focusRequest={focusRequest}
        followPoint={following ? livePosition : undefined}
        onManualInteraction={() => setFollowing(false)}
        estimated={selected?.source === "local-estimate"}
        ariaLabel="Prévia offline da rota"
        onSelect={marker => {
          setSelectedMarkerId(marker.id);
          setSelectedPoint(
            marker.name +
              (nearbyBusinesses.find(item => item.id === marker.id)?.precision
                ? " · " +
                  nearbyBusinesses.find(item => item.id === marker.id)
                    ?.precision
                : "")
          );
          focus(marker);
        }}
      />
      <div className="route-map-actions flex flex-wrap gap-2 border-b border-border px-3 pb-3">
        <button type="button" aria-pressed={showReferences} onClick={() => setShowReferences(value => !value)} className="min-h-11 rounded-xl border border-black/15 bg-card px-3 text-xs font-bold">{showReferences ? "Ocultar referências" : "Mostrar referências"}</button>
        {validOrigin && (
          <button
            type="button"
            onClick={() => focus(validOrigin)}
            className="min-h-11 rounded-xl bg-card px-3 text-xs font-bold"
          >
            Ver origem
          </button>
        )}
        {validDestination && (
          <button
            type="button"
            onClick={() => focus(validDestination)}
            className="min-h-11 rounded-xl bg-card px-3 text-xs font-bold"
          >
            Ver destino
          </button>
        )}
      </div>

      <div className="space-y-2 border-t border-border bg-card p-4 text-sm">
        {destinationReference && (
          <p className="break-words rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            {destinationReference.name} · {destinationReference.precision}{" "}
            Fonte: {destinationReference.sourceLabel}
          </p>
        )}
        <section className="grid grid-cols-2 gap-2" aria-label="Dados da rota">
          <div className="min-w-0 rounded-xl border border-border bg-background p-2.5">
            <p className="text-[0.62rem] font-black uppercase tracking-[.08em] text-muted-foreground">
              Fonte da rota
            </p>
            <p className="mt-1 break-words text-xs font-black">
              {routeSourceLabel}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-border bg-background p-2.5">
            <p className="text-[0.62rem] font-black uppercase tracking-[.08em] text-muted-foreground">
              Guia
            </p>
            <p className="mt-1 break-words text-xs font-black">
              {selected?.steps?.length
                ? selected.steps.length + " orientações"
                : "Sem passos confirmados"}
            </p>
          </div>
        </section>
        {nearbyNamedPlaces.length > 0 && (
          <section
            className="rounded-2xl border border-accent/20 bg-accent/5 p-3"
            aria-labelledby="nearby-places-title"
          >
            <div className="flex items-center justify-between gap-3">
              <p
                id="nearby-places-title"
                className="text-xs font-black uppercase tracking-[.12em] text-accent"
              >
                Lugares próximos e referências
              </p>
              <span className="rounded-full bg-card px-2 py-1 text-[0.65rem] font-black text-muted-foreground">
                {nearbyNamedPlaces.length}
              </span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {nearbyNamedPlaces.map(place => (
                <button
                  type="button"
                  aria-label={"Ver " + place.name + " no mapa"}
                  onClick={() => {
                    const point = markers.find(
                      marker => marker.id === place.id
                    );
                    if (point) {
                      setSelectedMarkerId(point.id);
                      setSelectedPoint(place.name + " · " + place.detail);
                      focus(point);
                    }
                  }}
                  key={place.id}
                  className="min-h-11 min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <p className="truncate text-xs font-black text-card-foreground">
                    {place.name}
                  </p>
                  <p className="mt-0.5 break-words text-[0.68rem] text-muted-foreground">
                    {place.detail}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
        {nearbyBusinesses.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {nearbyBusinesses.length} empresas próximas ao destino · referências
            aproximadas do catálogo local
          </p>
        )}
        {selectedPoint && <p className="font-black">{selectedPoint}</p>}
        <p>
          {selected?.source === "local-estimate"
            ? "Estimativa entre coordenadas, sem trajeto pelas ruas. Confirme o percurso no aplicativo de navegação."
            : selected?.source === "offline-road" && routePoints.length
              ? "Traçado calculado na malha viária salva no aparelho. Sentidos de via, bloqueios, obras e trânsito podem ter mudado; siga a sinalização local."
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
        {showRouteDetails &&
          (selected?.steps?.length ? (
            <RouteInstructions
              steps={selected.steps}
              currentIndex={
                hasLivePosition &&
                !liveProgress?.offRoute &&
                !liveProgress?.nearDestination
                  ? guidance?.index
                  : undefined
              }
            />
          ) : routePoints.length && selected?.source !== "local-estimate" ? (
            <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              A rota foi calculada pelas ruas, mas este provedor não enviou
              instruções curva a curva nesta consulta.
            </p>
          ) : null)}

        {navigation && !forceOffline && (
          <a
            href={navigation}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 font-bold text-primary-foreground"
          >
            Abrir no Google Maps
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Ruas offline cobrem a área urbana cadastrada. Quando a rota traz
          passos confirmados, o guia pode acompanhá-los no aparelho; sem esses
          passos, o Trajeto não inventa conversões. Navegação externa pode
          exigir internet.
        </p>
      </div>
    </div>
  );
}

function RouteMapContent({
  origin,
  destination,
  stops,
  routes = [],
  privateOrigin = false,
  forceOffline = false,
  travelMode = "driving",
  livePosition,
  liveProgress,
  liveSpeedMps,
}: RouteMapProps) {
  const businesses = useBusinessCatalog();
  const businessReferences = useMemo(
    () => nearbyBusinessReferences(businesses.items, destination),
    [businesses.items, destination?.lat, destination?.lng]
  );
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
      ?.filter(route => route.polyline && route === (routes.find(item => item.selected) ?? routes[0]))
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
    nearbyRouteReferences(
      origin,
      destination,
      routes.flatMap(route => decodePolyline(route.polyline ?? ""))
    ).forEach(reference =>
      makeMarker(reference, "Referência · " + reference.name, "#3DE3FF")
    );
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
    [origin, destination, ...stops].forEach(point =>
      bounds.extend(point)
    );
    routes
      .filter(route => route.polyline && route === (routes.find(item => item.selected) ?? routes[0]))
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
  const selectedRoutePoints = decodeMapPolyline(selectedRoute?.polyline ?? "");
  const destinationReference = destination
    ? atlasDestinationReference(destination)
    : undefined;
  const nearbyReferences = [
    ...nearbyRouteReferences(origin, destination, selectedRoutePoints),
    ...businessReferences.map(item => ({
      ...item,
      address: item.precision || "Referência aproximada do catálogo local",
      coordinateLabel: item.precision,
      coordinateKind: "area-reference" as const,
      source: "local" as const,
    })),
  ];
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

  if (forceOffline || livePosition) {
    return (
      <section
        className="overflow-hidden rounded-2xl border border-white/10"
        aria-label="Mapa offline da viagem"
      >
        <OfflineRoutePreview
          origin={origin}
          destination={destination}
          stops={stops}
          routes={routes}
          privateOrigin={privateOrigin}
          livePosition={livePosition}
          liveProgress={liveProgress}
          liveSpeedMps={liveSpeedMps}
          forceOffline
          travelMode={travelMode}
        />
      </section>
    );
  }

  if (privateOrigin) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-background"
        aria-label="Prévia privada da viagem"
      >
        <OfflineRoutePreview
          origin={origin}
          destination={destination}
          routes={routes}
          stops={stops}
          privateOrigin
          travelMode={travelMode}
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
        <RouteOverview route={selectedRoute} travelMode={travelMode} />
        <TileStationMap
          selectionLabel="Escolher ponto da viagem"
          routePoints={points}
          travelMode={travelMode}
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
            ...nearbyReferences,
          ]}
          fallback={
            <div className="relative">
              <OfflineRoutePreview
                origin={origin}
                destination={destination}
                routes={routes}
                stops={stops}
                travelMode={travelMode}
                showRouteDetails={false}
              />
            </div>
          }
        />
        <div className="min-w-0 bg-card p-3">
          {selectedRoute?.steps?.length ? (
            <RouteInstructions steps={selectedRoute.steps} />
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              O provedor não enviou instruções curva a curva. Use a linha do
              mapa como referência e confirme o caminho.
            </p>
          )}
        </div>
        {destinationReference && (
          <p className="break-words bg-card px-3 py-2 text-xs text-amber-100">
            {destinationReference.name} · {destinationReference.precision}{" "}
            Fonte: {destinationReference.sourceLabel}
          </p>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 bg-card px-3 py-2.5 text-[11px] font-bold text-white/55">
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-primary" />
            rota e pontos principais
          </span>
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-accent" />
            referências próximas
          </span>
          <span>
            {nearbyReferences.length} referência(s) verificada(s) no entorno
          </span>
        </div>
      </section>
    );
  }

  if (isGitHubPagesRuntime()) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-background"
        aria-label="Mapa independente da viagem"
      >
        <div className="planner-map-shell">
          <OfflineRoutePreview
            origin={origin}
            destination={destination}
            routes={routes}
            stops={stops}
            travelMode={travelMode}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-background"
      aria-label="Mapa interativo da viagem"
    >
      <MapView
        className="h-[min(70vh,660px)] min-h-[420px] max-w-full overflow-hidden"
        initialCenter={{ lat: -15.7545, lng: -48.2816 }}
        initialZoom={11}
        fallback={
          <OfflineRoutePreview
            origin={origin}
            destination={destination}
            routes={routes}
            stops={stops}
            travelMode={travelMode}
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
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-background/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur disabled:opacity-40"
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
                  ? "bg-primary text-background"
                  : "bg-background/90 text-white")
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
                  ? "bg-foreground text-background"
                  : "bg-background/90 text-white")
              }
            >
              <Satellite className="size-4" />
              Satélite
            </button>
          </div>
          <div className="absolute right-3 top-[7rem] z-10 flex flex-wrap justify-end gap-2">
            <span className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-background/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur">
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
                  ? "border-primary/40 bg-primary text-background"
                  : "border-white/10 bg-background/90 text-white")
              }
            >
              {is3D ? "2D" : "3D"}
            </button>
            <button
              type="button"
              onClick={rotateCompass}
              disabled={!mapReady || !isVector}
              aria-label={`Girar mapa para ${(heading + 45) % 360} graus`}
              className="min-h-11 rounded-xl border border-white/10 bg-background/90 px-3 text-xs font-black text-white shadow-lg backdrop-blur"
            >
              N {Math.round(heading)}°
            </button>
          </div>
          {selectedRoute && (
            <div
              className="absolute bottom-3 left-3 max-w-[min(360px,calc(100%-84px))] rounded-xl border border-white/10 bg-background/90 p-3 text-white shadow-lg backdrop-blur"
              aria-live="polite"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-accent">
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
                <p className="mt-1 text-xs text-muted-foreground">
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
              className="grid size-11 place-items-center rounded-xl border border-white/10 bg-background/90 text-white shadow-lg backdrop-blur disabled:opacity-40"
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
              className="grid size-11 place-items-center rounded-xl border border-white/10 bg-background/90 text-white shadow-lg backdrop-blur disabled:opacity-40"
            >
              <Minus className="size-5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function RouteMap(props: RouteMapProps) {
  return (
    <MapExplorerFrame label="Mapa da viagem">
      <RouteMapContent {...props} />
    </MapExplorerFrame>
  );
}
