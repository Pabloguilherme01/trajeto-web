import React from "react";
import { Fuel, Gauge, Route as RouteIcon, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";
import { calculateFuelStatus, compareMonthlyBudget, compareTripScenarios, projectTripCosts } from "@/lib/tripProjection";
import { clearTripCalculatorDraft, loadTripCalculatorDraft, saveTripCalculatorDraft } from "@/lib/tripCalculatorDraft";
import { getTripCalculatorMode, TRIP_CALCULATOR_MODES, type TripCalculatorModeId } from "@/lib/tripCalculatorModes";

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function nonNegativeValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
  } catch {
    return "";
  }
}

function rememberPrice(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  try {
    localStorage.setItem(PRICE_KEY, value);
  } catch {}
}

export default function LocalRouteCalculator({ initialDistanceKm = 0, compact = false }: LocalRouteCalculatorProps) {
  const savedVehicle = getMobileVehicle();
  const [draft] = useState(() => loadTripCalculatorDraft());
  const [restoredDraft, setRestoredDraft] = useState(() => Boolean(draft));
  const [activeMode, setActiveMode] = useState<TripCalculatorModeId | "personalizado">("automatico");
  const [distance, setDistance] = useState(initialDistanceKm > 0 ? String(initialDistanceKm) : (draft?.distance ?? ""));
  const [price, setPrice] = useState(() => draft?.price || getRememberedPrice());
  const [consumption, setConsumption] = useState(savedVehicle ? String(savedVehicle.consumption) : (draft?.consumption ?? ""));
  const [tank, setTank] = useState(savedVehicle ? String(savedVehicle.tank) : (draft?.tank ?? ""));
  const [currentFuel, setCurrentFuel] = useState(draft?.currentFuel ?? "");
  const [roundTrip, setRoundTrip] = useState(draft?.roundTrip ?? (initialDistanceKm > 0 ? false : true));
  const [tripsPerWeek, setTripsPerWeek] = useState(draft?.tripsPerWeek ?? (initialDistanceKm > 0 ? 1 : 5));
  const [toll, setToll] = useState(draft?.toll ?? "");
  const [parking, setParking] = useState(draft?.parking ?? "");
  const [other, setOther] = useState(draft?.other ?? "");
  const [alternativePrice, setAlternativePrice] = useState(draft?.alternativePrice ?? "");
  const [alternativeConsumption, setAlternativeConsumption] = useState(draft?.alternativeConsumption ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(draft?.monthlyBudget ?? "");

  useEffect(() => {
    if (initialDistanceKm > 0) setDistance(String(initialDistanceKm));
  }, [initialDistanceKm]);

  useEffect(() => {
    saveTripCalculatorDraft({
      distance,
      price,
      consumption,
      tank,
      currentFuel,
      roundTrip,
      tripsPerWeek,
      toll,
      parking,
      other,
      alternativePrice,
      alternativeConsumption,
      monthlyBudget,
    });
  }, [distance, price, consumption, tank, currentFuel, roundTrip, tripsPerWeek, toll, parking, other, alternativePrice, alternativeConsumption, monthlyBudget]);

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

  const applyMode = (modeId: TripCalculatorModeId) => {
    const mode = getTripCalculatorMode(modeId);
    setActiveMode(modeId);
    setRestoredDraft(false);

    if (modeId === "automatico") {
      if (initialDistanceKm > 0) {
        setDistance(String(initialDistanceKm));
        setRoundTrip(false);
        setTripsPerWeek(1);
      }
      const rememberedPrice = getRememberedPrice();
      if (rememberedPrice) setPrice(current => current || rememberedPrice);
      const vehicle = getMobileVehicle();
      if (vehicle) {
        setConsumption(current => current || String(vehicle.consumption));
        setTank(current => current || String(vehicle.tank));
      }
      return;
    }

    if (typeof mode.roundTrip === "boolean") setRoundTrip(mode.roundTrip);
    if (typeof mode.tripsPerWeek === "number") setTripsPerWeek(mode.tripsPerWeek);
  };

  const resetScenario = () => {
    clearTripCalculatorDraft();
    setRestoredDraft(false);
    setActiveMode("automatico");
    setDistance(initialDistanceKm > 0 ? String(initialDistanceKm) : "");
    setPrice("");
    setConsumption(savedVehicle ? String(savedVehicle.consumption) : "");
    setTank(savedVehicle ? String(savedVehicle.tank) : "");
    setCurrentFuel("");
    setRoundTrip(initialDistanceKm > 0 ? false : true);
    setTripsPerWeek(initialDistanceKm > 0 ? 1 : 5);
    setToll("");
    setParking("");
    setOther("");
    setAlternativePrice("");
    setAlternativeConsumption("");
    setMonthlyBudget("");
  };

  const autoSignals = useMemo(() => {
    const signals: string[] = [];
    if (initialDistanceKm > 0) signals.push("distância da rota");
    if (savedVehicle) signals.push("veículo salvo");
    if (getRememberedPrice()) signals.push("último preço");
    return signals;
  }, [initialDistanceKm, savedVehicle]);

  const values = useMemo(() => {
    const oneWayDistanceKm = numberValue(distance);
    const pricePerLiter = numberValue(price);
    const kmPerLiter = numberValue(consumption);
    const tankLiters = numberValue(tank);
    const currentFuelLiters = nonNegativeValue(currentFuel);
    const currentFuelProvided = currentFuel.trim().length > 0;
    const extraCostPerTrip = numberValue(toll) + numberValue(parking) + numberValue(other);
    if (!oneWayDistanceKm || !pricePerLiter || !kmPerLiter) return null;

    const litersOneWay = oneWayDistanceKm / kmPerLiter;
    const oneWayCost = litersOneWay * pricePerLiter;
    const projection = projectTripCosts({ oneWayDistanceKm, oneWayCost, roundTrip, tripsPerWeek, extraCostPerTrip });
    const autonomyKm = tankLiters ? tankLiters * kmPerLiter : 0;
    const fuelNeeded = projection.distanceKm / kmPerLiter;
    const estimatedRefuels = autonomyKm > 0 ? Math.max(0, Math.ceil(fuelNeeded / tankLiters) - 1) : null;
    const fuelStatus = currentFuelProvided && tankLiters > 0
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
    const budgetStatus = compareMonthlyBudget(projection.monthlyCost, numberValue(monthlyBudget));

    return { projection, fuelNeeded, autonomyKm, estimatedRefuels, fuelStatus, comparison, budgetStatus };
  }, [distance, price, consumption, tank, currentFuel, toll, parking, other, alternativePrice, alternativeConsumption, monthlyBudget, roundTrip, tripsPerWeek]);

  return (
    <section
      className={compact
        ? "rounded-2xl border border-[#D7DFD8] bg-[#F8FAF7] p-4"
        : "mt-8 rounded-3xl border border-[#C7D2C9] bg-white p-5 shadow-sm sm:p-7"}
      aria-labelledby="local-calculator-title"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF4EC] text-[#356451]">
          <WalletCards className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#356451]">Calculadora inteligente · local</p>
          <h2 id="local-calculator-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">
            Quanto custa ir?
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#607570]">
            Escolha um modo pronto e informe só o essencial. O resultado muda automaticamente enquanto você digita.
          </p>
        </div>
        <button
          type="button"
          onClick={resetScenario}
          className="min-h-10 shrink-0 rounded-xl border border-[#C7D2C9] px-3 text-[0.62rem] font-extrabold text-[#365E51] hover:border-[#163840]"
        >
          Limpar cálculo
        </button>
      </div>

      {restoredDraft && (
        <p role="status" className="mt-3 rounded-xl border border-[#D7DFD8] bg-white px-3 py-2 text-[0.65rem] font-bold text-[#56766A]">
          Seu último cálculo foi restaurado neste aparelho.
        </p>
      )}

      <div className="mt-5 rounded-2xl border border-[#D7DFD8] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#356451]">1 · Escolha o jeito de usar</p>
            <p className="mt-1 text-[0.68rem] text-[#71877E]">Os modos só ajustam ida/volta e frequência; seus preços não são inventados.</p>
          </div>
          {activeMode === "personalizado" && (
            <span className="rounded-full bg-[#FFF7DF] px-2.5 py-1 text-[0.6rem] font-black text-[#6D5200]">Personalizado</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TRIP_CALCULATOR_MODES.map(mode => {
            const selected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => applyMode(mode.id)}
                aria-pressed={selected}
                className={`min-h-[4.6rem] rounded-xl border p-3 text-left transition ${selected ? "border-[#163840] bg-[#163840] text-white" : "border-[#D7DFD8] bg-[#F8FAF7] text-[#365E51] hover:border-[#A7CDBA]"}`}
              >
                <span className="block text-xs font-black leading-tight">{mode.label}</span>
                <span className={`mt-1 block text-[0.58rem] leading-snug ${selected ? "text-white/65" : "text-[#71877E]"}`}>{mode.detail}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 rounded-xl bg-[#EAF4EC] px-3 py-2 text-[0.65rem] font-bold leading-relaxed text-[#426C4F]">
          {autoSignals.length
            ? "Automação disponível: " + autoSignals.join(" · ") + "."
            : "Sem dados salvos ainda. Informe os 3 campos abaixo e o Trajeto passa a reaproveitar o que puder neste aparelho."}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#356451]">2 · Só o essencial</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold text-[#365E51]">
            Distância de ida
            <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-[#A7CDBA] bg-white px-3 focus-within:border-[#163840]">
              <input value={distance} onChange={e => setDistance(e.target.value)} inputMode="decimal" placeholder="35" className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#163840] outline-none" />
              <span className="text-xs font-bold text-[#71877E]">km</span>
            </div>
          </label>
          <label className="text-xs font-bold text-[#365E51]">
            Combustível
            <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-[#A7CDBA] bg-white px-3 focus-within:border-[#163840]">
              <span className="mr-1 text-xs font-bold text-[#71877E]">R$</span>
              <input value={price} onChange={e => setPrice(e.target.value)} onBlur={() => rememberPrice(price)} inputMode="decimal" placeholder="5,89" aria-describedby="local-calculator-note" className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#163840] outline-none" />
              <span className="text-xs font-bold text-[#71877E]">/L</span>
            </div>
          </label>
          <label className="text-xs font-bold text-[#365E51]">
            Consumo do veículo
            <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-[#A7CDBA] bg-white px-3 focus-within:border-[#163840]">
              <input value={consumption} onChange={e => setConsumption(e.target.value)} inputMode="decimal" placeholder="10,5" className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#163840] outline-none" />
              <span className="text-xs font-bold text-[#71877E]">km/L</span>
            </div>
          </label>
        </div>
      </div>

      {values ? (
        <div className="mt-4">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#356451]">3 · Resultado instantâneo</p>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
            <div className="col-span-2 rounded-xl bg-[#163840] p-4 text-white lg:col-span-1">
              <RouteIcon className="size-4 text-[#FFC928]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/60">Esta viagem</p>
              <p className="mt-1 text-xl font-black">{values.projection.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className="mt-1 text-[0.58rem] text-white/55">{values.projection.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km no modo escolhido</p>
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4">
              <Fuel className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Combustível</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{values.fuelNeeded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">{values.projection.fuelCostPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4">
              <WalletCards className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Por mês</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{values.projection.monthlyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">{tripsPerWeek} viagem(ns)/semana</p>
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4">
              <RouteIcon className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Por km</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{values.projection.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">combustível + extras</p>
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-4">
              <Gauge className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Autonomia cheia</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{values.autonomyKm ? values.autonomyKm.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " km" : "Opcional"}</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">informe o tanque nos ajustes</p>
            </div>
          </div>

          {values.fuelStatus && (
            <div id="fuel-status-note" className={`mt-3 rounded-xl border p-4 ${values.fuelStatus.canCompleteTrip ? "border-[#B7D8C1] bg-[#F0F8F2]" : "border-[#E7B0A0] bg-[#FFF4F0]"}`}>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Combustível atual</p>
              {values.fuelStatus.canCompleteTrip ? (
                <>
                  <p className="mt-1 text-sm font-extrabold text-[#163840]">Você consegue concluir esta viagem com o combustível informado.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5F746E]">
                    Deve restar cerca de <strong>{values.fuelStatus.fuelRemainingAfterTrip.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</strong>, equivalentes a <strong>{values.fuelStatus.rangeRemainingAfterTripKm.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-extrabold text-[#8A4434]">Abasteça pelo menos {values.fuelStatus.fuelShortfallLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L antes de sair.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7A5148]">
                    Custo mínimo estimado para completar a viagem: <strong>{values.fuelStatus.minimumFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>.
                  </p>
                </>
              )}
              <p className="mt-2 text-[0.62rem] text-[#71877E]">
                Para encher o tanque: {values.fuelStatus.fuelNeededToFill.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L · {values.fuelStatus.fillCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.
              </p>
            </div>
          )}

          {values.budgetStatus && (
            <div className={"mt-2 rounded-xl border px-4 py-3 " + (values.budgetStatus.difference >= 0 ? "border-[#B7D8C1] bg-[#F0F8F2]" : "border-[#E7B0A0] bg-[#FFF4F0]")} role="status">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#56766A]">Orçamento mensal</p>
              <p className={"mt-1 text-sm font-black " + (values.budgetStatus.difference >= 0 ? "text-[#356451]" : "text-[#8A4434]")}>
                {values.budgetStatus.difference >= 0
                  ? "Cabe no orçamento: sobra " + values.budgetStatus.difference.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "."
                  : "Ultrapassa o orçamento em " + Math.abs(values.budgetStatus.difference).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "."}
              </p>
            </div>
          )}

          {values.estimatedRefuels != null && values.estimatedRefuels > 0 && (
            <p role="status" className="mt-3 rounded-xl border border-[#E5C98A] bg-[#FFF7DF] px-3 py-2 text-xs font-bold text-[#6D5200]">
              Pela autonomia de tanque informada, esta viagem pode exigir aproximadamente {values.estimatedRefuels} parada(s) adicional(is) para abastecer.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[#C7D2C9] bg-white px-3 py-3 text-xs font-semibold text-[#71877E]">
          Informe distância, preço e consumo. Assim que os 3 dados estiverem válidos, o resultado aparece automaticamente.
        </p>
      )}

      <details className="mt-4 rounded-2xl border border-[#D7DFD8] bg-white p-4">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-[#163840]">
          <span>Ajustes avançados</span>
          <span className="text-[0.6rem] font-bold text-[#71877E]">tanque · extras · orçamento · comparação</span>
        </summary>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#365E51]">
            Tanque (L)
            <input value={tank} onChange={e => setTank(e.target.value)} inputMode="decimal" placeholder="Ex.: 45" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
          <label className="text-xs font-bold text-[#365E51]">
            Combustível atual (L)
            <input value={currentFuel} onChange={e => setCurrentFuel(e.target.value)} inputMode="decimal" placeholder="Ex.: 18 ou 0" aria-describedby="fuel-status-note" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">
            Pedágio por viagem
            <input value={toll} onChange={e => setToll(e.target.value)} inputMode="decimal" placeholder="R$ 8,50" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">
            Estacionamento
            <input value={parking} onChange={e => setParking(e.target.value)} inputMode="decimal" placeholder="R$ 10" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">
            Outros custos
            <input value={other} onChange={e => setOther(e.target.value)} inputMode="decimal" placeholder="R$ 5" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Tipo de viagem</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setRoundTrip(false); setActiveMode("personalizado"); }} aria-pressed={!roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${!roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Só ida</button>
              <button type="button" onClick={() => { setRoundTrip(true); setActiveMode("personalizado"); }} aria-pressed={roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Ida e volta</button>
            </div>
          </div>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">
            Viagens por semana
            <input type="number" min="0" max="21" step="1" value={tripsPerWeek} onChange={e => { setTripsPerWeek(Math.max(0, Math.min(21, Number(e.target.value) || 0))); setActiveMode("personalizado"); }} className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51] sm:col-span-2">
            Orçamento mensal de deslocamento
            <input value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} inputMode="decimal" placeholder="Ex.: 800" className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3">
          <p className="text-xs font-extrabold text-[#163840]">Comparar outro combustível ou veículo</p>
          <p className="mt-1 text-[0.62rem] leading-relaxed text-[#71877E]">O percurso e os extras permanecem iguais; você troca apenas preço e consumo.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#365E51]">
              Segundo preço (R$/L)
              <input value={alternativePrice} onChange={e => setAlternativePrice(e.target.value)} inputMode="decimal" placeholder="Ex.: 5,49" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
            </label>
            <label className="text-xs font-bold text-[#365E51]">
              Segundo consumo (km/L)
              <input value={alternativeConsumption} onChange={e => setAlternativeConsumption(e.target.value)} inputMode="decimal" placeholder="Ex.: 8,5" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
            </label>
          </div>

          {values?.comparison && (
            <div className="mt-3 rounded-xl border border-[#C7D2C9] bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Atual</p>
                  <p className="mt-1 text-lg font-black text-[#163840]">{values.comparison.baseline.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
                <div>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Segundo</p>
                  <p className="mt-1 text-lg font-black text-[#163840]">{values.comparison.alternative.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-[#EAF4EC] px-3 py-2 text-xs font-extrabold text-[#356451]">
                {values.comparison.differencePerTrip >= 0
                  ? `O segundo cenário economiza ${values.comparison.differencePerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por viagem e ${values.comparison.differencePerMonth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês.`
                  : `O segundo cenário custa ${Math.abs(values.comparison.differencePerTrip).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a mais por viagem e ${Math.abs(values.comparison.differencePerMonth).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês.`}
              </p>
            </div>
          )}
        </div>
      </details>

      {values && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#D7DFD8] bg-white px-4 py-3 text-xs font-bold text-[#56766A]">
            Por semana: {values.projection.weeklyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div className="rounded-xl border border-[#D7DFD8] bg-white px-4 py-3 text-xs font-bold text-[#56766A]">
            Por ano: {values.projection.annualCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      )}

      <p id="local-calculator-note" className="mt-3 text-[0.62rem] leading-relaxed text-[#71877E]">
        Cálculo local baseado somente nos valores informados. O Trajeto pode reaproveitar neste aparelho a distância da rota, o veículo salvo e o último preço digitado. O custo mensal usa 4,33 semanas por mês e não representa preço atual de posto.
      </p>
    </section>
  );
}
