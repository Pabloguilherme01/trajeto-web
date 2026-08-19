import { trpc } from "@/lib/trpc";
import { Calculator, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

type Period = "all" | "month" | "year";
type Totals = { gasoline: number; ethanol: number; lowest: number; distanceKm: number; count: number };

function periodRows<T extends { createdAt: Date | string }>(rows: T[], period: Period) {
  const now = new Date();
  const start = period === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : period === "year" ? new Date(now.getFullYear(), 0, 1) : null;
  return rows.filter(row => !start || new Date(row.createdAt) >= start);
}

export function VehicleTripCostComparison() {
  const history = trpc.personal.vehicleEconomyHistory.useQuery();
  const rows = history.data ?? [];
  const [firstId, setFirstId] = useState<number | null>(null);
  const [secondId, setSecondId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const vehicles = useMemo(() => Array.from(new Map(rows.map(row => [row.vehicleId, row.vehicleNickname])).entries()).map(([id, nickname]) => ({ id, nickname })), [rows]);
  const primaryId = firstId && vehicles.some(item => item.id === firstId) ? firstId : vehicles[0]?.id ?? null;
  const secondaryOptions = vehicles.filter(item => item.id !== primaryId);
  const secondaryId = secondId && secondaryOptions.some(item => item.id === secondId) ? secondId : secondaryOptions[0]?.id ?? null;
  const totals = (vehicleId: number | null): Totals => {
    const relevant = periodRows(rows.filter(row => row.vehicleId === vehicleId), period);
    return relevant.reduce<Totals>((sum, row) => ({ gasoline: sum.gasoline + row.gasolineCost, ethanol: sum.ethanol + row.ethanolCost, lowest: sum.lowest + Math.min(row.gasolineCost, row.ethanolCost), distanceKm: sum.distanceKm + row.distanceKm, count: sum.count + 1 }), { gasoline: 0, ethanol: 0, lowest: 0, distanceKm: 0, count: 0 });
  };
  const primary = totals(primaryId); const secondary = totals(secondaryId);
  const cards = [{ name: vehicles.find(item => item.id === primaryId)?.nickname ?? "Veículo A", totals: primary, color: "text-[#C7FF3C]" }, { name: vehicles.find(item => item.id === secondaryId)?.nickname ?? "Veículo B", totals: secondary, color: "text-[#3DE3FF]" }];
  const periodLabel = period === "month" ? "mês atual" : period === "year" ? "ano atual" : "todo o histórico";
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <section className="mt-4 rounded-3xl border border-[#3DE3FF]/25 bg-[#101C25] p-5 text-white sm:p-6"><div className="flex gap-3"><Calculator className="mt-0.5 size-5 shrink-0 text-[#3DE3FF]" /><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Custo e distância total</p><h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]">Quanto cada veículo custaria e rodaria nas rotas salvas.</h3><p className="mt-2 text-sm text-[#A8BBC3]">Soma custos e distância das rotas registradas no mesmo período. A base pode variar entre veículos; confira a quantidade de rotas.</p></div></div>{history.isLoading ? <div className="mt-5 flex items-center text-sm text-[#A8BBC3]"><Loader2 className="mr-2 size-4 animate-spin" />Carregando custos…</div> : vehicles.length >= 2 ? <><div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="text-[0.62rem] font-bold uppercase tracking-[.1em] text-[#A8BBC3]">Veículo A<select value={primaryId ?? ""} onChange={event => setFirstId(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm normal-case text-white">{vehicles.map(item => <option key={item.id} value={item.id}>{item.nickname}</option>)}</select></label><label className="text-[0.62rem] font-bold uppercase tracking-[.1em] text-[#A8BBC3]">Veículo B<select value={secondaryId ?? ""} onChange={event => setSecondId(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm normal-case text-white">{secondaryOptions.map(item => <option key={item.id} value={item.id}>{item.nickname}</option>)}</select></label><label className="text-[0.62rem] font-bold uppercase tracking-[.1em] text-[#A8BBC3]">Período<select value={period} onChange={event => setPeriod(event.target.value as Period)} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm normal-case text-white"><option value="all">Todo o histórico</option><option value="month">Mês atual</option><option value="year">Ano atual</option></select></label></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{cards.map(card => <article key={card.name} className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-sm font-bold text-white">{card.name}</p><p className={`mt-3 font-display text-4xl font-semibold tracking-[-.07em] ${card.color}`}>{money(card.totals.lowest)}</p><p className="mt-1 text-xs text-[#A8BBC3]">menor custo estimado · {card.totals.count} rota(s) em {periodLabel}</p><dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs"><div><dt className="text-[#829AA5]">Gasolina</dt><dd className="mt-1 font-bold text-white">{money(card.totals.gasoline)}</dd></div><div><dt className="text-[#829AA5]">Etanol</dt><dd className="mt-1 font-bold text-white">{money(card.totals.ethanol)}</dd></div><div><dt className="text-[#829AA5]">Distância</dt><dd className="mt-1 font-bold text-white">{card.totals.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</dd></div></dl></article>)}</div></> : <p className="mt-5 text-sm text-[#A8BBC3]">Use pelo menos dois veículos em planejamentos com gasolina e etanol para comparar custos totais.</p>}</section>;
}
