import React, { useId, useMemo, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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
        className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 text-left text-sm font-bold text-card-foreground shadow-[0_4px_20px_rgba(15,35,45,.16)] backdrop-blur-md">
        <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{selected?.name ?? "Buscar lugar no mapa"}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={6} collisionPadding={8} className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] flex max-h-[min(22rem,var(--radix-popover-content-available-height))] flex-col overflow-hidden rounded-2xl border-border bg-popover p-0 text-popover-foreground shadow-2xl">
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <input ref={inputRef} autoFocus type="search" role="combobox" aria-label="Pesquisar lugares no mapa" aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setLimit(40); setActive(0); }}
          onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const next = Math.max(0, Math.min(visible.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
              setActive(next);
              event.currentTarget.closest('[data-slot="popover-content"]')?.querySelectorAll('[data-map-picker-option]')[next]?.scrollIntoView?.({ block: "nearest" });
            } else if (event.key === "Enter" && visible[active]) { event.preventDefault(); choose(visible[active].id); }
          }}
          placeholder="Nome, rua ou bairro" autoComplete="off" enterKeyHint="search"
          className="min-h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca de lugares"
            onClick={() => { setQuery(""); setLimit(40); setActive(0); queueMicrotask(() => inputRef.current?.focus()); }}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <QuickFilterChips label="Atalhos de busca no mapa" options={quickQueries} value={query} onPick={value => { setQuery(value); setLimit(40); setActive(0); }} variant="light" className="shrink-0 border-b border-border px-3 py-2" />
      {categories.length > 1 && <div role="group" aria-label="Categorias de lugares" className="flex shrink-0 snap-x gap-2 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["Todos", ...categories].map(label => <button key={label} type="button" aria-pressed={category === label} onClick={() => { setCategory(label); setActive(0); setLimit(40); }} className={"min-h-11 shrink-0 snap-start rounded-full border px-3 text-xs font-bold " + (category === label ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground")}>{label}</button>)}
      </div>}
      <p role="status" className="shrink-0 px-3 py-2 text-xs text-muted-foreground">{matches.length ? `${matches.length} lugares · toque para escolher` : "Nenhum lugar encontrado. Tente outro nome."}</p>
      {!matches.length && <button type="button" onClick={() => { setQuery(""); setCategory("Todos"); setActive(0); setLimit(40); }} className="min-h-11 shrink-0 text-sm font-bold text-accent">Limpar busca e filtros</button>}
      <div id={listId} role="listbox" className="min-h-0 max-h-[min(14rem,35dvh)] overflow-y-auto overscroll-contain px-1 pb-1" aria-label="Resultados de lugares">
        {visible.map((item, index) => <button type="button" key={item.id} data-map-picker-option id={`${listId}-${index}`} role="option" tabIndex={-1} aria-label={item.name + " · " + item.address}
          aria-selected={item.id === value} onFocus={() => setActive(index)} onClick={() => choose(item.id)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${index === active ? "bg-muted" : "hover:bg-muted/60"}`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><MapPlaceIcon item={item} /></span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{item.name}</span><span className="block line-clamp-2 break-words text-xs text-muted-foreground">{item.address}</span></span>
          {item.id === value && <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />}
        </button>)}
      </div>
      {matches.length > limit && <button type="button" onClick={() => setLimit(count => count + 40)} className="min-h-11 w-full shrink-0 border-t border-border text-xs font-bold text-accent">Mostrar mais lugares</button>}
    </PopoverContent>
  </Popover>;
}
