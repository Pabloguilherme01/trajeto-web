import { Fuel, Gauge, Route, Wallet } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { fuelLogEvent, listFuelLog } from "@/lib/fuelLog";

type Props = { distanceKm: number; durationSeconds?: number; roundTrip?: boolean };

export default function TripFuelBriefing({ distanceKm, durationSeconds, roundTrip = false }: Props) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [price, setPrice] = useState(0);
  const [roundTripMode, setRoundTripMode] = useState(roundTrip);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      const latest = listFuelLog()[0];
      setPrice(latest && latest.liters > 0 ? latest.totalCost / latest.liters : 0);
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(fuelLogEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(fuelLogEvent, refresh);
    };
  }, []);

  useEffect(() => {
    setRoundTripMode(roundTrip);
  }, [roundTrip]);

  const stats = useMemo(() => {
    if (!vehicle || !Number.isFinite(distanceKm) || distanceKm <= 0 || vehicle.consumption <= 0) return null;
    const totalKm = distanceKm * (roundTripMode ? 2 : 1);
    const liters = totalKm / vehicle.consumption;
    const cost = price > 0 ? liters * price : null;
    const autonomy = vehicle.tank > 0 ? vehicle.tank * vehicle.consumption : null;
    const coverage = autonomy ? totalKm / autonomy : null;
    return { totalKm, liters, cost, autonomy, coverage };
  }, [vehicle, distanceKm, roundTripMode, price]);

  if (!stats) return null;

  return (
    <section className="mt-3 rounded-3xl border border-white/8 bg-[#10191F] p-4 text-white">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Fuel className="size-4" /></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#C7FF3C]">Combustível</p><h3 className="mt-1 text-base font-black">Estimativa do seu veículo.</h3></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={!roundTripMode} onClick={() => setRoundTripMode(false)} className={"min-h-11 rounded-2xl border px-3 text-xs font-black " + (!roundTripMode ? "border-[#C7FF3C]/30 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/8 bg-white/[.025] text-white/55")}><Route className="mr-1.5 inline size-3.5" />Só ida</button>
        <button type="button" aria-pressed={roundTripMode} onClick={() => setRoundTripMode(true)} className={"min-h-11 rounded-2xl border px-3 text-xs font-black " + (roundTripMode ? "border-[#C7FF3C]/30 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/8 bg-white/[.025] text-white/55")}><Route className="mr-1.5 inline size-3.5" />Ida e volta</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/[.035] p-3"><Gauge className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-xs uppercase tracking-[.1em] text-white/65">Litros</p><p className="mt-1 text-sm font-black">{stats.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</p></div>
        <div className="rounded-2xl bg-white/[.035] p-3"><Wallet className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-xs uppercase tracking-[.1em] text-white/65">Custo</p><p className="mt-1 text-sm font-black">{stats.cost == null ? "—" : stats.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/65">{roundTripMode ? "Calculado para ida e volta." : "Calculado para uma perna da viagem."}{durationSeconds && durationSeconds > 0 ? " Duração estimada: " + Math.max(1, Math.round(durationSeconds / 60)) + " min." : ""} {price > 0 ? "O preço vem do último abastecimento registrado neste aparelho." : "Registre um abastecimento para estimar custo."}</p>
    </section>
  );
}
