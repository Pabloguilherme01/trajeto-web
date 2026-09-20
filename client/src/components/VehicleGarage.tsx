import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Car, Calculator, Fuel, Loader2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const fuelLabels = { gasoline: "Gasolina", ethanol: "Etanol", flex: "Flex", diesel: "Diesel", gnv: "GNV", electric: "Elétrico", other: "Outro" } as const;

function numeric(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function VehicleGarage() {
  const utils = trpc.useUtils();
  const vehicles = trpc.personal.vehicles.useQuery(undefined, { retry: 1 });
  const createVehicle = trpc.personal.createVehicle.useMutation({ onSuccess: () => utils.personal.vehicles.invalidate() });
  const updateVehicle = trpc.personal.updateVehicle.useMutation({ onSuccess: () => utils.personal.vehicles.invalidate() });
  const deleteVehicle = trpc.personal.deleteVehicle.useMutation({ onSuccess: () => utils.personal.vehicles.invalidate() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [fuelType, setFuelType] = useState<keyof typeof fuelLabels>("flex");
  const [tankLiters, setTankLiters] = useState("");
  const [cityKmPerLiter, setCityKmPerLiter] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [consumption, setConsumption] = useState("");
  const economyInput = useMemo(() => {
    const distance = numeric(distanceKm);
    const price = numeric(pricePerLiter);
    const kmPerLiter = numeric(consumption);
    const tank = numeric(tankLiters);
    return distance && price && kmPerLiter ? { distanceKm: distance, pricePerLiter: price, kmPerLiter, tankLiters: tank } : null;
  }, [distanceKm, pricePerLiter, consumption, tankLiters]);
  const economy = trpc.personal.fuelEconomy.useQuery(economyInput ?? { distanceKm: 0, pricePerLiter: 1, kmPerLiter: 1 }, { enabled: Boolean(economyInput), retry: 0 });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cityConsumption = numeric(cityKmPerLiter);
    const values = { nickname, brand: brand || null, model: model || null, fuelType, tankLiters: numeric(tankLiters), cityKmPerLiter: cityConsumption, highwayKmPerLiter: null, customKmPerLiter: cityConsumption, version: null, year: null, notes: null };
    const done = () => { setNickname(""); setBrand(""); setModel(""); setEditingId(null); };
    if (editingId) updateVehicle.mutate({ id: editingId, ...values }, { onSuccess: done });
    else createVehicle.mutate(values, { onSuccess: done });
  };
  const selectVehicle = (vehicle: NonNullable<typeof vehicles.data>[number]) => {
    const efficiency = vehicle.customKmPerLiter ?? vehicle.cityKmPerLiter ?? vehicle.highwayKmPerLiter;
    if (efficiency) setConsumption(String(efficiency));
    if (vehicle.tankLiters) setTankLiters(String(vehicle.tankLiters));
    if (vehicle.fuelType in fuelLabels) setFuelType(vehicle.fuelType as keyof typeof fuelLabels);
  };
  const editVehicle = (vehicle: NonNullable<typeof vehicles.data>[number]) => {
    setEditingId(vehicle.id); setNickname(vehicle.nickname); setBrand(vehicle.brand ?? ""); setModel(vehicle.model ?? ""); if (vehicle.fuelType in fuelLabels) setFuelType(vehicle.fuelType as keyof typeof fuelLabels); setTankLiters(vehicle.tankLiters ? String(vehicle.tankLiters) : ""); setCityKmPerLiter(vehicle.customKmPerLiter ? String(vehicle.customKmPerLiter) : vehicle.cityKmPerLiter ? String(vehicle.cityKmPerLiter) : "");
  };

  return <section className="mt-8 grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
    <article className="rounded-3xl border border-[#3DE3FF]/25 bg-[#111D24] p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow text-[#3DE3FF]">Meus veículos</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Consumo que faz sentido.</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-[#A6BBC5]">Cadastre dados que você conhece do seu veículo. Nenhuma placa é solicitada ou armazenada.</p></div><Car className="size-5 text-[#3DE3FF]" /></div>
      <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#B5C6CD]">Apelido<input required value={nickname} onChange={event => setNickname(event.target.value)} placeholder="Ex.: Meu carro" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm" /></label><label className="text-xs font-bold text-[#B5C6CD]">Combustível<select value={fuelType} onChange={event => setFuelType(event.target.value as keyof typeof fuelLabels)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm">{Object.entries(fuelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs font-bold text-[#B5C6CD]">Marca<input value={brand} onChange={event => setBrand(event.target.value)} placeholder="Opcional" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm" /></label><label className="text-xs font-bold text-[#B5C6CD]">Modelo<input value={model} onChange={event => setModel(event.target.value)} placeholder="Opcional" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm" /></label><label className="text-xs font-bold text-[#B5C6CD]">Tanque (L)<input inputMode="decimal" value={tankLiters} onChange={event => setTankLiters(event.target.value)} placeholder="Opcional" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm" /></label><label className="text-xs font-bold text-[#B5C6CD]">Consumo (km/L)<input inputMode="decimal" value={cityKmPerLiter} onChange={event => setCityKmPerLiter(event.target.value)} placeholder="Opcional" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0B1014] px-3 py-2.5 text-base text-white outline-none focus:border-[#3DE3FF] sm:text-sm" /></label><div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row"><Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending} className="w-full rounded-xl bg-[#3DE3FF] font-bold text-[#0B1014] hover:bg-white sm:flex-1">{createVehicle.isPending || updateVehicle.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : editingId ? <Car className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}{editingId ? "Atualizar veículo" : "Adicionar veículo"}</Button>{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setNickname(""); setBrand(""); setModel(""); }} className="w-full rounded-xl border-white/15 text-white sm:w-auto">Cancelar</Button>}</div></form>
      <div className="mt-6 divide-y divide-white/10">{vehicles.isLoading && <p className="py-4 text-sm text-[#A6BBC5]">Carregando veículos…</p>}{vehicles.data?.length ? vehicles.data.map(vehicle => <div key={vehicle.id} className="flex flex-wrap items-start gap-3 py-4 sm:flex-nowrap sm:items-center"><button onClick={() => selectVehicle(vehicle)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/15 text-[#3DE3FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014]" aria-label={`Usar ${vehicle.nickname} no cálculo`}><Fuel className="size-4" /></button><div className="min-w-[10rem] flex-1"><p className="truncate text-sm font-bold text-white">{vehicle.nickname}</p><p className="mt-1 text-xs text-[#93AAB4]">{vehicle.brand || vehicle.model ? [vehicle.brand, vehicle.model].filter(Boolean).join(" · ") : ((fuelLabels as Record<string, string>)[vehicle.fuelType] ?? vehicle.fuelType)}{vehicle.customKmPerLiter ? ` · ${vehicle.customKmPerLiter} km/L` : ""}</p></div><div className="flex gap-2"><button onClick={() => editVehicle(vehicle)} className="min-h-10 rounded-lg border border-white/12 px-3 text-xs font-bold text-[#C9F7FF] transition hover:bg-[#3DE3FF] hover:text-[#0B1014]">Editar</button><button onClick={() => deleteVehicle.mutate({ id: vehicle.id })} className="grid size-10 place-items-center rounded-lg border border-white/12 text-[#FFAA9C] transition hover:bg-[#FF7D6A]/15" aria-label={`Remover ${vehicle.nickname}`}><Trash2 className="size-3.5" /></button></div></div>) : !vehicles.isLoading && <p className="py-5 text-sm text-[#A6BBC5]">Nenhum veículo salvo. Cadastre um consumo conhecido para personalizar suas estimativas.</p>}</div>
    </article>
    <article className="rounded-3xl border border-[#C7FF3C]/25 bg-[#132016] p-6 text-white sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Economia de combustível</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em]">Planeje antes de sair.</h2><p className="mt-2 text-sm leading-relaxed text-white/65">Estimativa local. Informe distância, preço e consumo; não pressupomos preço ou veículo.</p></div><Calculator className="size-5 text-[#C7FF3C]" /></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-white/70">Distância (km)<input inputMode="decimal" value={distanceKm} onChange={event => setDistanceKm(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#C7FF3C]" /></label><label className="text-xs font-bold text-white/70">Preço (R$/L)<input inputMode="decimal" value={pricePerLiter} onChange={event => setPricePerLiter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#C7FF3C]" /></label><label className="text-xs font-bold text-white/70">Consumo (km/L)<input inputMode="decimal" value={consumption} onChange={event => setConsumption(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#C7FF3C]" /></label></div>{economyInput && <div className="mt-6 grid gap-3 sm:grid-cols-2">{economy.isLoading ? <p className="text-sm text-white/70">Calculando…</p> : economy.data && <><div className="rounded-2xl bg-white/8 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/60">Custo estimado</p><p className="mt-2 font-display text-4xl tracking-[-0.06em]">{economy.data.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-2 text-xs text-white/65">{economy.data.litersNeeded.toLocaleString("pt-BR")} L · {economy.data.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/60">Ida e volta</p><p className="mt-2 font-display text-4xl tracking-[-0.06em]">{economy.data.roundTripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-2 text-xs text-white/65">{economy.data.autonomyKm ? `Autonomia estimada: ${economy.data.autonomyKm.toLocaleString("pt-BR")} km.` : "Adicione o tanque para estimar autonomia."}</p></div></>}</div>}</article>
  </section>;
}
