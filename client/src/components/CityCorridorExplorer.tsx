import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { hasBusinessName } from "@/lib/businessCatalogState";
import type { CityAtlasItem } from "@/lib/cityAtlas";
import { cityMapLayerUrl } from "@/lib/cityMapLayers";
import { PUBLIC_SERVICES } from "@/lib/publicServices";
import {
  ANTT_OPERATIONAL_SOURCE, ANTT_SEMIURBAN_LINKS, CITY_CORRIDORS,
  MUNICIPAL_TAG_LINES_SOURCE, publishedStopsForCorridor,
  ROAD_HIERARCHY_SOURCE, summarizeCorridorAddresses,
} from "@/lib/cityMobilityCorridors";

const roleLabels = {
  principal: "Via principal",
  integracao: "Integração entre bairros",
  secundaria: "Via secundária",
  documentada: "Via com parada publicada",
} as const;

/**
 * Textual cross-reference panel. This is intentionally NOT a GTFS/route layer:
 * an address containing a road name does not prove a front door, bus stop or
 * that a service passes the whole road. Optional company chunks stay optional.
 */
export default function CityCorridorExplorer({
  businesses,
  commercialCatalogLoaded,
}: {
  businesses: readonly CityAtlasItem[];
  commercialCatalogLoaded: boolean;
}) {
  const [selectedId, setSelectedId] = useState("avenida-jk");
  const corridor = CITY_CORRIDORS.find(entry => entry.id === selectedId) ?? CITY_CORRIDORS[0];
  const observedStops = useMemo(() => publishedStopsForCorridor(corridor.id), [corridor.id]);
  const coverage = useMemo(
    () => summarizeCorridorAddresses(corridor, businesses, PUBLIC_SERVICES, hasBusinessName),
    [corridor, businesses]
  );
  return (
    <details className="my-4 rounded-2xl border border-border bg-card shadow-sm" data-city-corridors>
      <summary className="flex min-h-12 cursor-pointer items-center px-4 py-3 text-sm font-black text-foreground">
        Corredores da cidade · ônibus, comércio e serviços
      </summary>
      <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-foreground/75">
          Explore uma via por vez. A maior parte da hierarquia viária vem da legislação municipal de 2002; vias acrescentadas a partir de nomes de paradas são identificadas separadamente. Nenhuma delas mede tráfego atual.
          Uma linha indicada nas proximidades não é um itinerário homologado da avenida.
        </p>
        <label htmlFor="city-corridor-picker" className="block text-sm font-bold text-foreground">Avenida ou corredor</label>
        <select id="city-corridor-picker" value={selectedId}
          onChange={event => setSelectedId(event.target.value)}
          className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          {CITY_CORRIDORS.map(item => (
            <option key={item.id} value={item.id}>{item.name} · {item.area}</option>
          ))}
        </select>
        <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-sm">
          <h3 className="font-black text-foreground">{corridor.name}</h3>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">
            {roleLabels[corridor.role]} · {corridor.area}.
            {corridor.role === "documentada"
              ? " Via presente em parada de ônibus publicada; não classificada nesta seleção histórica."
              : " Classificação histórica."}
            {" "}{corridor.role !== "documentada" && <a className="font-semibold text-primary underline underline-offset-2" href={ROAD_HIERARCHY_SOURCE} target="_blank" rel="noopener noreferrer">Consultar lei municipal</a>}
          </p>
          <Link href={cityMapLayerUrl(corridor.name, "ruas")}
            className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring">
            Localizar via no mapa de ruas
          </Link>
          <div className="mt-3 border-t border-border/70 pt-3">
            <h4 className="text-sm font-bold">Linhas municipais com parada nomeada nesta via</h4>
            {observedStops.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {observedStops.map(stop => (
                  <li key={stop.line + ":" + stop.corridorId} className="break-words">
                    <span className="font-black">Linha {stop.line}</span>
                    <span className="block text-xs text-foreground/70">Parada publicada: {stop.stopLabel}</span>
                    <a href={stop.directionSource} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-xs font-bold text-primary underline underline-offset-2">
                      Conferir sentido, paradas e horários
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-foreground/70">Nenhuma parada nomeada nesta via foi confirmada nas páginas consultadas; outras linhas podem existir.</p>
            )}
            <p className="mt-1 text-xs leading-relaxed text-foreground/70">
              Nomes de paradas publicados no Moovit para um sentido de cada linha TAG municipal; não são coordenadas GPS, trajetos homologados ou prova de que a linha percorra toda a via.
              {" "}<a href={MUNICIPAL_TAG_LINES_SOURCE} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline underline-offset-2">
                Ver linhas publicadas no Moovit
              </a>.
            </p>
          </div>
          {corridor.nearbyBus ? (
            <div className="mt-3">
              <h4 className="text-sm font-bold">Linhas relatadas nas proximidades</h4>
              <p className="mt-1 text-sm tabular-nums">{corridor.nearbyBus.lineIds.join(" · ")}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/70">
                Consulta de {corridor.nearbyBus.checkedAt} ao Moovit. Não confirma que essas linhas trafeguem em todo o corredor, nem horários atuais.
                {" "}<a className="font-bold text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" href={corridor.nearbyBus.sourceUrl}>Ver paradas e itinerários na fonte</a>.
              </p>
            </div>
          ) : observedStops.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-foreground/70">
              Nenhuma parada ou linha foi confirmada nesta via nas fontes consultadas; outros serviços podem existir.
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border/70 p-3">
          <h4 className="text-sm font-black">Comércio com endereço textual nesta via</h4>
          {commercialCatalogLoaded ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-foreground/75" role="status">
                {coverage.namedBusinesses.toLocaleString("pt-BR")} empresas com nome · {coverage.cnpjOnly.toLocaleString("pt-BR")} registros apenas cadastrais.
                Correspondência do nome da via no endereço declarado, não confirmação da porta ou entrada.
              </p>
              {coverage.examples.length > 0 && <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                {coverage.examples.map(item => (
                  <li key={item.id} className="break-words">{item.name} <span className="text-xs text-foreground/60">· {item.address}</span></li>
                ))}
              </ul>}
            </>
          ) : <p className="mt-1 text-xs leading-relaxed text-foreground/75">
            Catálogo comercial completo não carregado nesta camada. A consulta é opcional para preservar a velocidade.
          </p>}
          <Link href={cityMapLayerUrl(corridor.name, "todos", "all", "", "named")}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring">
            Pesquisar estabelecimentos por nome da via
          </Link>
          <p className="mt-1 text-xs text-foreground/60">Empresas sem nome continuam na consulta de CNPJ, não aparecem como marcadores.</p>
        </div>
        <div className="rounded-xl border border-border/70 p-3">
          <h4 className="text-sm font-black">Serviços públicos com endereço nesta via</h4>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">
            {coverage.publicServices.length} registro(s) do diretório local com nome desta via no endereço.
          </p>
          {coverage.publicServices.length ? (
            <ul className="mt-2 space-y-2">
              {coverage.publicServices.slice(0, 6).map(service => (
                <li key={service.id} className="text-sm">
                  <span className="font-bold">{service.name}</span>
                  <span className="block break-words text-xs text-foreground/70">{service.address}</span>
                  <a href={service.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-xs font-bold text-primary underline underline-offset-2">Conferir fonte</a>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-foreground/70">Nenhum endereço desta via encontrado no diretório; não significa ausência de atendimento.</p>}
          <Link href={appUrl("/servicos")} className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-2">Consultar todos os serviços públicos</Link>
        </div>
        <div className="rounded-xl border border-border/70 p-3">
          <h4 className="text-sm font-black">Ligações de ônibus com o Distrito Federal</h4>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">
            Ligações regionais documentadas pela ANTT. Não são linhas nem trajetos identificados nesta avenida.
            A tarifa citada é a anunciada para 28/06/2026, sujeita a novas atualizações.
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {ANTT_SEMIURBAN_LINKS.map(link => (
              <li key={link.destination} className="flex min-h-10 flex-wrap items-center justify-between gap-1">
                <span className="font-semibold">Águas Lindas ↔ {link.destination}</span>
                <span className="text-xs text-foreground/75">
                  {"publishedFare" in link ? link.publishedFare : "Consultar tarifa"}
                  {" · "}<a className="font-bold text-primary underline underline-offset-2"
                    href={link.source} target="_blank" rel="noopener noreferrer">ANTT</a>
                </span>
              </li>
            ))}
          </ul>
          <a href={ANTT_OPERATIONAL_SOURCE} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-2">
            Consultar linhas, tarifas e quadros de horários oficiais
          </a>
        </div>
        <p className="text-xs leading-relaxed text-foreground/70">
          Cobertura parcial e auditável: sem GTFS/traçado oficial de cada linha e sem pontos certificados,
          o Trajeto não desenha trajetos de ônibus inventados nem atribui coordenadas a cadastros empresariais.
        </p>
      </div>
    </details>
  );
}
