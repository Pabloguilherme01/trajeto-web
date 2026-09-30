import React, { useMemo, useState, type InputHTMLAttributes } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { getCityPlaceSuggestions, type CityPlace } from "@/lib/aguasLindasCity";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  onPlaceSelect: (place: CityPlace) => void;
};

export default function CityPlaceAutocomplete({ value, onValueChange, onPlaceSelect, id, className, onBlur, onFocus, ...inputProps }: Props) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => getCityPlaceSuggestions(value, 8), [value]);
  const listId = `${id}-suggestions`;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onFocus={event => { setOpen(true); onFocus?.(event); }}
        onBlur={event => { window.setTimeout(() => setOpen(false), 120); onBlur?.(event); }}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        className={className}
      />
      {open && <div id={listId} role="listbox" aria-label="Principais locais de Águas Lindas" className="absolute inset-x-0 top-[calc(100%+.4rem)] z-50 max-h-[min(55vh,22rem)] overflow-y-auto rounded-2xl border border-white/12 bg-[#10191F] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.5)]">
        <p className="px-3 py-2 text-[.5rem] font-black uppercase tracking-[.14em] text-white/35">{value.trim() ? "Locais correspondentes" : "Pontos principais"}</p>
        {suggestions.map(place => <button
          key={place.id}
          type="button"
          role="option"
          aria-selected="false"
          onMouseDown={event => event.preventDefault()}
          onClick={() => { onPlaceSelect(place); setOpen(false); }}
          className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 text-left transition hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7FF3C]"
        >
          <MapPin className="size-3.5 shrink-0 text-[#3DE3FF]" />
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white">{place.name}</span><span className="block truncate text-[.55rem] text-white/40">{place.address}</span></span>
          <ArrowUpRight className="size-3.5 shrink-0 text-white/35" />
        </button>)}
        {suggestions.length === 0 && <p className="px-3 py-3 text-xs text-white/50">Nenhum ponto do guia corresponde. Você ainda pode pesquisar o texto digitado.</p>}
      </div>}
    </div>
  );
}
