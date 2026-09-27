import { Battery, CloudOff, Compass, Gauge, LocateFixed, Navigation, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip } from "@/lib/mobilePreferences";
import { listOfflineRoutes } from "@/lib/offlineStore";

export default function MobileTravelHub() {
  const [, setLocation] = useLocation();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [battery, setBattery] = useState<number | null>(null);
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    let mounted = true;
    void listOfflineRoutes().then(routes => { if (mounted) setSavedRoutes(routes.length); }).catch(() => {});
    if (mounted) setLastTrip(getLastTrip());

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void }>;
    };
    let batteryDevice: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | undefined;
    const updateBattery = () => { if (batteryDevice && mounted) setBattery(Math.round(batteryDevice.level * 100)); };
    if (nav.getBattery) void nav.getBattery().then(device => {
      batteryDevice = device;
      updateBattery();
      device.addEventListener("levelchange", updateBattery);
    }).catch(() => {});

    return () => {
      mounted = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      batteryDevice?.removeEventListener("levelchange", updateBattery);
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(position => {
      setLocation(appUrl("/postos") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&q=" + encodeURIComponent("postos próximos"));
    }, undefined, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
  };

  return (
    <section className="border-y border-white/8 bg-[linear-gradient(180deg,#101A21_0%,#0B1014_100%)] py-5 md:hidden">
      <div className="container">
        <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#111A21] p-4 shadow-[0_18px_50px_rgba(0,0,0,.2)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Painel de viagem</p>
              <p className="mt-1 text-sm font-extrabold text-white">{online ? "Conectado e pronto" : "Modo offline ativo"}</p>
            </div>
            <div className={online ? "text-[#C7FF3C]" : "text-[#FFB86B]"}>{online ? <Wifi className="size-5" /> : <CloudOff className="size-5" />}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/6 bg-white/[0.035] p-3"><Navigation className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Rotas salvas</p><p className="text-sm font-extrabold text-white">{savedRoutes}</p></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><Battery className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Bateria</p><p className="text-sm font-extrabold text-white">{battery === null ? "—" : battery + "%"}</p></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><Compass className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Modo</p><p className="text-sm font-extrabold text-white">{online ? "Online" : "Offline"}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={locate} className="min-h-11 rounded-xl border border-white/12 bg-white/[0.025] text-xs font-bold text-white transition active:scale-[.98]"><LocateFixed className="mr-2 inline size-4 text-[#3DE3FF]" />Perto de mim</button>
            <button type="button" onClick={() => setLocation(appUrl("/planejar"))} className="min-h-11 rounded-xl bg-[#C7FF3C] text-xs font-extrabold text-[#0B1014] shadow-[0_8px_20px_rgba(199,255,60,.12)] transition active:scale-[.98]"><Gauge className="mr-2 inline size-4" />Planejar</button>
          </div>
        </div>
      </div>
    </section>
  );
}
