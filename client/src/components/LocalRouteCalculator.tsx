import { Fuel, Gauge, Route as RouteIcon, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";
import { calculateFuelStatus, compareTripScenarios, projectTripCosts } from "@/lib/tripProjection";

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export type LocalRouteCalculatorProps = {
  initialDistanceKm?: number;
  compact?: boolean;
};

const PRICE_KEY = "trajeto-last-fuel-price";

function getRememberedPrice() {
  if (typeof window === "undefined") return "";
  try {
    const value = localStorage.getItem(PRICE_KEY) || "";
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? value : "";
  } catch { return ""; }
}

function rememberPrice(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  try { localStorage.setItem(PRICE_KEY, value); } catch {}
}

export default function LocalRouteCalculator({ initialDistanceKm = 0, compact = false }: LocalRouteCalculatorProps) {
  const savedVehicle = getMobileVehicle();
  const [distance, setDistance] = useState(initialDistanceKm > 0 ? String(initialDistanceKm) : "");
  const [price, setPrice] = useState(getRememberedPrice);
  const [consumption, setConsumption] = useState(savedVehicle ? String(savedVehicle.consumption) : "");
  const [tank, setTank] = useState(savedVehicle ? String(savedVehicle.tank) : "");
  const [currentFuel, setCurrentFuel] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [tripsPerWeek, setTripsPerWeek] = useState(5);
  const [toll, setToll] = useState("");
  const [parking, setParking] = useState("");
  const [other, setOther] = useState("");
  const [alternativePrice, setAlternativePrice] = useState("");
  const [alternativeConsumption, setAlternativeConsumption] = useState("");

  useEffect(() => {
    const refreshVehicle = () => {
      const vehicle = getMobileVehicle();
      if (!vehicle) return;
      setConsumption(current => current || String(vehicle.consumption));
      setTank(current => current || String(vehicle.tank));
    };
    window.addEventListener(mobileVehicleEvent, refreshVehicle);
    return () => window.removeEventListener(mobileVehicleEvent, refreshVehicle);
  }, []);

  const values = useMemo(() => {
    const oneWayDistanceKm = numberValue(distance);
    const pricePerLiter = numberValue(price);
    const kmPerLiter = numberValue(consumption);
    const tankLiters = numberValue(tank);
    const currentFuelLiters = numberValue(currentFuel);
    const extraCostPerTrip = numberValue(toll) + numberValue(parking) + numberValue(other);
    if (!oneWayDistanceKm || !pricePerLiter || !kmPerLiter) return null;

    const litersOneWay = oneWayDistanceKm / kmPerLiter;
    const oneWayCost = litersOneWay * pricePerLiter;
    const projection = projectTripCosts({ oneWayDistanceKm, oneWayCost, roundTrip, tripsPerWeek, extraCostPerTrip });
    const autonomyKm = tankLiters ? tankLiters * kmPerLiter : 0;
    const fuelNeeded = projection.distanceKm / kmPerLiter;
    const estimatedRefuels = autonomyKm > 0 ? Math.max(0, Math.ceil(fuelNeeded / autonomyKm) - 1) : null;
    const fuelStatus = currentFuelLiters > 0
      ? calculateFuelStatus({ tankLiters, currentFuelLiters, pricePerLiter, kmPerLiter, tripDistanceKm: projection.distanceKm })
      : null;
    const comparison = compareTripScenarios({
      oneWayDistanceKm,
      baselinePricePerLiter: pricePerLiter,
      baselineKmPerLiter: kmPerLiter,
      alternativePricePerLiter: numberValue(alternativePrice),
      alternativeKmPerLiter: numberValue(alternativeConsumption),
      roundTrip,
      tripsPerWeek,
      extraCostPerTrip,
    });

    return { projection, fuelNeeded, autonomyKm, estimatedRefuels, fuelStatus, comparison };
  }, [distance, price, consumption, tank, currentFuel, toll, parking, other, alternativePrice, alternativeConsumption, roundTrip, tripsPerWeek]);

  return (
    <section className={compact
      ? "rounded-2xl border border-[#D7DFD8] bg-[#F8FAF7] p-4"
      : "mt-8 rounded-3xl border border-[#C7D2C9] bg-white p-5 shadow-sm sm:p-7"
    } aria-labelledby="local-calculator-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF4EC] text-[#356451]">
          <WalletCards className="size-5" />
        </div>
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#356451]">Funciona sem conta</p>
          <h2 id="local-calculator-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">Calcule o custo da viagem.</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#607570]">Use a distância da rota. O cálculo é local e não depende do servidor, mapa ou preço automático.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-bold text-[#365E51]">Distância de ida (km)
          <input value={distance} onChange={e => setDistance(e.target.value)} inputMode="decimal" placeholder="Ex.: 35" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
        <label className="text-xs font-bold text-[#365E51]">Preço (R$/L)
          <input value={price} onChange={e => setPrice(e.target.value)} onBlur={() => rememberPrice(price)} inputMode="decimal" placeholder="Ex.: 5,89" aria-describedby="local-calculator-note" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
        <label className="text-xs font-bold text-[#365E51]">Consumo (km/L)
          <input value={consumption} onChange={e => setConsumption(e.target.value)} inputMode="decimal" placeholder="Ex.: 10,5" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
        <label className="text-xs font-bold text-[#365E51]">Tanque (L, opcional)
          <input value={tank} onChange={e => setTank(e.target.value)} inputMode="decimal" placeholder="Ex.: 45" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
        <label className="text-xs font-bold text-[#365E51]">Combustível atual (L, opcional)
          <input value={currentFuel} onChange={e => setCurrentFuel(e.target.value)} inputMode="decimal" placeholder="Ex.: 18" aria-describedby="fuel-status-note" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">Pedágio por viagem (R$)<input value={toll} onChange={e => setToll(e.target.value)} inputMode="decimal" placeholder="Ex.: 8,50" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" /></label><label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">Estacionamento por viagem (R$)<input value={parking} onChange={e => setParking(e.target.value)} inputMode="decimal" placeholder="Ex.: 10" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" /></label><label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">Outros custos por viagem (R$)<input value={other} onChange={e => setOther(e.target.value)} inputMode="decimal" placeholder="Ex.: 5" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" /></label><div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 sm:col-span-2 lg:col-span-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Tipo de viagem</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRoundTrip(false)} aria-pressed={!roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${!roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Só ida</button>
            <button type="button" onClick={() => setRoundTrip(true)} aria-pressed={roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Ida e volta</button>
          </div>
        </div>
        <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">Viagens por semana
          <input type="number" min="0" max="21" step="1" value={tripsPerWeek} onChange={e => setTripsPerWeek(Math.max(0, Math.min(21, Number(e.target.value) || 0)))} className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
        </label>
      </div>

      {values ? (
        <div className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-[#163840] p-4 text-white"><RouteIcon className="size-4 text-[#FFC928]" /><p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/60">Total por viagem</p><p className="mt-1 text-xl font-black">{values.projection.costPerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p><p className="mt-1 text-[0.58rem] text-white/55">combustível + extras</p></div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4"><Fuel className="size-4 text-[#356451]" /><p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Combustível</p><p className="mt-1 text-xl font-black text-[#163840]">{values.fuelNeeded.toLocaleString("pt-BR",{maximumFractionDigits:1})} L</p><p className="mt-1 text-[0.58rem] text-[#71877E]">{values.projection.fuelCostPerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4"><WalletCards className="size-4 text-[#356451]" /><p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Por mês</p><p className="mt-1 text-xl font-black text-[#163840]">{values.projection.monthlyCost.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4"><Gauge className="size-4 text-[#356451]" /><p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Autonomia</p><p className="mt-1 text-xl font-black text-[#163840]">{values.autonomyKm ? values.autonomyKm.toLocaleString("pt-BR",{maximumFractionDigits:0}) + " km" : "Informe o tanque"}</p></div><div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-4"><RouteIcon className="size-4 text-[#356451]" /><p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Custo por km</p><p className="mt-1 text-xl font-black text-[#163840]">{values.projection.costPerKm.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-[0.58rem] text-[#71877E]">combustível + extras</p></div>
          </div>
          {values.fuelStatus && (
            <div id="fuel-status-note" className={`mt-3 rounded-xl border p-4 ${values.fuelStatus.canCompleteTrip ? "border-[#B7D8C1] bg-[#F0F8F2]" : "border-[#E7B0A0] bg-[#FFF4F0]"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Abastecimento</p>
                  <p className="mt-1 text-sm font-extrabold text-[#163840]">{values.fuelStatus.canCompleteTrip ? "O combustível atual cobre esta viagem." : "O combustível atual não cobre esta viagem."}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5F746E]">Autonomia atual: <strong>{values.fuelStatus.currentRangeKm.toLocaleString("pt-BR")} km</strong> · viagem: <strong>{values.fuelStatus.tripFuelNeeded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</strong>.</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Para completar</p>
                  <p className="mt-1 text-lg font-black text-[#163840]">{values.fuelStatus.fuelNeededToFill.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</p>
                  <p className="text-xs font-bold text-[#5F746E]">{values.fuelStatus.fillCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              </div>
              {values.fuelStatus.canCompleteTrip
                ? <p className="mt-3 text-xs font-bold text-[#426C4F]">Estimativa após a viagem: {values.fuelStatus.fuelRemainingAfterTrip.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L · {values.fuelStatus.rangeRemainingAfterTripKm.toLocaleString("pt-BR")} km de autonomia.</p>
                : <p className="mt-3 text-xs font-bold text-[#8A4434]">Faltariam aproximadamente {Math.abs(values.fuelStatus.fuelRemainingAfterTrip).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L para concluir a viagem.</p>}
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-[#D7DFD8] bg-white px-4 py-3 text-xs font-bold text-[#56766A]">Por semana: {values.projection.weeklyCost.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div><div className="rounded-xl border border-[#D7DFD8] bg-white px-4 py-3 text-xs font-bold text-[#56766A]">Por ano: {values.projection.annualCost.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div></div>
          {values.projection.extraCostPerTrip > 0 && <p className="mt-3 rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#56766A]">Extras por viagem: {values.projection.extraCostPerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}. Eles entram no total e nas projeções recorrentes.</p>}
          <details className="mt-4 rounded-2xl border border-[#D7DFD8] bg-[#F8FAF7] p-4">
            <summary className="cursor-pointer text-xs font-extrabold text-[#163840]">Comparar outro cenário</summary>
            <p className="mt-2 text-[0.62rem] leading-relaxed text-[#71877E]">Compare outro preço e consumo, por exemplo gasolina × etanol ou dois veículos. Os custos extras da viagem são mantidos iguais nos dois cenários.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#365E51]">Preço do segundo cenário (R$/L)
                <input value={alternativePrice} onChange={e => setAlternativePrice(e.target.value)} inputMode="decimal" placeholder="Ex.: 5,49" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
              </label>
              <label className="text-xs font-bold text-[#365E51]">Consumo do segundo cenário (km/L)
                <input value={alternativeConsumption} onChange={e => setAlternativeConsumption(e.target.value)} inputMode="decimal" placeholder="Ex.: 8,5" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
              </label>
            </div>
            {values.comparison && (
              <div className="mt-4 rounded-xl border border-[#C7D2C9] bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Cenário atual</p>
                    <p className="mt-1 text-lg font-black text-[#163840]">{values.comparison.baseline.costPerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}<span className="ml-1 text-[0.6rem] font-bold text-[#71877E]">/viagem</span></p>
                  </div>
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Segundo cenário</p>
                    <p className="mt-1 text-lg font-black text-[#163840]">{values.comparison.alternative.costPerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}<span className="ml-1 text-[0.6rem] font-bold text-[#71877E]">/viagem</span></p>
                  </div>
                </div>
                <p className="mt-3 rounded-lg bg-[#EAF4EC] px-3 py-2 text-xs font-extrabold text-[#356451]">
                  {values.comparison.differencePerTrip >= 0
                    ? `O segundo cenário economiza ${values.comparison.differencePerTrip.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} por viagem e ${values.comparison.differencePerMonth.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/mês.`
                    : `O segundo cenário custa ${Math.abs(values.comparison.differencePerTrip).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} a mais por viagem e ${Math.abs(values.comparison.differencePerMonth).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/mês.`}
                </p>
                <p className="mt-2 text-[0.62rem] leading-relaxed text-[#71877E]">Diferença anual: {Math.abs(values.comparison.differencePerYear).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}. Valores calculados somente com os dados informados.</p>
              </div>
            )}
          </details>
          {values.estimatedRefuels != null && values.estimatedRefuels > 0 && (
            <p role="status" className="mt-3 rounded-xl border border-[#E5C98A] bg-[#FFF7DF] px-3 py-2 text-xs font-bold text-[#6D5200]">Para esta distância e autonomia informadas, o cálculo indica aproximadamente {values.estimatedRefuels} parada(s) de abastecimento.</p>
          )}
          <p id="local-calculator-note" className="mt-3 text-[0.62rem] leading-relaxed text-[#71877E]">Estimativa baseada exclusivamente nos valores informados. Pedágios, estacionamento e outros custos são opcionais e considerados por viagem. O cálculo lembra neste aparelho o último preço informado e pode aproveitar o veículo salvo. O custo mensal usa 4,33 semanas por mês e não representa preço atual de posto.</p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[#C7D2C9] bg-[#F8FAF7] px-3 py-3 text-xs font-semibold text-[#71877E]">Preencha distância, preço e consumo para calcular. Nenhum valor é inventado pelo Trajeto.</p>
      )}
    </section>
  );
}
