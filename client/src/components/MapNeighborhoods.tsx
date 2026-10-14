import React, { useMemo, useState } from "react";
import { CITY_NEIGHBORHOODS, LOCATED_NEIGHBORHOODS, layoutNeighborhoodLabels, neighborhoodSearchKey, searchCityNeighborhoods, type CityNeighborhood } from "@/lib/cityNeighborhoods";

export function MapNeighborhoodLabels({ labels, dark = false }: {
  labels: ReturnType<typeof layoutNeighborhoodLabels>; dark?: boolean;
}) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" role="group" aria-label="Nomes dos bairros no mapa">
    {labels.map(item=><span key={item.id} data-map-neighborhood={item.id}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-xs font-black uppercase tracking-wide"
      style={{left:item.x,top:item.y,width:item.width,color:dark?"#dbe7e8":"#405c65",textShadow:dark?"0 0 5px #18272d, 0 1px 3px #18272d":"0 0 5px #eef2eb, 0 1px 3px #eef2eb"}}
      title={item.name+" · "+item.precision+" · referência aproximada"}>{item.name}</span>)}
  </div>;
}

export function MapNeighborhoodPanel({ visible, onToggle, onFocus, inViewport }: {
  visible: boolean; onToggle: () => void;
  onFocus: (item: CityNeighborhood & {lat:number;lng:number}) => void;
  inViewport: readonly (CityNeighborhood & {lat:number;lng:number})[];
}) {
  const [query,setQuery]=useState("");
  const [showAll,setShowAll]=useState(false);
  // Do not mount dozens of offscreen controls while this disclosure is closed.
  const [viewportOpen,setViewportOpen]=useState(false);
  const searchKey=useMemo(()=>neighborhoodSearchKey(query),[query]);
  const matches=useMemo(()=>searchCityNeighborhoods(searchKey),[searchKey]);
  // Avoid mounting a long list of hidden results on low-memory phones.
  // Searching still finds every name; the complete list is one tap away.
  const visibleMatches=searchKey||showAll?matches:matches.slice(0,12);
  return <section aria-label="Bairros e setores do mapa" className="min-w-0 border-t border-border bg-card px-3 py-2.5 text-card-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={onToggle} aria-pressed={visible} aria-label={visible?"Ocultar nomes dos bairros":"Mostrar nomes dos bairros"}
        className="min-h-11 rounded-xl border border-border bg-secondary px-3 text-xs font-bold text-secondary-foreground">Bairros {visible?"visíveis":"ocultos"}</button>
      <span className="text-xs text-muted-foreground">{CITY_NEIGHBORHOODS.length} nomes · {LOCATED_NEIGHBORHOODS.length} com referência aproximada</span>
    </div>
    <details className="mt-1 min-w-0" data-neighborhood-viewport onToggle={event=>setViewportOpen(event.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Bairros nesta área · {inViewport.length}</summary>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
        Todas as referências localizadas neste recorte, inclusive nomes ocultados no desenho para evitar sobreposição. Não são limites oficiais.
      </p>
      {viewportOpen && (inViewport.length ? (
        <ul aria-label="Bairros visíveis nesta área" className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
          {inViewport.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => onFocus(item)}
                aria-label={`Centralizar bairro ${item.name}`}
                className="min-h-11 w-full rounded-xl border border-border bg-background p-2.5 text-left text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">Nenhum bairro com localização aproximada neste recorte. Mova ou reduza o zoom para explorar outras áreas.</p>
      ))}
    </details>
    <details className="mt-1 min-w-0">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Encontrar bairro ou setor</summary>
      <label className="block text-xs font-bold">Buscar bairro no mapa
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: Jardim Brasília"
          className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base text-foreground" />
      </label>
      <p className="my-2 text-xs leading-relaxed text-muted-foreground">Referências aproximadas de endereços do arquivo fornecido. Não indicam limites oficiais nem uma entrada. Os nomes sem posição confirmada permanecem na lista.</p>
      <ul aria-label="Bairros e setores disponíveis" className="max-h-64 space-y-1 overflow-y-auto overscroll-contain">
        {visibleMatches.map(item=><li key={item.id} className="min-w-0 rounded-xl border border-border">
          {typeof item.lat==="number"&&typeof item.lng==="number"?<button type="button" className="min-h-11 w-full break-words p-3 text-left text-sm font-bold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={"Ver bairro "+item.name+" no mapa"} onClick={()=>onFocus(item as CityNeighborhood & {lat:number;lng:number})}>{item.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{item.precision}</span></button>
            :<div className="break-words p-3 text-sm font-bold">{item.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">Localização ainda não confirmada</span></div>}
        </li>)}
      </ul>
      {!searchKey&&!showAll&&matches.length>visibleMatches.length&&<button type="button"
        onClick={()=>setShowAll(true)} aria-label="Mostrar todos os bairros"
        className="mt-2 min-h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm font-bold text-secondary-foreground focus-visible:outline-2 focus-visible:outline-ring">
        Ver todos os {matches.length} bairros e setores
      </button>}
      {!matches.length&&<p role="status" className="py-3 text-sm text-muted-foreground">Nenhum bairro encontrado com esse nome.</p>}
    </details>
  </section>;
}
