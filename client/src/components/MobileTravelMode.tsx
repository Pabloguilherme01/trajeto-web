import { MonitorUp, Smartphone, BatteryLow } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (type: string, listener: () => void) => void; };

export default function MobileTravelMode() {
  const [active, setActive] = useState(() => { try { return localStorage.getItem("trajeto-travel-mode") === "1"; } catch { return false; } });
  const [supported, setSupported] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const lockRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const available = typeof navigator !== "undefined" && "wakeLock" in navigator;
    setSupported(available);
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void }> };
    let batteryDevice: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | undefined;
    const updateBattery = () => { if (batteryDevice) setBattery(Math.round(batteryDevice.level * 100)); };
    if (nav.getBattery) void nav.getBattery().then(device => { batteryDevice = device; updateBattery(); device.addEventListener("levelchange", updateBattery); }).catch(() => {});
    const reacquire = async () => {
      if (!available || !active || document.visibilityState !== "visible") return;
      try {
        const wakeLock = await (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock.request("screen");
        lockRef.current = wakeLock;
        wakeLock.addEventListener?.("release", () => setActive(false));
      } catch { setActive(false); try { localStorage.setItem("trajeto-travel-mode", "0"); } catch {} }
    };
    document.addEventListener("visibilitychange", reacquire);
    void reacquire();
    return () => {
      document.removeEventListener("visibilitychange", reacquire);
      void lockRef.current?.release();
      batteryDevice?.removeEventListener("levelchange", updateBattery);
    };
  }, [active]);

  const toggle = async () => {
    if (!supported) return;
    if (active) {
      await lockRef.current?.release();
      lockRef.current = null;
      setActive(false);
      return;
    }
    try {
      const wakeLock = await (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock.request("screen");
      lockRef.current = wakeLock;
      wakeLock.addEventListener?.("release", () => setActive(false));
      setActive(true);
      try { localStorage.setItem("trajeto-travel-mode", "1"); } catch {}
    } catch {
      setActive(false);
    }
  };

  if (!supported) return null;

  return (
    <section className={`rounded-2xl border p-4 text-[#D8F6FF] ${active ? "border-[#C7FF3C]/35 bg-[#C7FF3C]/[0.06]" : "border-[#3DE3FF]/25 bg-[#3DE3FF]/8"}`}>
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/15"><Smartphone className="size-4 text-[#3DE3FF]" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-white">Modo viagem</p>
          <p className="mt-1 text-[0.68rem] leading-relaxed text-[#9EC8D2]">{active ? "A tela permanecerá ativa enquanto você mantém esta página aberta." : "Evite que a tela apague durante a preparação da viagem."}</p>{battery !== null && <p className="mt-1 inline-flex items-center gap-1 text-[0.6rem] font-bold text-[#7FAAB4]"><BatteryLow className="size-3" /> Bateria {battery}%</p>}
        </div>
        <button type="button" onClick={() => void toggle()} className={`min-h-11 shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#0B1014]" : "border-[#3DE3FF]/40 text-[#C9F7FF] hover:bg-[#3DE3FF] hover:text-[#0B1014]"}`} aria-pressed={active}>
          <MonitorUp className="mr-1.5 inline size-3.5" />{active ? "Ativo" : "Ativar"}
        </button>
      </div>
    </section>
  );
}
