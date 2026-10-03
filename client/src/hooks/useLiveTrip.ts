import { useCallback, useEffect, useRef, useState } from "react";
import { decodeMapPolyline, isMapPoint, type MapPoint } from "@/lib/mapGeometry";
import { tripProgress } from "@/lib/tripProgress";
import { localDataEvent } from "@/lib/localData";

type Route = { origin: MapPoint | null; destination: MapPoint | null; polyline?: string | null; distanceMeters?: number | null; durationSeconds?: number | null; source?: string };
export function useLiveTrip(route: Route | null) {
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
    setActive(false); setFix(null);
  }, []);
  useEffect(() => {
    stop(); setMessage("");
    return stop;
  }, [route, stop]);
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
        if (!isMapPoint(point) || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || Date.now() - position.timestamp > 15000 || position.timestamp > Date.now() + 5000) {
          setMessage("GPS impreciso ou antigo. Aguardando um sinal melhor."); return;
        }
        setNow(Date.now()); setFix({ ...point, accuracy, timestamp: position.timestamp }); setMessage("");
      }, error => {
        if (version !== generation.current) return;
        if (error.code === 1) { stop(); setMessage("Localização não autorizada. Permita o GPS no navegador para acompanhar a viagem."); }
        else setMessage("Sinal de GPS indisponível. Aguardando uma nova posição.");
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    } catch { stop(); setMessage("Não foi possível iniciar o GPS neste aparelho."); }
  };
  const stale = Boolean(fix && now - fix.timestamp > 20000);
  const decoded = decodeMapPolyline(route?.polyline ?? "");
  const points = decoded.length ? decoded : [route?.origin, route?.destination].filter(isMapPoint);
  const progress = fix && !stale && route ? tripProgress(fix, points, route.distanceMeters ?? NaN, route.durationSeconds ?? NaN, route.source === "local-estimate" || !decoded.length, fix.accuracy) : null;
  return { active, point: fix && !stale ? fix : null, progress, start, stop, message: stale ? "Sinal de GPS antigo. Aguardando atualização; estimativas pausadas." : message };
}
