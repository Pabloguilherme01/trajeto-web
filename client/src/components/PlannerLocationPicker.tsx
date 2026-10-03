import React, { useMemo, useState } from "react";
import { BUNDLED_CITY_ATLAS, buildCityAtlas, filterCityAtlas } from "@/lib/cityAtlas";

const points = buildCityAtlas(BUNDLED_CITY_ATLAS).filter(item =>
  Number.isFinite(item.lat) && Number.isFinite(item.lng)
);

export default function PlannerLocationPicker({ kind, value, onChoose }: {
  kind: "origem" | "destino";
  value: string;
  onChoose: (coordinate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ coordinate: string; label: string } | null>(null);
  const matches = useMemo(() => filterCityAtlas(points, query, "todos"), [query]);
  return <div className="mt-2 min-w-0">
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} className="min-h-11 w-full rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-left text-xs font-bold text-[#C9F7FF]">Escolher {kind} no catálogo local</button>
    {selected?.coordinate === value && <p className="mt-1 break-words text-xs leading-relaxed text-white/60">{selected.label}</p>}
    {open && <div className="mt-2 rounded-xl border border-white/10 bg-[#0B1014] p-3">
      <label className="block text-xs font-bold text-white/65">Buscar {kind} local
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, rua ou bairro" className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#121B22] px-3 text-base text-white" autoComplete="off" enterKeyHint="search" />
      </label>
      <p className="mt-2 text-xs text-white/55">{matches.length} pontos com coordenadas · disponível sem internet</p>
      <ul className="mt-2 grid gap-2" aria-label={"Pontos locais para " + kind}>
        {matches.slice(0, 8).map(item => <li key={item.id}>
          <button type="button" onClick={() => {
            const coordinate = item.lat + ", " + item.lng;
            setSelected({ coordinate, label: item.name + (item.coordinateKind === "street-midpoint" ? " · Centro aproximado da via; não identifica uma casa ou entrada." : " · " + item.sourceLabel) });
            onChoose(coordinate);
            setOpen(false);
          }} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#121B22] p-3 text-left">
            <span className="block break-words text-sm font-bold text-white">{item.name}</span>
            <span className="mt-1 block break-words text-xs text-white/55">{item.address || item.detail}</span>
            {item.coordinateKind === "street-midpoint" && <span className="mt-1 block text-xs text-[#FFD59B]">Centro aproximado da via</span>}
          </button>
        </li>)}
      </ul>
      {matches.length > 8 && <p className="mt-2 text-xs text-white/55">Mostrando 8 resultados. Refine a busca para encontrar o ponto desejado.</p>}
      {!matches.length && <p className="mt-2 text-xs text-white/65">Nenhum ponto cadastrado com coordenadas. Use outro nome ou informe as coordenadas no campo principal.</p>}
    </div>}
  </div>;
}
