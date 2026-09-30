import { Calculator, Fuel, Scale } from "lucide-react";
import { useMemo, useState } from "react";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FuelTools() {
  const [distance, setDistance] = useState("120");
  const [consumption, setConsumption] = useState("12");
  const [price, setPrice] = useState("6,19");
  const [roundTrip, setRoundTrip] = useState(true);
  const [gasoline, setGasoline] = useState("6,19");
  const [ethanol, setEthanol] = useState("4,09");

  const cost = useMemo(() => {
    const d = Number(distance.replace(",", "."));
    const c = Number(consumption.replace(",", "."));
    const p = Number(price.replace(",", "."));
    if (!(d > 0 && c > 0 && p >= 0)) return null;
    const totalDistance = roundTrip ? d * 2 : d;
    const liters = totalDistance / c;
    return { totalDistance, liters, cost: liters * p };
  }, [distance, consumption, price, roundTrip]);

  const ratio = useMemo(() => {
    const g = Number(gasoline.replace(",", "."));
    const e = Number(ethanol.replace(",", "."));
    return g > 0 && e >= 0 ? (e / g) * 100 : null;
  }, [gasoline, ethanol]);

  return (
    <section className="grid gap-4">
      <article className="rounded-[1.4rem] border border-white/8 bg-[#121B22] p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#D9FF91]"><Calculator className="size-5" /></span>
          <div>
            <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Calculadora local</p>
            <h2 className="mt-1 text-base font-black">Quanto vou gastar?</h2>
            <p className="mt-1 text-[0.58rem] leading-relaxed text-white/35">Tudo é calculado no aparelho. O resultado é estimativa.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Distância (km)", distance, setDistance],
            ["Consumo (km/L)", consumption, setConsumption],
            ["Preço (R$/L)", price, setPrice],
          ].map(([label, value, setter]) => (
            <label key={label as string} className="block">
              <span className="text-[0.54rem] font-bold text-white/45">{label as string}</span>
              <input inputMode="decimal" value={value as string} onChange={e => (setter as (value: string)=>void)(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-sm font-black text-white outline-none focus:border-[#3DE3FF]/40" />
            </label>
          ))}
        </div>

        <label className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-white/8 bg-white/[.02] px-3 text-[0.58rem] font-bold text-white/60">
          <input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} className="size-4 accent-[#C7FF3C]" />
          Calcular ida + volta
        </label>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/8 bg-white/[.02] p-3"><p className="text-[0.48rem] text-white/30">Distância</p><p className="mt-1 text-base font-black">{cost ? cost.totalDistance.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km" : "—"}</p></div>
          <div className="rounded-xl border border-white/8 bg-white/[.02] p-3"><p className="text-[0.48rem] text-white/30">Litros</p><p className="mt-1 text-base font-black">{cost ? cost.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</p></div>
          <div className="rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] p-3"><p className="text-[0.48rem] text-[#D9FF91]">Custo estimado</p><p className="mt-1 text-base font-black text-white">{cost ? money(cost.cost) : "—"}</p></div>
        </div>
      </article>

      <article className="rounded-[1.4rem] border border-white/8 bg-[#121B22] p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#9FEFFF]"><Scale className="size-5" /></span>
          <div>
            <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Comparação</p>
            <h2 className="mt-1 text-base font-black">Gasolina × etanol</h2>
            <p className="mt-1 text-[0.58rem] leading-relaxed text-white/35">Mostra a relação entre os preços informados, sem decidir pelo seu veículo.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[0.54rem] font-bold text-white/45">Gasolina (R$/L)</span><input inputMode="decimal" value={gasoline} onChange={e => setGasoline(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-sm font-black text-white outline-none" /></label>
          <label className="block"><span className="text-[0.54rem] font-bold text-white/45">Etanol (R$/L)</span><input inputMode="decimal" value={ethanol} onChange={e => setEthanol(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-sm font-black text-white outline-none" /></label>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-center">
          <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-white/30">Relação observada</p>
          <p className="mt-1 text-[2rem] font-black tracking-[-.06em] text-white">{ratio == null ? "—" : ratio.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"}</p>
          <p className="mt-1 text-[0.55rem] leading-relaxed text-white/35">Fórmula: preço do etanol ÷ preço da gasolina × 100. O resultado não substitui o consumo real do veículo.</p>
        </div>
      </article>
    </section>
  );
}
