import { useEffect, useMemo, useState } from "react";
import { CarFront, Fuel, Gauge, Scale } from "lucide-react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { calculateFuelBreakEvenPrice, routeCostAtFuelPrice } from "@/lib/routeSensitivity";

const PRICE_KEY = "trajeto-route-fuel-price";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function routeLabel(id: string) {
  return id === "principal" ? "Principal" : id.replace("alternativa-", "Alternativa ");
}

export default function RouteSensitivityCard(props: {
  routes: RouteIntelligenceRoute[];
  selectedRouteId: string;
}) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState(5);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      try {
        const stored = Number(localStorage.getItem(PRICE_KEY) || "");
        if (Number.isFinite(stored) && stored > 0) setFuelPrice(Math.min(12, Math.max(2, stored)));
      } catch {}
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
    };
  }, []);

  const baseline = useMemo(
    () => props.routes.find(route => route.id === props.selectedRouteId) ?? props.routes[0] ?? null,
    [props.routes, props.selectedRouteId],
  );

  const rows = useMemo(() => {
    if (!baseline || !vehicle) return [];

    const baseInput = {
      distanceKm: baseline.distanceMeters != null ? baseline.distanceMeters / 1000 : null,
      tollAmount: baseline.toll?.amount ?? null,
      consumptionKmPerLiter: vehicle.consumption,
    };

    return props.routes
      .filter(route => route.id !== baseline.id)
      .map(route => {
        const input = {
          distanceKm: route.distanceMeters != null ? route.distanceMeters / 1000 : null,
          tollAmount: route.toll?.amount ?? null,
          consumptionKmPerLiter: vehicle.consumption,
        };
        const baseCost = routeCostAtFuelPrice(baseInput, fuelPrice);
        const cost = routeCostAtFuelPrice(input, fuelPrice);
        const delta = baseCost != null && cost != null ? cost - baseCost : null;
        const breakEven = calculateFuelBreakEvenPrice(baseInput, input);
        return { route, cost, delta, breakEven };
      });
  }, [baseline, props.routes, vehicle, fuelPrice]);

  const saveSimulatedPrice = (value: number) => {
    const next = Math.min(12, Math.max(2, value));
    setFuelPrice(next);
    try { localStorage.setItem(PRICE_KEY, String(next)); } catch {}
  };

  if (!baseline || rows.length === 0) return null;

  return (
    <section className="mt-4 rounded-3xl border border-[#C7FF3C]/15 bg-[#10191F] p-4 text-white sm:p-5" aria-labelledby="route-sensitivity-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#C7FF3C]">Sensibilidade da rota</p>
          <h3 id="route-sensitivity-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.045em]">Teste a decisão antes de sair.</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">Simule outro preço do combustível e veja como a diferença de custo muda. Quando for calculável, o ponto de equilíbrio indica o preço por litro em que os dois custos se igualam.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50"><CarFront className="size-3.5 text-[#3DE3FF]" /> {vehicle.name || "Meu veículo"}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="route-sensitivity-price" className="text-[0.58rem] font-black uppercase tracking-[.1em] text-white/45">Preço simulado do combustível</label>
          <output htmlFor="route-sensitivity-price" className="rounded-full bg-[#C7FF3C]/10 px-2.5 py-1 text-xs font-black text-[#DFFF9D]">{money(fuelPrice)} / L</output>
        </div>
        <input
          id="route-sensitivity-price"
          type="range"
          min="2"
          max="12"
          step="0.1"
          value={fuelPrice}
          onChange={event => saveSimulatedPrice(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer accent-[#C7FF3C]"
          aria-describedby="route-sensitivity-help"
        />
        <div className="mt-2 flex justify-between text-[0.5rem] font-bold text-white/25"><span>R$ 2/L</span><span>R$ 12/L</span></div>
        <p id="route-sensitivity-help" className="mt-2 text-[0.53rem] leading-relaxed text-white/35">É uma simulação local. O valor não representa cotação automática do posto.</p>
      </div>

      <div className="mt-3 grid gap-2">
        {rows.map(({ route, cost, delta, breakEven }) => (
          <article key={route.id} className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold">{routeLabel(route.id)}</p>
                <p className="mt-1 text-[0.56rem] text-white/35">{route.distanceMeters != null ? (route.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km" : "distância indisponível"} · pedágio {route.toll?.amount != null ? money(route.toll.amount) : "não informado"}</p>
              </div>
              <Scale className="size-4 text-[#BDA5FF]" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white/[.035] p-2.5">
                <Fuel className="size-3.5 text-[#C7FF3C]" />
                <p className="mt-1 text-[0.48rem] font-black uppercase text-white/30">Custo simulado</p>
                <p className="mt-1 text-xs font-black">{cost == null ? "incompleto" : money(cost)}</p>
              </div>
              <div className="rounded-xl bg-white/[.035] p-2.5">
                <Gauge className="size-3.5 text-[#3DE3FF]" />
                <p className="mt-1 text-[0.48rem] font-black uppercase text-white/30">vs selecionada</p>
                <p className="mt-1 text-xs font-black">{delta == null ? "—" : delta > 0 ? "+" + money(delta) : delta < 0 ? "−" + money(Math.abs(delta)) : "igual"}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-[#BDA5FF]/12 bg-[#BDA5FF]/[.03] p-2.5 sm:col-span-1">
                <Scale className="size-3.5 text-[#BDA5FF]" />
                <p className="mt-1 text-[0.48rem] font-black uppercase text-white/30">Ponto de equilíbrio</p>
                <p className="mt-1 text-xs font-black">{breakEven == null ? "não calculável" : money(breakEven) + "/L"}</p>
              </div>
            </div>

            <p className="mt-2 text-[0.53rem] leading-relaxed text-white/35">
              {breakEven != null
                ? delta == null
                  ? "O custo relativo não pôde ser calculado com os dados disponíveis."
                  : delta < 0
                    ? "Neste preço simulado, esta alternativa custa menos que a rota selecionada."
                    : delta > 0
                      ? "Neste preço simulado, esta alternativa custa mais que a rota selecionada."
                      : "Neste preço simulado, os custos ficam iguais."
                : "Sem pedágio conhecido nos dois lados ou sem diferença suficiente de distância, o ponto de equilíbrio não é calculável."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
