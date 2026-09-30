import { CircleCheck, CircleDashed, Info, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { describeRouteData } from "@/lib/routeDataProvenance";

const PRICE_KEY = "trajeto-route-fuel-price";

const statusClass = {
  available: "border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] text-[#DFFF9D]",
  estimated: "border-[#FFB86B]/15 bg-[#FFB86B]/[.035] text-[#FFE0B3]",
  missing: "border-white/8 bg-white/[.02] text-white/45",
} as const;

export default function RouteDataProvenanceCard(props: { route: RouteIntelligenceRoute | null }) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      try {
        const value = Number(localStorage.getItem(PRICE_KEY) || "");
        setFuelPrice(Number.isFinite(value) && value > 0 ? value : null);
      } catch {
        setFuelPrice(null);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
    };
  }, []);

  if (!props.route) return null;

  const flags = describeRouteData({
    distanceMeters: props.route.distanceMeters,
    durationSeconds: props.route.durationSeconds,
    staticDurationSeconds: props.route.staticDurationSeconds,
    tollAmount: props.route.toll?.amount ?? null,
    tollEstimated: Boolean(props.route.toll?.estimated),
    fuelPricePerLiter: fuelPrice,
    consumptionKmPerLiter: vehicle?.consumption ?? null,
  });

  const available = flags.filter(flag => flag.status === "available").length;
  const estimated = flags.filter(flag => flag.status === "estimated").length;
  const summary = available + " dados disponíveis" + (estimated ? " · " + estimated + " estimado" + (estimated === 1 ? "" : "s") : "");

  return (
    <details className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-[#0F171D] text-white">
      <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]">
            <Info className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Premissas da decisão</p>
            <h3 className="mt-1 text-sm font-black">Veja exatamente o que entrou no cálculo.</h3>
            <p className="mt-1 text-[0.56rem] leading-relaxed text-white/35">{summary}. O que falta permanece identificado.</p>
          </div>
          <CircleDashed className="mt-1 size-4 shrink-0 text-white/25" />
        </div>
      </summary>

      <div className="border-t border-white/8 px-4 pb-4 pt-3 sm:px-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {flags.map(flag => (
            <div key={flag.key} className={"rounded-2xl border p-3 " + statusClass[flag.status]}>
              <div className="flex items-center gap-2">
                {flag.status === "available" ? <CircleCheck className="size-3.5" /> : flag.status === "estimated" ? <TriangleAlert className="size-3.5" /> : <CircleDashed className="size-3.5" />}
                <p className="text-[0.56rem] font-black uppercase tracking-[.1em]">{flag.label}</p>
              </div>
              <p className="mt-1.5 text-[0.62rem] font-bold leading-relaxed">{flag.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.018] p-3 text-[0.55rem] leading-relaxed text-white/35">
          <p><strong className="text-white/65">Origem:</strong> distância, duração, trânsito e pedágio vêm da inteligência da rota quando disponibilizados.</p>
          <p className="mt-1"><strong className="text-white/65">Combustível:</strong> usa apenas o veículo salvo neste aparelho e o preço informado localmente.</p>
          <p className="mt-1"><strong className="text-white/65">Sem dado:</strong> o Trajeto não transforma ausência de informação em zero.</p>
        </div>
      </div>
    </details>
  );
}
