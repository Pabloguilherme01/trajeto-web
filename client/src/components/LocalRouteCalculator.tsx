import React from "react";
import { Fuel, Gauge, Route as RouteIcon, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";
import { calculateFuelStatus, compareEthanolGasoline, compareMonthlyBudget, compareTripScenarios, fuelLitersFromTankFraction, projectTripCosts } from "@/lib/tripProjection";
import { clearTripCalculatorDraft, loadTripCalculatorDraft, saveTripCalculatorDraft } from "@/lib/tripCalculatorDraft";
import { getTripCalculatorMode, isRecurringTripMode, isTripCalculatorModeSelection, TRIP_CALCULATOR_MODES, type TripCalculatorModeId, type TripCalculatorModeSelection } from "@/lib/tripCalculatorModes";

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function optionalNonNegativeValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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

function clearRememberedPrice() {
  try {
    localStorage.removeItem(PRICE_KEY);
  } catch {}
}

export default function LocalRouteCalculator({ initialDistanceKm, compact = false }: LocalRouteCalculatorProps) {
  const [savedVehicle, setSavedVehicle] = useState(() => getMobileVehicle());
  const [draft] = useState(() => loadTripCalculatorDraft());
  const restoredMode: TripCalculatorModeSelection = isTripCalculatorModeSelection(draft?.mode) ? draft.mode : "automatico";
  const [restoredDraft, setRestoredDraft] = useState(() => Boolean(draft));
  const [activeMode, setActiveMode] = useState<TripCalculatorModeSelection>(restoredMode);
  const [distance, setDistance] = useState(typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0 ? String(Number(initialDistanceKm.toFixed(3))) : (draft?.distance ?? ""));
  const [rememberedPrice, setRememberedPrice] = useState(() => getRememberedPrice());
  const [price, setPrice] = useState(() => draft?.price || rememberedPrice);
  const [consumption, setConsumption] = useState(draft?.consumption || (savedVehicle ? String(savedVehicle.consumption) : ""));
  const [tank, setTank] = useState(draft?.tank || (savedVehicle ? String(savedVehicle.tank) : ""));
  const [currentFuel, setCurrentFuel] = useState(draft?.currentFuel ?? "");
  const [roundTrip, setRoundTrip] = useState(draft?.roundTrip ?? false);
  const [tripsPerWeek, setTripsPerWeek] = useState(draft?.tripsPerWeek ?? 1);
  const [recurring, setRecurring] = useState(() => typeof draft?.recurring === "boolean" ? draft.recurring : isRecurringTripMode(restoredMode));
  const [toll, setToll] = useState(draft?.toll ?? "");
  const [parking, setParking] = useState(draft?.parking ?? "");
  const [other, setOther] = useState(draft?.other ?? "");
  const [alternativePrice, setAlternativePrice] = useState(draft?.alternativePrice ?? "");
  const [alternativeConsumption, setAlternativeConsumption] = useState(draft?.alternativeConsumption ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(draft?.monthlyBudget ?? "");

  useEffect(() => {
    if (initialDistanceKm === undefined) return;
    const nextDistance = Number.isFinite(initialDistanceKm) && initialDistanceKm > 0
      ? String(Number(initialDistanceKm.toFixed(3)))
      : "";
    setDistance(nextDistance);
    if (!nextDistance) return;
    setActiveMode("automatico");
    setRecurring(false);
    setRoundTrip(false);
    setTripsPerWeek(1);
    setRestoredDraft(false);
  }, [initialDistanceKm]);

  useEffect(() => {
    const hasMeaningfulDraft = Boolean(
      (initialDistanceKm === undefined && distance.trim()) ||
      price.trim() ||
      currentFuel.trim() ||
      toll.trim() ||
      parking.trim() ||
      other.trim() ||
      alternativePrice.trim() ||
      alternativeConsumption.trim() ||
      monthlyBudget.trim() ||
      activeMode !== "automatico" ||
      recurring ||
      roundTrip ||
      tripsPerWeek !== 1
    );

    if (!hasMeaningfulDraft) {
      clearTripCalculatorDraft();
      return;
    }

    saveTripCalculatorDraft({
      mode: activeMode,
      recurring,
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
  }, [initialDistanceKm, activeMode, recurring, distance, price, consumption, tank, currentFuel, roundTrip, tripsPerWeek, toll, parking, other, alternativePrice, alternativeConsumption, monthlyBudget]);

  useEffect(() => {
    const refreshVehicle = () => {
      const vehicle = getMobileVehicle();
      setSavedVehicle(vehicle);
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
    setRecurring(Boolean(mode.recurring));

    if (modeId === "automatico") {
      setRoundTrip(false);
      setTripsPerWeek(1);
      if (typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0) setDistance(String(Number(initialDistanceKm.toFixed(3))));
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
    clearRememberedPrice();
    setRememberedPrice("");
    setRestoredDraft(false);
    setActiveMode("automatico");
    setDistance(typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0 ? String(Number(initialDistanceKm.toFixed(3))) : "");
    setPrice("");
    setConsumption(savedVehicle ? String(savedVehicle.consumption) : "");
    setTank(savedVehicle ? String(savedVehicle.tank) : "");
    setCurrentFuel("");
    setRoundTrip(false);
    setTripsPerWeek(1);
    setRecurring(false);
    setToll("");
    setParking("");
    setOther("");
    setAlternativePrice("");
    setAlternativeConsumption("");
    setMonthlyBudget("");
  };

  const autoSignals = useMemo(() => {
    const signals: string[] = [];
    if (typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0) signals.push("distância da rota");
    if (savedVehicle) signals.push("veículo salvo");
    if (rememberedPrice) signals.push("último preço");
    return signals;
  }, [initialDistanceKm, savedVehicle, rememberedPrice]);

  const essentialStatus = useMemo(() => {
    const missing: string[] = [];
    const automatic: string[] = [];
    const routeDistanceAvailable = typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0;

    if (!numberValue(distance)) {
      missing.push("distância");
      if (!distance.trim() && routeDistanceAvailable) automatic.push("distância da rota");
    }
    if (!numberValue(price)) {
      missing.push("preço");
      if (!price.trim() && numberValue(rememberedPrice)) automatic.push("último preço");
    }
    if (!numberValue(consumption)) {
      missing.push("consumo");
      if (!consumption.trim() && savedVehicle) automatic.push("consumo do veículo salvo");
    }

    return { missing, automatic };
  }, [distance, price, consumption, initialDistanceKm, rememberedPrice, savedVehicle]);

  const completeMissingEssentials = () => {
    setRestoredDraft(false);
    if (!distance.trim() && typeof initialDistanceKm === "number" && Number.isFinite(initialDistanceKm) && initialDistanceKm > 0) {
      setDistance(String(Number(initialDistanceKm.toFixed(3))));
    }
    if (!price.trim() && numberValue(rememberedPrice)) {
      setPrice(rememberedPrice);
    }

    const vehicle = getMobileVehicle();
    if (vehicle) {
      if (!consumption.trim()) setConsumption(String(vehicle.consumption));
      if (!tank.trim()) setTank(String(vehicle.tank));
    }
  };

  const values = useMemo(() => {
    const oneWayDistanceKm = numberValue(distance);
    const pricePerLiter = numberValue(price);
    const kmPerLiter = numberValue(consumption);
    const tankLiters = numberValue(tank);
    const currentFuelLiters = optionalNonNegativeValue(currentFuel);
    const currentFuelProvided = currentFuel.trim().length > 0;
    const currentFuelInvalid = currentFuelProvided && currentFuelLiters === null;
    const currentFuelAboveTank = currentFuelLiters !== null && tankLiters > 0 && currentFuelLiters > tankLiters;
    const extraCostPerTrip = numberValue(toll) + numberValue(parking) + numberValue(other);
    if (!oneWayDistanceKm || !pricePerLiter || !kmPerLiter) return null;

    const litersOneWay = oneWayDistanceKm / kmPerLiter;
    const oneWayCost = litersOneWay * pricePerLiter;
    const projection = projectTripCosts({ oneWayDistanceKm, oneWayCost, roundTrip, tripsPerWeek, extraCostPerTrip, recurring });
    const autonomyKm = tankLiters ? tankLiters * kmPerLiter : 0;
    const fuelNeeded = projection.distanceKm / kmPerLiter;
    const estimatedRefuels = autonomyKm > 0 ? Math.max(0, Math.ceil(fuelNeeded / tankLiters) - 1) : null;
    const fuelStatus = currentFuelProvided && currentFuelLiters !== null && tankLiters > 0
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
      recurring,
    });
    const budgetStatus = recurring ? compareMonthlyBudget(projection.monthlyCost, numberValue(monthlyBudget)) : null;
    const fuelChoice = compareEthanolGasoline({
      ethanolPrice: pricePerLiter,
      gasolinePrice: numberValue(alternativePrice),
      ethanolKmPerLiter: kmPerLiter,
      gasolineKmPerLiter: numberValue(alternativeConsumption),
    });

    return {
      projection,
      fuelNeeded,
      autonomyKm,
      estimatedRefuels,
      fuelStatus,
      comparison,
      budgetStatus,
      fuelChoice,
      currentFuelInvalid,
      currentFuelAboveTank,
    };
  }, [distance, price, consumption, tank, currentFuel, toll, parking, other, alternativePrice, alternativeConsumption, monthlyBudget, roundTrip, tripsPerWeek, recurring]);

  const smartSummary = useMemo(() => {
    if (!values) return "";

    if (values.currentFuelInvalid || values.currentFuelAboveTank) {
      return "Corrija o combustível atual para avaliar a necessidade de abastecimento.";
    }

    if (values.fuelStatus && !values.fuelStatus.canCompleteTrip) {
      if (values.fuelStatus.tripFitsOneTank) {
        return `Antes de sair, abasteça pelo menos ${values.fuelStatus.fuelNeededBeforeDeparture.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L. O custo mínimo estimado é ${values.fuelStatus.departureFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;
      }
      return `A viagem ultrapassa um tanque e pode exigir pelo menos ${values.fuelStatus.minimumRefuelStops} parada(s) para abastecer no caminho.`;
    }

    if (recurring) {
      return `Neste modo, a projeção é ${values.projection.monthlyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês para ${tripsPerWeek} viagem(ns) por semana.`;
    }

    return `Estimativa para ${roundTrip ? "ida e volta" : "só ida"}: ${values.projection.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, usando cerca de ${values.fuelNeeded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L.`;
  }, [values, recurring, tripsPerWeek, roundTrip]);

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
            <p className="mt-1 text-[0.68rem] text-[#71877E]">Os modos ajustam ida/volta e frequência. O automático reaproveita apenas dados locais já conhecidos.</p>
          </div>
          {activeMode === "personalizado" && (
            <span className="rounded-full bg-[#FFF7DF] px-2.5 py-1 text-[0.6rem] font-black text-[#6D5200]">Personalizado</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
        <div className="mt-3 rounded-xl bg-[#EAF4EC] px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-black text-[#356451]">
                {essentialStatus.missing.length
                  ? `Revise ${essentialStatus.missing.length} dado(s): ${essentialStatus.missing.join(", ")}.`
                  : "Tudo pronto para calcular automaticamente."}
              </p>
              <p className="mt-1 text-[0.62rem] font-semibold leading-relaxed text-[#56766A]">
                {essentialStatus.automatic.length
                  ? "Posso completar agora: " + essentialStatus.automatic.join(" · ") + "."
                  : autoSignals.length
                    ? "Dados locais disponíveis: " + autoSignals.join(" · ") + "."
                    : "Sem dados locais reaproveitáveis ainda; nada será inventado."}
              </p>
            </div>
            {essentialStatus.automatic.length > 0 && (
              <button
                type="button"
                onClick={completeMissingEssentials}
                aria-label="Completar campos automaticamente"
                className="min-h-10 shrink-0 rounded-xl bg-[#163840] px-3 text-[0.62rem] font-black text-white hover:bg-[#234A4A]"
              >
                Completar automático
              </button>
            )}
          </div>
        </div>
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
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                onBlur={() => {
                  rememberPrice(price);
                  setRememberedPrice(getRememberedPrice());
                }}
                inputMode="decimal"
                placeholder="5,89"
                aria-describedby="local-calculator-note"
                className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#163840] outline-none"
              />
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
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/60">{roundTrip ? "Ida e volta" : "Só ida"}</p>
              <p className="mt-1 text-xl font-black">{values.projection.costPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className="mt-1 text-[0.58rem] text-white/55">{values.projection.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km no modo escolhido</p>
              {values.projection.extraCostPerTrip > 0 && <p className="mt-1 text-[0.58rem] text-white/55">Inclui {values.projection.extraCostPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em extras</p>}
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4">
              <Fuel className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">Combustível</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{values.fuelNeeded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">{values.projection.fuelCostPerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
            <div className="rounded-xl border border-[#D7DFD8] bg-white p-4">
              <WalletCards className="size-4 text-[#356451]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#6C7F78]">{recurring ? "Por mês" : "Frequência"}</p>
              <p className="mt-1 text-lg font-black text-[#163840]">{recurring ? values.projection.monthlyCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Pontual"}</p>
              <p className="mt-1 text-[0.58rem] text-[#71877E]">{recurring ? tripsPerWeek + " viagem(ns)/semana" : "sem projeção semanal"}</p>
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

          <div className="mt-3 rounded-xl border border-[#B7D8C1] bg-[#F0F8F2] px-4 py-3" role="status">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#56766A]">Resumo inteligente</p>
            <p className="mt-1 text-sm font-extrabold leading-relaxed text-[#163840]">{smartSummary}</p>
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
              ) : values.fuelStatus.tripFitsOneTank ? (
                <>
                  <p className="mt-1 text-sm font-extrabold text-[#8A4434]">Abasteça pelo menos {values.fuelStatus.fuelNeededBeforeDeparture.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L antes de sair.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7A5148]">
                    Custo mínimo estimado antes da saída: <strong>{values.fuelStatus.departureFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-extrabold text-[#8A4434]">Esta viagem ultrapassa a autonomia de um tanque.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7A5148]">
                    Para sair com o tanque cheio, abasteça <strong>{values.fuelStatus.fuelNeededBeforeDeparture.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</strong>
                    {" "}({values.fuelStatus.departureFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).
                    No caminho, ainda serão necessários cerca de <strong>{values.fuelStatus.additionalFuelDuringTripLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</strong>
                    {" "}em pelo menos <strong>{values.fuelStatus.minimumRefuelStops} parada(s)</strong>.
                  </p>
                  <p className="mt-1 text-[0.62rem] text-[#7A5148]">
                    Combustível adicional estimado ao longo de toda a viagem: {values.fuelStatus.minimumFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.
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

          {values.estimatedRefuels != null && values.estimatedRefuels > 0 && !values.fuelStatus && (
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
          <div>
            <label className="text-xs font-bold text-[#365E51]">
              Combustível atual (L)
              <input value={currentFuel} onChange={e => setCurrentFuel(e.target.value)} inputMode="decimal" placeholder="Ex.: 18 ou 0" aria-describedby="fuel-status-note current-fuel-validation" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]" />
            </label>
            {numberValue(tank) > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Atalhos de nível do tanque">
                {[
                  { label: "¼", fraction: 0.25 },
                  { label: "½", fraction: 0.5 },
                  { label: "¾", fraction: 0.75 },
                  { label: "Cheio", fraction: 1 },
                ].map(option => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setCurrentFuel(fuelLitersFromTankFraction(numberValue(tank), option.fraction).toLocaleString("pt-BR", { maximumFractionDigits: 1 }))}
                    className="min-h-10 rounded-lg border border-[#D7DFD8] bg-[#F8FAF7] px-2 text-[0.62rem] font-extrabold text-[#365E51] hover:border-[#A7CDBA]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {values?.currentFuelInvalid && <p id="current-fuel-validation" role="alert" className="mt-1.5 text-[0.62rem] font-bold text-[#8A4434]">Informe um valor válido igual ou maior que zero.</p>}
            {values?.currentFuelAboveTank && <p id="current-fuel-validation" role="status" className="mt-1.5 text-[0.62rem] font-bold text-[#8A4434]">O valor informado supera o tanque; o cálculo usa a capacidade máxima.</p>}
          </div>
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

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Tipo de viagem</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setRoundTrip(false); setActiveMode("personalizado"); }} aria-pressed={!roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${!roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Só ida</button>
              <button type="button" onClick={() => { setRoundTrip(true); setActiveMode("personalizado"); }} aria-pressed={roundTrip} className={`min-h-11 rounded-lg px-3 text-xs font-extrabold ${roundTrip ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Ida e volta</button>
            </div>
          </div>
          <div className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Recorrência</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setRecurring(false); setActiveMode("personalizado"); }} aria-pressed={!recurring} className={`min-h-11 rounded-lg px-2 text-xs font-extrabold ${!recurring ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Pontual</button>
              <button type="button" onClick={() => { setRecurring(true); setActiveMode("personalizado"); }} aria-pressed={recurring} className={`min-h-11 rounded-lg px-2 text-xs font-extrabold ${recurring ? "bg-[#163840] text-white" : "bg-white text-[#365E51]"}`}>Semanal</button>
            </div>
          </div>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51]">
            Viagens por semana
            <input type="number" min="1" max="21" step="1" value={tripsPerWeek} disabled={!recurring} onChange={e => { setTripsPerWeek(Math.max(1, Math.min(21, Number(e.target.value) || 1))); setRecurring(true); setActiveMode("personalizado"); }} className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840] disabled:cursor-not-allowed disabled:opacity-45" />
          </label>
          <label className="rounded-xl border border-[#D7DFD8] bg-[#F8FAF7] p-3 text-xs font-bold text-[#365E51] sm:col-span-3">
            Orçamento mensal de deslocamento
            <input value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} inputMode="decimal" disabled={!recurring} placeholder={recurring ? "Ex.: 800" : "Ative uma rotina semanal para comparar"} className="mt-2 min-h-11 w-full rounded-lg border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840] disabled:cursor-not-allowed disabled:opacity-45" />
            {!recurring && <span className="mt-1.5 block text-[0.6rem] font-semibold text-[#71877E]">Viagens pontuais não geram uma projeção mensal automática.</span>}
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

          {values?.fuelChoice && (
            <div className="mt-3 rounded-xl border border-[#B7D8C1] bg-[#F0F8F2] p-4" role="status">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#56766A]">Etanol × gasolina</p>
              <p className="mt-1 text-sm font-black text-[#163840]">{values.fuelChoice.recommended === "ethanol" ? "Etanol tem o menor custo estimado." : values.fuelChoice.recommended === "gasoline" ? "Gasolina tem o menor custo estimado." : "Os dois combustíveis estão praticamente empatados."}</p>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-[#5F746E]">{values.fuelChoice.method === "real-cost-per-km" ? "Comparação feita pelo custo real por km usando preço e consumo dos dois combustíveis." : "Sem os dois consumos, o Trajeto usa a regra de 70% apenas como referência."}</p>
            </div>
          )}

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
                  ? `O segundo cenário economiza ${values.comparison.differencePerTrip.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por viagem${recurring ? " e " + values.comparison.differencePerMonth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/mês" : ""}.`
                  : `O segundo cenário custa ${Math.abs(values.comparison.differencePerTrip).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a mais por viagem${recurring ? " e " + Math.abs(values.comparison.differencePerMonth).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/mês" : ""}.`}
              </p>
            </div>
          )}
        </div>
      </details>

      {values && recurring && (
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
        Cálculo local baseado somente nos valores informados. O Trajeto pode reaproveitar neste aparelho a distância da rota, o veículo salvo e o último preço digitado. Projeções mensais só aparecem quando você ativa uma rotina e usam 4,33 semanas por mês; nenhum valor representa preço atual de posto.
      </p>
    </section>
  );
}
