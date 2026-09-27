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
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] shadow-[0_12px_35px_rgba(11,16,20,.06)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0F2]">
          <CarFront className="size-5 text-[#326575]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Meu veículo</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">
            Quanto essa viagem pesa?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#617179]">
            Salvo apenas neste aparelho. Sem conta e sem sincronização.
          </p>
        </div>
        {vehicle && !editing && (
          <button type="button" onClick={() => { setDraft(vehicle); setEditing(true); }} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#D8E0E3] text-[#326575]" aria-label="Editar veículo">
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {vehicle && !editing ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#D8E0E3] bg-[#FCFDFD] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#617179]">Veículo</p>
            <p className="mt-1 truncate text-sm font-extrabold">{vehicle.name}</p>
            <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-[#718089]"><Fuel className="size-3" /> {fuelLabel}</p>
          </div>
          <div className="rounded-2xl border border-[#C7FF3C]/35 bg-[#F7FBEA] p-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#617179]">Autonomia estimada</p>
            <p className="mt-1 text-xl font-black tracking-[-0.04em]">{autonomy.toLocaleString("pt-BR")} km</p>
            <p className="mt-1 text-[0.65rem] text-[#718089]">{vehicle.consumption.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L · tanque {vehicle.tank} L</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-[#52636C]">Nome
              <input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Meu carro" className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] bg-white px-3 text-sm outline-none focus:border-[#326575]" />
            </label>
            <label className="text-xs font-bold text-[#52636C]">Combustível
              <select value={draft.fuel} onChange={event => setDraft(current => ({ ...current, fuel: event.target.value as MobileVehicle["fuel"] }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] bg-white px-3 text-sm outline-none focus:border-[#326575]">
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-[#52636C]">Consumo (km/L)
              <input type="number" min="1" max="50" step="0.1" inputMode="decimal" value={draft.consumption} onChange={event => setDraft(current => ({ ...current, consumption: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] bg-white px-3 text-sm outline-none focus:border-[#326575]" />
            </label>
            <label className="text-xs font-bold text-[#52636C]">Tanque (L)
              <input type="number" min="10" max="200" step="1" inputMode="numeric" value={draft.tank} onChange={event => setDraft(current => ({ ...current, tank: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#C7D2D6] bg-white px-3 text-sm outline-none focus:border-[#326575]" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} className="min-h-11 flex-1 rounded-xl bg-[#163840] px-4 text-xs font-extrabold text-white">Salvar veículo</button>
            {vehicle && <button type="button" onClick={() => { removeMobileVehicle(); setEditing(false); }} className="min-h-11 rounded-xl border border-[#E1C4BE] px-4 text-xs font-bold text-[#9B6258]"><X className="mr-1 inline size-3.5" /> Remover</button>}
            <button type="button" onClick={() => { setDraft(vehicle ?? defaults); setEditing(false); }} className="min-h-11 rounded-xl border border-[#C7D2D6] px-4 text-xs font-bold text-[#52636C]">Cancelar</button>
          </div>
        </div>
      )}

      {!vehicle && !editing && (
        <button type="button" onClick={() => { setDraft(defaults); setEditing(true); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#163840] px-4 text-xs font-extrabold text-white active:scale-[.99]">
          <Route className="size-4" /> Adicionar meu veículo
        </button>
      )}
    </section>
  );
}
