import { Check, SlidersHorizontal, X } from "lucide-react";
import type { FuelFilter } from "@/lib/stationDirectoryModel";

type DistanceFilter = "all" | 2 | 5 | 10;

type Props = {
  open: boolean;
  onClose: () => void;
  fuelOptions: Array<{ id: FuelFilter; label: string }>;
  fuelFilter: FuelFilter;
  setFuelFilter: (value: FuelFilter) => void;
  distanceFilter: DistanceFilter;
  setDistanceFilter: (value: DistanceFilter) => void;
  neighborhoodFilter: string;
  setNeighborhoodFilter: (value: string) => void;
  brandFilter: string;
  setBrandFilter: (value: string) => void;
  addressOnly: boolean;
  setAddressOnly: (value: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  mappedOnly: boolean;
  setMappedOnly: (value: boolean) => void;
  priceOnly: boolean;
  setPriceOnly: (value: boolean) => void;
  neighborhoods: string[];
  brands: string[];
  priceFilterAvailable: boolean;
  directoryPriceCount: number;
  verifiedFilterAvailable: boolean;
  hasUserCoords: boolean;
  onClear: () => void;
};

export default function StationFiltersSheet({
  open, onClose, fuelOptions, fuelFilter, setFuelFilter, distanceFilter, setDistanceFilter,
  neighborhoodFilter, setNeighborhoodFilter, brandFilter, setBrandFilter, addressOnly, setAddressOnly,
  verifiedOnly, setVerifiedOnly, mappedOnly, setMappedOnly, priceOnly, setPriceOnly, neighborhoods, brands,
  priceFilterAvailable, directoryPriceCount, verifiedFilterAvailable, hasUserCoords, onClear,
}: Props) {
  if (!open) return null;
  const toggle = (value: boolean, setValue: (next: boolean) => void) => setValue(!value);

  return (
    <div className="fixed inset-0 z-[72] md:hidden" role="dialog" aria-modal="true" aria-labelledby="station-filters-title">
      <button type="button" className="absolute inset-0 bg-[#02070A]/70 backdrop-blur-[2px]" aria-label="Fechar filtros" onClick={onClose} />
      <section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.65rem] border-t border-white/10 bg-[#10191F] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-25px_80px_rgba(0,0,0,.5)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#10191F]/96 px-4 py-3.5 backdrop-blur-xl">
          <div><p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Refinar</p><h2 id="station-filters-title" className="mt-1 text-lg font-black">Filtros</h2></div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-white/8 text-white/45" aria-label="Fechar"><X className="size-4" /></button>
        </div>
        <div className="space-y-5 p-4">
          <section>
            <p className="text-[0.5rem] font-black uppercase tracking-[.14em] text-white/30">Combustível</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {fuelOptions.map(option => { const active = fuelFilter === option.id; return <button key={option.id} type="button" aria-pressed={active} onClick={() => setFuelFilter(option.id)} className={"min-h-11 rounded-xl border px-3 text-left text-[0.58rem] font-black " + (active ? "border-[#C7FF3C]/25 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/8 bg-white/[.025] text-white/55")}>{option.label}{active && <Check className="float-right mt-0.5 size-3.5" />}</button>; })}
            </div>
          </section>
          <section>
            <p className="text-[0.5rem] font-black uppercase tracking-[.14em] text-white/30">Distância {hasUserCoords ? "" : "· GPS necessário"}</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(["all", 2, 5, 10] as DistanceFilter[]).map(value => { const active = distanceFilter === value; return <button key={String(value)} type="button" aria-pressed={active} onClick={() => setDistanceFilter(value)} disabled={value !== "all" && !hasUserCoords} className={"min-h-11 rounded-xl border px-2 text-[0.55rem] font-black disabled:opacity-25 " + (active ? "border-[#3DE3FF]/25 bg-[#3DE3FF]/10 text-[#C9F7FF]" : "border-white/8 bg-white/[.025] text-white/50")}>{value === "all" ? "Todas" : "Até " + value + " km"}</button>; })}
            </div>
          </section>
          <section className="grid gap-2">
            <select value={neighborhoodFilter} onChange={event => setNeighborhoodFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-[0.58rem] font-bold text-white outline-none"><option value="all">Todos os bairros</option>{neighborhoods.map(value => <option key={value} value={value}>{value}</option>)}</select>
            <select value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/8 bg-[#0B1014] px-3 text-[0.58rem] font-bold text-white outline-none"><option value="all">Todas as bandeiras</option>{brands.map(value => <option key={value} value={value}>{value}</option>)}</select>
          </section>
          <section className="grid gap-2">
            <button type="button" onClick={() => toggle(addressOnly, setAddressOnly)} className={"flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-[0.58rem] font-bold " + (addressOnly ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-white" : "border-white/8 bg-white/[.025] text-white/55")}>Com endereço consolidado {addressOnly && <Check className="size-4 text-[#C7FF3C]" />}</button>
            <button type="button" disabled={!verifiedFilterAvailable} onClick={() => toggle(verifiedOnly, setVerifiedOnly)} className={"flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-[0.58rem] font-bold " + (verifiedOnly ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-white" : "border-white/8 bg-white/[.025] text-white/55 disabled:opacity-30")}>Cadastro ANP disponível {verifiedOnly && <Check className="size-4 text-[#C7FF3C]" />}</button>
            <button type="button" onClick={() => toggle(mappedOnly, setMappedOnly)} className={"flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-[0.58rem] font-bold " + (mappedOnly ? "border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] text-white" : "border-white/8 bg-white/[.025] text-white/55")}>Coordenada / referência de mapa {mappedOnly && <Check className="size-4 text-[#3DE3FF]" />}</button>
            <button type="button" disabled={!priceFilterAvailable} onClick={() => toggle(priceOnly, setPriceOnly)} className={"flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-[0.58rem] font-bold " + (priceOnly ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-white" : "border-white/8 bg-white/[.025] text-white/55 disabled:opacity-30")}>Com preço individual ANP {priceFilterAvailable ? "· " + directoryPriceCount : "· indisponível"} {priceOnly && <Check className="size-4 text-[#C7FF3C]" />}</button>
          </section>
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t border-white/8 bg-[#10191F]/96 p-3 backdrop-blur-xl">
          <button type="button" onClick={onClear} className="min-h-12 flex-1 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Limpar</button>
          <button type="button" onClick={onClose} className="flex min-h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]"><SlidersHorizontal className="size-4" /> Aplicar</button>
        </div>
      </section>
    </div>
  );
}