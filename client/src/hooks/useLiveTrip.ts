import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeMapPolyline, isMapPoint, type MapPoint } from "@/lib/mapGeometry";
import { tripProgress } from "@/lib/tripProgress";
import { localDataEvent } from "@/lib/localData";

type Route = { origin: MapPoint | null; destination: MapPoint | null; polyline?: string | null; distanceMeters?: number | null; durationSeconds?: number | null; source?: string };
export function useLiveTrip(route: Route | null) {
  const samples = useRef<number[]>([]);
  const acceptedTimestamp = useRef(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [fix, setFix] = useState<(MapPoint & { accuracy: number; timestamp: number }) | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const stop = useCallback(() => {
    generation.current++;
    if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
    samples.current = []; acceptedTimestamp.current = 0; setSpeed(null);
    setActive(false); setFix(null);
  }, []);
  useEffect(() => {
    stop(); setMessage("");
    return stop;
  }, [route?.origin?.lat, route?.origin?.lng, route?.destination?.lat, route?.destination?.lng, route?.polyline, route?.distanceMeters, route?.durationSeconds, route?.source, stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setMessage("Acompanhamento pausado ao sair da tela. Inicie novamente para continuar."); } };
    const clear = () => { stop(); setMessage(""); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener(localDataEvent, clear);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener(localDataEvent, clear); };
  }, [stop]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [active]);
  const start = () => {
    stop();
    if (!route || !navigator.geolocation) { setMessage("Este aparelho não oferece localização para acompanhar a viagem."); return; }
    const version = generation.current;
    setActive(true); setMessage("Aguardando uma posição precisa do GPS.");
    try {
      watch.current = navigator.geolocation.watchPosition(position => {
        if (version !== generation.current) return;
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        const accuracy = position.coords.accuracy;
        if (!Number.isFinite(position.timestamp) || !isMapPoint(point) || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || Date.now() - position.timestamp > 15000 || position.timestamp > Date.now() + 5000) {
          setMessage("GPS impreciso ou antigo. Aguardando um sinal melhor."); return;
        }
        if (position.timestamp <= acceptedTimestamp.current) return;
        if (position.timestamp - acceptedTimestamp.current > 15000) samples.current = [];
        acceptedTimestamp.current = position.timestamp;
        const reportedSpeed = position.coords.speed;
        if (accuracy <= 30 && typeof reportedSpeed === "number" && Number.isFinite(reportedSpeed) && reportedSpeed >= 0.5 && reportedSpeed <= 60) {
          samples.current = [...samples.current, reportedSpeed].slice(-5);
          setSpeed(samples.current.length >= 3 ? samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length : null);
        } else { samples.current = []; setSpeed(null); }
        setNow(Date.now()); setFix({ ...point, accuracy, timestamp: position.timestamp }); setMessage("");
      }, error => {
        if (version !== generation.current) return;
        if (error.code === 1) { stop(); setMessage("Localização não autorizada. Permita o GPS no navegador para acompanhar a viagem."); }
        else setMessage("Sinal de GPS indisponível. Aguardando uma nova posição.");
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    } catch { stop(); setMessage("Não foi possível iniciar o GPS neste aparelho."); }
  };
  const stale = Boolean(fix && now - fix.timestamp > 20000);
  const decoded = useMemo(() => decodeMapPolyline(route?.polyline ?? ""), [route?.polyline]);
  const points = decoded.length ? decoded : [route?.origin, route?.destination].filter(isMapPoint);
  const progress = fix && !stale && route ? tripProgress(fix, points, route.distanceMeters ?? NaN, route.durationSeconds ?? NaN, route.source === "local-estimate" || !decoded.length, fix.accuracy) : null;
  const liveSpeed = progress && !progress.offRoute && !stale ? speed : null;
  const adjustedProgress = progress && liveSpeed ? { ...progress, durationSeconds: progress.distanceMeters / liveSpeed } : progress;
  return { speed: liveSpeed, active, point: fix && !stale ? fix : null, progress: adjustedProgress, start, stop, message: stale ? "Sinal de GPS antigo. Aguardando atualização; estimativas pausadas." : message };
}
