import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, CircleAlert, Wrench } from "lucide-react";
import { getMaintenanceItems, getMaintenanceStatus, removeMaintenanceItem, saveMaintenanceItem, vehicleMaintenanceEvent, type MaintenanceItem } from "@/lib/vehicleMaintenance";

const options: Array<{ id: MaintenanceItem["id"]; label: string }> = [
  { id: "oleo", label: "Troca de óleo" },
  { id: "pneus", label: "Pneus / revisão" },
  { id: "seguro", label: "Seguro" },
  { id: "licenciamento", label: "Licenciamento" },
];

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function VehicleMaintenanceCard() {
  const [items, setItems] = useState<MaintenanceItem[]>(() => getMaintenanceItems());
  const [selected, setSelected] = useState<MaintenanceItem["id"]>("oleo");
  const [date, setDate] = useState(addDays(30));

  useEffect(() => {
    const refresh = () => setItems(getMaintenanceItems());
    window.addEventListener(vehicleMaintenanceEvent, refresh);
    return () => window.removeEventListener(vehicleMaintenanceEvent, refresh);
  }, []);

  const nearest = useMemo(() => items[0], [items]);

  const save = () => {
    const option = options.find(item => item.id === selected);
    if (!option) return;
    saveMaintenanceItem({ id: selected, label: option.label, dueDate: date });
  };

  const statusLabel = (status: ReturnType<typeof getMaintenanceStatus>) =>
    status === "vencido" ? "Vencido" : status === "proximo" ? "Próximo" : "Em dia";

  return (
    <section className="mobile-card rounded-3xl border border-white/10 bg-[#111A21] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6" aria-labelledby="maintenance-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#BDA5FF]/10"><Wrench className="size-5 text-[#BDA5FF]" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BDA5FF]">Manutenção local</p>
          <h2 id="maintenance-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.045em]">Não deixe o veículo virar surpresa.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#8FA3AC]">Datas ficam somente neste aparelho. O Trajeto não lê documentos nem acessa sua conta gov.br.</p>
        </div>
      </div>

      {nearest && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3">
          {getMaintenanceStatus(nearest.dueDate) === "vencido" ? <CircleAlert className="size-5 text-[#FFB5A1]" /> : <CalendarClock className="size-5 text-[#C7FF3C]" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{nearest.label}</p>
            <p className="mt-0.5 text-[.68rem] text-[#8FA3AC]">{new Date(nearest.dueDate + "T12:00:00").toLocaleDateString("pt-BR")} · {statusLabel(getMaintenanceStatus(nearest.dueDate))}</p>
          </div>
          <ChevronRight className="size-4 text-[#65747C]" />
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-bold text-[#B7C4CA]">Item
          <select aria-label="Item de manutenção" value={selected} onChange={e => setSelected(e.target.value as MaintenanceItem["id"])} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 text-sm outline-none focus:border-[#3DE3FF]">
            {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-[#B7C4CA]">Próxima data
          <input aria-label="Próxima data" type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-white/[.03] px-3 text-sm outline-none focus:border-[#3DE3FF]" />
        </label>
        <button type="button" onClick={save} className="min-h-11 self-end rounded-xl bg-[#C7FF3C] px-4 text-xs font-extrabold text-[#0B1014]">Salvar</button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map(item => {
            const status = getMaintenanceStatus(item.dueDate);
            return <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2">
              <CheckCircle2 className={status === "vencido" ? "size-4 text-[#FFB5A1]" : status === "proximo" ? "size-4 text-[#FFD46A]" : "size-4 text-[#C7FF3C]"} />
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.label}</span>
              <button type="button" onClick={() => removeMaintenanceItem(item.id)} className="min-h-9 rounded-lg px-2 text-[.65rem] font-bold text-[#8FA3AC] hover:text-white">Limpar</button>
            </div>;
          })}
        </div>
      )}
    </section>
  );
}
