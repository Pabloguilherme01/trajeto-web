import { trpc } from "@/lib/trpc";
import { buildVehicleEconomyCsv, vehicleEconomyCsvFilename } from "@/lib/vehicleEconomyCsv";
import { BarChart3, Download, Fuel, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

type PeriodPreset = "all" | "month" | "year" | "custom";

function filterByPeriod<T extends { createdAt: Date | string }>(rows: T[], preset: PeriodPreset, startDate: string, endDate: string) {
  const now = new Date();
  const start = preset === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : preset === "year" ? new Date(now.getFullYear(), 0, 1) : preset === "custom" && startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = preset === "custom" && endDate ? new Date(`${endDate}T23:59:59.999`) : null;
  return rows.filter(row => { const date = new Date(row.createdAt); return (!start || date >= start) && (!end || date <= end); });
}

export function VehicleEconomyHistory() {
  const history = trpc.personal.vehicleEconomyHistory.useQuery();
  const rows = history.data ?? [];
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const vehicles = useMemo(() => Array.from(new Map(rows.map(row => [row.vehicleId, row.vehicleNickname])).entries()).map(([id, nickname]) => ({ id, nickname })), [rows]);
  const activeVehicleId = selectedVehicleId && vehicles.some(vehicle => vehicle.id === selectedVehicleId) ? selectedVehicleId : vehicles[0]?.id ?? null;
  const activeVehicle = vehicles.find(vehicle => vehicle.id === activeVehicleId) ?? null;
  const allVehicleRows = rows.filter(row => row.vehicleId === activeVehicleId);
  const periodRows = filterByPeriod(allVehicleRows, period, startDate, endDate);
  const trend = periodRows.slice(-12);
  const totalSavings = trend.reduce((sum, row) => sum + row.estimatedSavings, 0);
  const maxSavings = Math.max(1, ...trend.map(row => row.estimatedSavings));
  const periodLabel = period === "month" ? "mês atual" : period === "year" ? "ano atual" : period === "custom" ? `${startDate || "início"} a ${endDate || "hoje"}` : "todo o histórico";
  const exportHistory = () => {
    if (!activeVehicle || !periodRows.length) return;
    const generatedAt = new Date();
    const blob = new Blob([buildVehicleEconomyCsv(periodRows, `${activeVehicle.nickname} · ${periodLabel}`, generatedAt)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = vehicleEconomyCsvFilename(generatedAt);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <section className="mt-8 rounded-3xl border border-[#BDA5FF]/30 bg-[#171326] p-6 text-white sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#CDBDFF]">Economia por veículo</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Comparações que você já calculou.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#C8C1DD]">A economia potencial é a diferença entre os custos estimados de gasolina e etanol para a mesma rota, usando os preços e consumos que você informou. Não é economia realizada nem cotação em tempo real.</p></div><BarChart3 className="size-6 text-[#C7FF3C]" /></div>{history.isLoading ? <div className="mt-7 flex min-h-36 items-center justify-center text-sm text-[#C8C1DD]"><Loader2 className="mr-2 size-4 animate-spin" />Carregando comparações salvas…</div> : vehicles.length ? <><div className="mt-6 flex flex-wrap items-center gap-2">{vehicles.map(vehicle => <button key={vehicle.id} type="button" onClick={() => setSelectedVehicleId(vehicle.id)} aria-pressed={vehicle.id === activeVehicleId} className={`min-h-10 rounded-full border px-3 text-xs font-bold transition ${vehicle.id === activeVehicleId ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#0B1014]" : "border-white/15 text-[#E9E5F5] hover:border-[#CDBDFF]"}`}>{vehicle.nickname}</button>)}</div><div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 sm:grid-cols-[1fr_auto]"><div className="grid gap-3 sm:grid-cols-3"><label className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#C8C1DD]">Período<select value={period} onChange={event => setPeriod(event.target.value as PeriodPreset)} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm normal-case text-white outline-none focus:border-[#C7FF3C]"><option value="all">Todo o histórico</option><option value="month">Mês atual</option><option value="year">Ano atual</option><option value="custom">Intervalo personalizado</option></select></label>{period === "custom" && <><label className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#C8C1DD]">De<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm text-white outline-none focus:border-[#C7FF3C]" /></label><label className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#C8C1DD]">Até<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-white/15 bg-[#0B1014] px-3 text-sm text-white outline-none focus:border-[#C7FF3C]" /></label></>}</div><button type="button" onClick={exportHistory} disabled={!periodRows.length} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#C7FF3C]/60 px-3 text-xs font-bold text-[#DFFF9D] hover:bg-[#C7FF3C] hover:text-[#0B1014] disabled:opacity-45"><Download className="mr-1.5 size-3.5" />Exportar CSV</button></div><div className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#AFA6C9]">Rotas comparáveis</p><p className="mt-2 font-display text-4xl font-semibold tracking-[-0.07em] text-white">{periodRows.length}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#AFA6C9]">Economia potencial</p><p className="mt-2 font-display text-4xl font-semibold tracking-[-0.07em] text-[#C7FF3C]">{totalSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#AFA6C9]">Período aplicado</p><p className="mt-2 text-lg font-bold text-white">{periodLabel}</p></div></div>{trend.length ? <><div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-12" aria-label="Gráfico de economia potencial por rota">{trend.map(row => <div key={`${row.vehicleId}-${new Date(row.createdAt).getTime()}`} className="flex min-w-0 flex-col items-center gap-2"><span className="flex h-32 w-full items-end rounded-t-lg bg-white/5 px-1"><i title={`${row.estimatedSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · ${row.bestFuel === "ethanol" ? "etanol" : "gasolina"} tem menor custo estimado`} className="w-full rounded-t-sm bg-[#C7FF3C]" style={{ height: `${Math.max(7, row.estimatedSavings / maxSavings * 100)}%` }} /></span><span className="text-center text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[#B8B1CE]">{new Date(row.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span><span className="text-center text-[0.58rem] text-[#DCD5EC]">{row.estimatedSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span></div>)}</div><p className="mt-4 text-xs text-[#B8B1CE]">O CSV exporta exatamente o período aplicado acima; o gráfico mostra até 12 rotas mais recentes deste intervalo.</p></> : <p className="mt-6 border-y border-dashed border-white/15 py-5 text-sm text-[#C8C1DD]">Nenhuma comparação completa encontrada para este período.</p>}</> : <div className="mt-7 flex min-h-40 flex-col justify-center border-y border-dashed border-white/15 text-sm text-[#C8C1DD]"><Fuel className="mb-3 size-5 text-[#C7FF3C]" /><p className="font-bold text-white">Ainda não há comparações completas por veículo.</p><p className="mt-1">No planejador, informe gasolina, etanol e consumo do veículo para registrar uma comparação aqui.</p></div>}{history.isError && <p role="alert" className="mt-4 text-sm text-[#FFC2B7]">Não foi possível ler seu histórico econômico agora.</p>}</section>;
}
