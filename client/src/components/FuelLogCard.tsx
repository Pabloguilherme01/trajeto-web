import { Download, Fuel, Gauge, ReceiptText, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addFuelLogEntry, buildFuelLogCsv, fuelLogEvent, listFuelLog, removeFuelLogEntry, summarizeFuelLog, type FuelLogEntry } from "@/lib/fuelLog";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function formatDate(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toLocaleDateString("pt-BR") : "Data inválida";
}

export default function FuelLogCard() {
  const [entries, setEntries] = useState<FuelLogEntry[]>(() => listFuelLog());
  const [liters, setLiters] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(listFuelLog());
    window.addEventListener(fuelLogEvent, refresh);
    return () => window.removeEventListener(fuelLogEvent, refresh);
  }, []);

  const summary = useMemo(() => summarizeFuelLog(entries), [entries]);
  const pricePreview = Number(liters.replace(",", ".")) > 0 && Number(totalCost.replace(",", ".")) >= 0
    ? Number(totalCost.replace(",", ".")) / Number(liters.replace(",", "."))
    : 0;

  const exportCsv = () => {\n    const csv = "\uFEFF" + buildFuelLogCsv(entries);\n    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));\n    const link = document.createElement("a");\n    link.href = url;\n    link.download = `trajeto-abastecimentos-${new Date().toISOString().slice(0, 10)}.csv`;\n    link.click();\n    URL.revokeObjectURL(url);\n    setFeedback("Histórico exportado para CSV.");\n  };\n\n  const save = () => {
    const entry = addFuelLogEntry({
      liters: Number(liters.replace(",", ".")),
      totalCost: Number(totalCost.replace(",", ".")),
      ...(odometer.trim() ? { odometerKm: Number(odometer.replace(",", ".")) } : {}),
      note,
    });
    if (!entry) {
      setFeedback("Confira litros, valor total e hodômetro.");
      return;
    }
    setEntries(listFuelLog());
    setLiters("");
    setTotalCost("");
    setOdometer("");
    setNote("");
    setFeedback("Abastecimento registrado neste aparelho.");
  };

  return (
    <section className="rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] shadow-[0_12px_35px_rgba(11,16,20,.06)] sm:p-6" aria-labelledby="fuel-log-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF6B7] text-[#365000]"><Fuel className="size-5" /></div>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Controle real</p>
          <h2 id="fuel-log-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Diário de abastecimentos</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#617179]">Registre o que você realmente pagou. Os dados ficam somente neste aparelho e não são preços ao vivo.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">\n        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#718089]">Resumo local</p>\n        {entries.length > 0 && <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#D8E0E3] px-3 text-[0.62rem] font-extrabold text-[#326575]"><Download className="size-3.5" /> Exportar CSV</button>}\n      </div>\n\n      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-[#F2F5F6] p-3"><span className="block text-[0.58rem] font-bold uppercase text-[#718089]">Registros</span><strong className="mt-1 block text-lg">{summary.entries}</strong></div>
        <div className="rounded-xl bg-[#F2F5F6] p-3"><span className="block text-[0.58rem] font-bold uppercase text-[#718089]">Litros</span><strong className="mt-1 block text-lg">{number.format(summary.totalLiters)}</strong></div>
        <div className="rounded-xl bg-[#F2F5F6] p-3"><span className="block text-[0.58rem] font-bold uppercase text-[#718089]">Gasto</span><strong className="mt-1 block text-lg">{money.format(summary.totalCost)}</strong></div>
        <div className="rounded-xl bg-[#F2F5F6] p-3"><span className="block text-[0.58rem] font-bold uppercase text-[#718089]">Média/L</span><strong className="mt-1 block text-lg">{summary.averagePricePerLiter ? money.format(summary.averagePricePerLiter) : "—"}</strong></div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <label className="text-xs font-bold">Litros<input aria-label="Litros" inputMode="decimal" value={liters} onChange={e => setLiters(e.target.value)} placeholder="40" className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] px-3 text-sm font-normal outline-none focus:border-[#326575]" /></label>
        <label className="text-xs font-bold">Valor total<input aria-label="Valor total" inputMode="decimal" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="240" className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] px-3 text-sm font-normal outline-none focus:border-[#326575]" /></label>
        <label className="text-xs font-bold">Hodômetro (opcional)<input aria-label="Hodômetro (opcional)" inputMode="decimal" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="10000" className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] px-3 text-sm font-normal outline-none focus:border-[#326575]" /></label>
        <label className="text-xs font-bold sm:col-span-2">Observação (opcional)<input aria-label="Observação (opcional)" value={note} onChange={e => setNote(e.target.value.slice(0, 120))} maxLength={120} placeholder="Ex.: posto, viagem ou abastecimento completo" className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] px-3 text-sm font-normal outline-none focus:border-[#326575]" /></label><div className="flex flex-col justify-end"><button type="button" onClick={save} className="min-h-11 rounded-xl bg-[#163840] px-4 text-xs font-extrabold text-white active:scale-[.98]">Registrar</button></div>
      </div>

      {pricePreview > 0 && <p className="mt-2 text-[0.68rem] font-bold text-[#326575]">Preço calculado neste abastecimento: {money.format(pricePreview)}/L</p>}
      {feedback && <p role="status" aria-live="polite" className="mt-2 rounded-xl bg-[#F2F5F6] px-3 py-2 text-[0.65rem] font-bold text-[#52636C]">{feedback}</p>}

      {summary.odometerDistanceKm > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#CFD9DD] bg-[#FCFDFD] px-3 py-2 text-[0.68rem] text-[#52636C]">
          <Gauge className="size-4 text-[#326575]" />
          <span><strong>{number.format(summary.odometerDistanceKm)} km</strong> entre o primeiro e o último hodômetro registrado · gasto acumulado {money.format(summary.estimatedCostPerKm)}/km.</span>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#718089]">Últimos registros</p>
          {entries.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[#D8E0E3] px-3 py-2.5">
              <ReceiptText className="size-4 shrink-0 text-[#326575]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold">{formatDate(entry.date)} · {number.format(entry.liters)} L · {money.format(entry.totalCost)}</p>
                <p className="text-[0.62rem] text-[#718089]">{money.format(entry.totalCost / entry.liters)}/L{entry.odometerKm !== undefined ? " · " + number.format(entry.odometerKm) + " km" : ""}{entry.note ? " · " + entry.note : ""}</p>
              </div>
              <button type="button" onClick={() => { removeFuelLogEntry(entry.id); setEntries(listFuelLog()); }} aria-label={"Remover abastecimento de " + formatDate(entry.date)} className="grid min-h-9 min-w-9 place-items-center rounded-lg text-[#9B6258]"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
