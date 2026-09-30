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
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(() => getCityPlaceSuggestions(value, 8), [value]);
  const listId = `${id}-suggestions`;
  const choose = (place: CityPlace) => {
    onPlaceSelect(place);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    inputProps.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(current => current < suggestions.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(current => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={event => { onValueChange(event.target.value); setActiveIndex(-1); }}
        onKeyDown={handleKeyDown}
        onFocus={event => { setOpen(true); setActiveIndex(-1); onFocus?.(event); }}
        onBlur={event => { window.setTimeout(() => { setOpen(false); setActiveIndex(-1); }, 120); onBlur?.(event); }}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        className={className}
      />
      {open && <div className="absolute inset-x-0 top-[calc(100%+.4rem)] z-50 max-h-[min(55vh,22rem)] overflow-y-auto rounded-2xl border border-white/12 bg-[#10191F] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.5)]">
        <p className="px-3 py-2 text-xs font-bold text-white/60">{value.trim() ? "Locais correspondentes" : "Pontos principais"}</p>
        <div id={listId} role="listbox" aria-label="Principais locais de Águas Lindas">
          {suggestions.map((place, index) => <div
            key={place.id}
            id={`${listId}-option-${index}`}
            role="option"
            aria-selected={activeIndex === index}
            onMouseDown={event => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(place)}
            className={"flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left transition " + (activeIndex === index ? "bg-white/[.08]" : "hover:bg-white/[.06]")}
          >
            <MapPin className="size-3.5 shrink-0 text-[#3DE3FF]" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{place.name}</span><span className="block truncate text-xs text-white/55">{place.address}</span></span>
            <ArrowUpRight className="size-3.5 shrink-0 text-white/35" />
          </div>)}
          {suggestions.length === 0 && <p className="px-3 py-3 text-xs text-white/50">Nenhum ponto do guia corresponde. Você ainda pode pesquisar o texto digitado.</p>}
        </div>
      </div>}
    </div>
  );
}
