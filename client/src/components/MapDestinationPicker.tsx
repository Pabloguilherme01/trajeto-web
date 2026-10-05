import React, { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matchesCatalogText } from "@/lib/catalogSearch";
import MapPlaceIcon, { mapPlaceSegment } from "@/components/MapPlaceIcon";
import QuickFilterChips from "@/components/QuickFilterChips";
import { COMMON_DESTINATION_QUICK_FILTERS } from "@/lib/quickFilterPresets";

type Place = { id: string; name: string; address: string; category?: string; source?: string; coordinateKind?: string };
export default function MapDestinationPicker({ items, value, label, onSelect }: {
  items: Place[]; value: string | null; label: string; onSelect: (id: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState("Todos");
  const categories = useMemo(() => [...new Set(items.map(item => mapPlaceSegment(item).label))].sort(), [items]);
  const quickQueries = useMemo(
    () => COMMON_DESTINATION_QUICK_FILTERS.filter(option =>
      items.some(item => matchesCatalogText(option.value, [item.name, item.address]))
    ),
    [items]
  );
  const selected = items.find(item => item.id === value);
  const matches = useMemo(() => items.filter(item => (category === "Todos" || mapPlaceSegment(item).label === category) && matchesCatalogText(query, [item.name, item.address])), [items, query, category]);
  const visible = matches.slice(0, limit);
  const choose = (id: string) => { onSelect(id); setOpen(false); };
  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) { setQuery(""); setCategory("Todos"); setLimit(40); setActive(0); } }}>
    <PopoverTrigger asChild>
      <button type="button" aria-label={label} data-selected-id={value ?? ""}
        className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-4 text-left text-sm font-bold text-[#163840] shadow-[0_4px_20px_rgba(15,35,45,.16)] backdrop-blur-md">
        <Search className="size-4 shrink-0 text-[#147b88]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{selected?.name ?? "Buscar lugar no mapa"}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={6} collisionPadding={8} className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] flex max-h-[min(22rem,var(--radix-popover-content-available-height))] flex-col overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
      <label className="flex min-h-11 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
        <Search className="size-4 shrink-0 text-[#147b88]" aria-hidden="true" />
        <span className="sr-only">Pesquisar lugares no mapa</span>
        <input autoFocus type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setLimit(40); setActive(0); }}
          onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const next = Math.max(0, Math.min(visible.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
              setActive(next);
              event.currentTarget.closest('[data-slot="popover-content"]')?.querySelectorAll('[data-map-picker-option]')[next]?.scrollIntoView?.({ block: "nearest" });
            } else if (event.key === "Enter" && visible[active]) { event.preventDefault(); choose(visible[active].id); }
          }}
          placeholder="Nome, rua ou bairro" autoComplete="off" enterKeyHint="search"
          className="min-h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-500" />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca de lugares"
            onClick={() => { setQuery(""); setLimit(40); setActive(0); }}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        )}
      </label>
      <QuickFilterChips label="Atalhos de busca no mapa" options={quickQueries} value={query} onPick={value => { setQuery(value); setLimit(40); setActive(0); }} variant="light" className="shrink-0 border-b border-slate-100 px-3 py-2" />
      {categories.length > 1 && <div role="group" aria-label="Categorias de lugares" className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
        {["Todos", ...categories].map(label => <button key={label} type="button" aria-pressed={category === label} onClick={() => { setCategory(label); setActive(0); setLimit(40); }} className={"min-h-11 shrink-0 rounded-full border px-3 text-xs font-bold " + (category === label ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600")}>{label}</button>)}
      </div>}
      <p role="status" className="shrink-0 px-3 py-2 text-xs text-slate-500">{matches.length ? `${matches.length} lugares · toque para escolher` : "Nenhum lugar encontrado. Tente outro nome."}</p>
      {!matches.length && <button type="button" onClick={() => { setQuery(""); setCategory("Todos"); setActive(0); setLimit(40); }} className="min-h-11 shrink-0 text-sm font-bold text-blue-700">Limpar busca e filtros</button>}
      <div id={listId} role="listbox" className="min-h-0 max-h-[min(14rem,35dvh)] overflow-y-auto overscroll-contain px-1 pb-1" aria-label="Resultados de lugares">
        {visible.map((item, index) => <button type="button" key={item.id} data-map-picker-option id={`${listId}-${index}`} role="option" tabIndex={-1} aria-label={item.name + " · " + item.address}
          aria-selected={item.id === value} onFocus={() => setActive(index)} onClick={() => choose(item.id)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#147b88] ${index === active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#147b88]/10 text-[#147b88]"><MapPlaceIcon item={item} /></span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{item.name}</span><span className="block truncate text-xs text-slate-600">{item.address}</span></span>
          {item.id === value && <Check className="size-4 shrink-0 text-[#147b88]" aria-hidden="true" />}
        </button>)}
      </div>
      {matches.length > limit && <button type="button" onClick={() => setLimit(count => count + 40)} className="min-h-11 w-full shrink-0 border-t border-slate-200 text-xs font-bold text-[#147b88]">Mostrar mais lugares</button>}
    </PopoverContent>
  </Popover>;
}
