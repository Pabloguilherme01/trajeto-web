import React from "react";
import { DESTINATION_AREAS } from "@/lib/destinationAreas";

export default function DestinationAreaSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="my-3 min-w-0 rounded-2xl border border-border/15 bg-card p-3">
      <label htmlFor="destination-area-filter" className="block text-xs font-black uppercase tracking-[.10em] text-foreground/75">
        Bairro ou setor mencionado no cadastro
      </label>
      <select id="destination-area-filter" aria-label="Filtrar destinos por bairro ou setor"
        value={value} onChange={event => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border/20 bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <option value="">Todas as regiões</option>
        {DESTINATION_AREAS.map(area => <option value={area.id} key={area.id}>{area.name}</option>)}
      </select>
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/65">
        {DESTINATION_AREAS.length} bairros e setores citados no PMGIRS da Prefeitura. Filtra pelo nome escrito no registro;
        não representa limites geográficos e não usa sua localização.
      </p>
    </div>
  );
}
