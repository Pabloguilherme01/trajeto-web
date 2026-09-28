import { CarFront, Fuel, Pencil, Route, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMobileVehicle, mobileVehicleEvent, removeMobileVehicle, saveMobileVehicle, type MobileVehicle } from "@/lib/mobileVehicle";

const defaults: MobileVehicle = {
  name: "",
  fuel: "gasolina",
  consumption: 10,
  tank: 45,
};

export default function MobileVehicleCard() {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MobileVehicle>(() => getMobileVehicle() ?? defaults);

  useEffect(() => {
    const refresh = () => {
      const current = getMobileVehicle();
      setVehicle(current);
      setDraft(current ?? defaults);
    };
    window.addEventListener(mobileVehicleEvent, refresh);
    return () => window.removeEventListener(mobileVehicleEvent, refresh);
  }, []);

  const fuelLabel = vehicle?.fuel === "etanol" ? "Etanol" : vehicle?.fuel === "diesel" ? "Diesel" : "Gasolina";
  const autonomy = useMemo(() => vehicle ? Math.round(vehicle.consumption * vehicle.tank) : 0, [vehicle]);

  const save = () => {
    if (draft.consumption <= 0 || draft.tank <= 0) return;
    saveMobileVehicle(draft);
    setVehicle(getMobileVehicle());
    setEditing(false);
  };

  return (
    <section className="mobile-card rounded-3xl border border-white/10 bg-[#111A21] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
          <CarFront className="size-5 text-[#3DE3FF]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Meu veículo</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">
            Quanto essa viagem pesa?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#8FA3AC]">
            Salvo apenas neste aparelho. Sem conta e sem sincronização.
          </p>
        </div>
        {vehicle && !editing && (
          <button type="button" onClick={() => { setDraft(vehicle); setEditing(true); }} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 text-[#3DE3FF]" aria-label="Editar veículo">
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {vehicle && !editing ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#8FA3AC]">Veículo</p>
            <p className="mt-1 truncate text-sm font-extrabold">{vehicle.name}</p>
            <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-[#7F919A]"><Fuel className="size-3" /> {fuelLabel}</p>
          </div>
          <div className="rounded-2xl border border-[#C7FF3C]/35 bg-[#C7FF3C]/[0.08] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#8FA3AC]">Autonomia estimada</p>
            <p className="mt-1 text-xl font-black tracking-[-0.04em]">{autonomy.toLocaleString("pt-BR")} km</p>
            <p className="mt-1 text-[0.65rem] text-[#7F919A]">{vehicle.consumption.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L · tanque {vehicle.tank} L</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-[#B7C4CA]">Nome
              <input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Meu carro" className="mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#3DE3FF]" />
            </label>
            <label className="text-xs font-bold text-[#B7C4CA]">Combustível
              <select value={draft.fuel} onChange={event => setDraft(current => ({ ...current, fuel: event.target.value as MobileVehicle["fuel"] }))} className="mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#326575]">
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-[#B7C4CA]">Consumo (km/L)
              <input type="number" min="1" max="50" step="0.1" inputMode="decimal" value={draft.consumption} onChange={event => setDraft(current => ({ ...current, consumption: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#326575]" />
            </label>
            <label className="text-xs font-bold text-[#B7C4CA]">Tanque (L)
              <input type="number" min="10" max="200" step="1" inputMode="numeric" value={draft.tank} onChange={event => setDraft(current => ({ ...current, tank: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 text-sm outline-none focus:border-[#326575]" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} className="min-h-11 flex-1 rounded-xl bg-[#C7FF3C] text-[#0B1014] px-4 text-xs font-extrabold">Salvar veículo</button>
            {vehicle && <button type="button" onClick={() => { removeMobileVehicle(); setEditing(false); }} className="min-h-11 rounded-xl border border-[#E1C4BE] px-4 text-xs font-bold text-[#FFB5A1]"><X className="mr-1 inline size-3.5" /> Remover</button>}
            <button type="button" onClick={() => { setDraft(vehicle ?? defaults); setEditing(false); }} className="min-h-11 rounded-xl border border-white/12 px-4 text-xs font-bold text-[#B7C4CA]">Cancelar</button>
          </div>
        </div>
      )}

      {!vehicle && !editing && (
        <button type="button" onClick={() => { setDraft(defaults); setEditing(true); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] text-[#0B1014] px-4 text-xs font-extrabold active:scale-[.99]">
          <Route className="size-4" /> Adicionar meu veículo
        </button>
      )}
    </section>
  );
}
