import { useEffect, useMemo, useState } from "react";
import { CarFront, CircleDollarSign, Fuel, Route as RouteIcon, WalletCards } from "lucide-react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { calculateRouteTotalCost } from "@/lib/routeTotalCost";

const PRICE_KEY = "trajeto-route-fuel-price";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RouteTotalCostCard(props: {
  distanceKm: number;
  durationMinutes: number;
  tollAmount: number | null;
  tollKnown: boolean;
  routeLabel: string | null;
  stale?: boolean;
}) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      try {
        const raw = Number(localStorage.getItem(PRICE_KEY) || "");
        setFuelPrice(Number.isFinite(raw) && raw > 0 ? String(raw).replace(".", ",") : "");
      } catch {
        setFuelPrice("");
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

  const parsedPrice = Number(fuelPrice.replace(",", "."));
  const validPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
  const result = useMemo(
    () => calculateRouteTotalCost({
      distanceKm: props.distanceKm,
      consumptionKmPerLiter: vehicle?.consumption ?? null,
      fuelPricePerLiter: validPrice,
      tollAmount: props.tollKnown ? props.tollAmount : null,
      roundTrip,
    }),
    [props.distanceKm, props.tollAmount, props.tollKnown, vehicle, validPrice, roundTrip],
  );

  const savePrice = (value: string) => {
    setFuelPrice(value);
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    try {
      localStorage.setItem(PRICE_KEY, String(parsed));
    } catch {}
  };

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#C7FF3C]/20 bg-[#101A20] text-white shadow-[0_16px_48px_rgba(0,0,0,.18)]" aria-labelledby="route-total-cost-title">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#C7FF3C]">Custo da rota</p>
            <h3 id="route-total-cost-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">Quanto esta escolha pesa.</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              {props.routeLabel ? props.routeLabel + " · " : ""}{Math.max(0, Math.round(props.durationMinutes))} min. O total usa apenas dados locais e o pedágio quando a fonte informou esse valor.
            </p>
          </div>
          {vehicle ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/55">
              <CarFront className="size-3.5 text-[#3DE3FF]" /> {vehicle.name || "Meu veículo"} · {vehicle.consumption.toLocaleString("pt-BR")} km/L
            </span>
          ) : (
            <a href="/minha-conta" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3DE3FF]/30 px-3 text-[0.6rem] font-black text-[#A7F2FF]">
              Cadastre o veículo
            </a>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/50">
            Preço do combustível (R$/L)
            <input value={fuelPrice} onChange={event => savePrice(event.target.value)} inputMode="decimal" placeholder="Ex.: 5,89" className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#3DE3FF]" />
          </label>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[.12em] text-white/40">Tipo de viagem</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setRoundTrip(false)} aria-pressed={!roundTrip} className={!roundTrip ? "min-h-10 rounded-lg bg-[#C7FF3C] px-2 text-[0.58rem] font-black text-[#0B1014]" : "min-h-10 rounded-lg border border-white/8 bg-white/[.02] px-2 text-[0.58rem] font-bold text-white/65"}>Só ida</button>
              <button type="button" onClick={() => setRoundTrip(true)} aria-pressed={roundTrip} className={roundTrip ? "min-h-10 rounded-lg bg-[#C7FF3C] px-2 text-[0.58rem] font-black text-[#0B1014]" : "min-h-10 rounded-lg border border-white/8 bg-white/[.02] px-2 text-[0.58rem] font-bold text-white/65"}>Ida e volta</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[.12em] text-white/40">Pedágio</p>
            <p className="mt-1 text-base font-black text-white">{props.tollKnown ? (props.tollAmount != null ? money(props.tollAmount * (roundTrip ? 2 : 1)) : "valor não informado") : "não informado"}</p>
            <p className="mt-0.5 text-[0.52rem] text-white/30">{props.tollKnown ? "valor retornado pela rota" : "não tratado como R$ 0"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <RouteIcon className="size-3.5 text-[#3DE3FF]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Distância</p>
            <p className="mt-1 text-sm font-black">{result.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <Fuel className="size-3.5 text-[#FFB86B]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Combustível</p>
            <p className="mt-1 text-sm font-black">{result.fuelCost != null ? money(result.fuelCost) : "faltam dados"}</p>
            <p className="mt-0.5 text-[0.52rem] text-white/30">{result.liters != null ? result.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " L" : "veículo + preço"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <CircleDollarSign className="size-3.5 text-[#BDA5FF]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Total</p>
            <p className="mt-1 text-sm font-black">{result.totalCost != null ? money(result.totalCost) : "incompleto"}</p>
            <p className="mt-0.5 text-[0.52rem] text-white/30">{result.costPerKm != null ? money(result.costPerKm) + "/km" : "custo/km indisponível"}</p>
          </div>
          <div className="rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] p-3">
            <WalletCards className="size-3.5 text-[#C7FF3C]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Leitura</p>
            <p className="mt-1 text-sm font-black">{props.stale ? "revisar rota" : result.totalCost != null ? "custo calculável" : "complete dados"}</p>
            <p className="mt-0.5 text-[0.52rem] text-white/30">{roundTrip ? "ida + volta" : "só ida"}</p>
          </div>
        </div>

        <p className="mt-4 border-t border-white/8 pt-3 text-[0.56rem] leading-relaxed text-white/35">
          {props.stale ? "Esta rota foi recuperada de um snapshot antigo. Recalcule antes de confiar em trânsito, pedágio ou horários atuais." : "Estimativa local. O Trajeto não considera pedágio como zero quando a fonte não informou o valor."}
        </p>
      </div>
    </section>
  );
}
