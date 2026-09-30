import { AlertTriangle, Fuel, Gauge, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { fuelLogEvent, listFuelLog } from "@/lib/fuelLog";

type Props = { distanceKm: number; durationSeconds?: number; roundTrip?: boolean };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function TripFuelBriefing({ distanceKm, durationSeconds, roundTrip = false }: Props) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [price, setPrice] = useState(0);\n  const [priceDate, setPriceDate] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      const latest = listFuelLog()[0];
      setPrice(latest && latest.liters > 0 ? latest.totalCost / latest.liters : 0);\n      setPriceDate(latest?.date ?? null);
    };
    refresh();
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(fuelLogEvent, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(fuelLogEvent, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    if (!vehicle || !Number.isFinite(distanceKm) || distanceKm <= 0) return null;
    const tripDistanceKm = distanceKm * (roundTrip ? 2 : 1);
    const autonomyKm = vehicle.tank * vehicle.consumption;
    const liters = tripDistanceKm / vehicle.consumption;
    const fuelCost = price > 0 ? liters * price : null;
    const reserve = autonomyKm > 0 ? Math.max(0, 1 - tripDistanceKm / autonomyKm) : 0;
    const refuels = autonomyKm > 0 ? Math.max(0, Math.ceil(tripDistanceKm / autonomyKm) - 1) : 0;
    const tankCoverage = autonomyKm > 0 ? Math.min(999, (tripDistanceKm / autonomyKm) * 100) : 0;
    return { autonomyKm, liters, fuelCost, reserve, refuels, tankCoverage, tripDistanceKm };
  }, [vehicle, distanceKm, price, roundTrip]);

  if (!stats || !vehicle) return null;

  const routeUsesLargeShare = stats.tripDistanceKm >= stats.autonomyKm * 0.8;

  return (
    <section className="mt-3 rounded-[1.25rem] border border-white/10 bg-[#10181F] p-4 text-white" aria-labelledby="trip-fuel-briefing-title">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Fuel className="size-4" /></div>
        <div className="min-w-0">
          <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Combustível da viagem</p>
          <h3 id="trip-fuel-briefing-title" className="mt-1 text-sm font-black">Estimativa para este percurso</h3>
          <p className="mt-1 text-[0.62rem] leading-relaxed text-white/45">Cálculo teórico com o consumo e tanque cadastrados. Não representa o nível atual do tanque.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        <div className="min-w-[8.7rem] snap-start rounded-xl bg-white/[.045] p-3 sm:min-w-0"><Gauge className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-[0.52rem] font-black uppercase tracking-[.1em] text-white/40">Autonomia teórica</p><p className="mt-1 text-sm font-black">{stats.autonomyKm.toLocaleString("pt-BR",{maximumFractionDigits:0})} km</p></div>
        <div className="min-w-[8.7rem] snap-start rounded-xl bg-white/[.045] p-3 sm:min-w-0"><Fuel className="size-3.5 text-[#C7FF3C]" /><p className="mt-2 text-[0.52rem] font-black uppercase tracking-[.1em] text-white/40">Consumo da rota</p><p className="mt-1 text-sm font-black">{stats.liters.toLocaleString("pt-BR",{maximumFractionDigits:1})} L</p></div>
        <div className="min-w-[8.7rem] snap-start rounded-xl bg-white/[.045] p-3 sm:min-w-0"><Wallet className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-[0.52rem] font-black uppercase tracking-[.1em] text-white/40">Combustível</p><p className="mt-1 text-sm font-black">{stats.fuelCost != null ? money.format(stats.fuelCost) : "sem preço"}</p></div>
        <div className={"min-w-[8.7rem] snap-start rounded-xl p-3 sm:min-w-0 " + (routeUsesLargeShare ? "bg-[#FFC928]/10" : "bg-white/[.045]")}>{routeUsesLargeShare ? <AlertTriangle className="size-3.5 text-[#FFD66B]" /> : <Gauge className="size-3.5 text-[#3DE3FF]" />}<p className="mt-2 text-[0.52rem] font-black uppercase tracking-[.1em] text-white/40">Margem teórica</p><p className="mt-1 text-sm font-black">{Math.round(stats.reserve * 100)}%</p></div>
        <div className={"min-w-[8.7rem] snap-start rounded-xl p-3 sm:min-w-0 " + (stats.refuels > 0 ? "bg-[#FFC928]/10" : "bg-white/[.045]")}>
          <Fuel className={"size-3.5 " + (stats.refuels > 0 ? "text-[#FFD66B]" : "text-[#3DE3FF]")} />
          <p className="mt-2 text-[0.52rem] font-black uppercase tracking-[.1em] text-white/40">Abastecimentos</p>
          <p className="mt-1 text-sm font-black">{stats.refuels === 0 ? "nenhum previsto" : stats.refuels + " necessário" + (stats.refuels === 1 ? "" : "s")}</p>
        </div>
      </div>
      <p className="mt-3 text-[0.58rem] font-semibold text-white/35">{roundTrip ? "Ida e volta ativada · " : ""}{price > 0 ? `Preço usado: ${money.format(price)}/L, do último abastecimento registrado neste aparelho${priceDate ? ` · ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(priceDate))}` : ""}.` : "Registre um abastecimento para transformar litros estimados em custo."}{durationSeconds && durationSeconds > 0 ? ` · duração estimada ${Math.max(1, Math.round(durationSeconds / 60))} min.` : ""}</p>
    </section>
  );
}
