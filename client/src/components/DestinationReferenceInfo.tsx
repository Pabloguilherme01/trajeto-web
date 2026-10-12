import React from "react";
import { isAguasLindasRoutePoint } from "@/lib/mapGeometry";
import { ROUTE_DESTINATION_CATEGORIES } from "@/lib/routeDestinationCategories";

type Props = {
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  coordinateKind?: string;
  coordinateLabel?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  coordinateVerifiedAt?: string;
};

/** Public catalog metadata only; a registered position is not route readiness. */
export default function DestinationReferenceInfo(item: Props) {
  const positioned = isAguasLindasRoutePoint({ lat: item.lat!, lng: item.lng! });
  const category = ROUTE_DESTINATION_CATEGORIES.find(entry => entry.value === item.category)?.label
    ?? ({ seguranca: "Segurança", "meio-ambiente": "Meio ambiente", referencia: "Referências" } as Record<string, string>)[item.category]
    ?? "Destino";
  const position = positioned
    ? item.coordinateLabel || (item.coordinateKind === "street-midpoint" ? "Centro aproximado da via" : "Posição cadastrada")
    : item.coordinateKind === "area-reference" ? "Bairro ou setor · referência por nome" : "Endereço sem coordenadas";
  return (
    <div role="group" aria-label={"Referência de " + item.name} className="mt-2 min-w-0 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-lg bg-muted px-2 py-1 font-bold text-foreground/80">{category}</span>
        <span className="rounded-lg border border-border px-2 py-1">{position}</span>
      </div>
      {item.sourceLabel && <p className="break-words">Fonte: {item.sourceUrl
        ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={"Fonte de " + item.name} className="underline underline-offset-2">{item.sourceLabel}</a>
        : item.sourceLabel}</p>}
      {item.verifiedAt && <p>Registro verificado em: <time dateTime={item.verifiedAt}>{item.verifiedAt}</time></p>}
      {positioned && <p className="break-words">
        {item.coordinateKind === "street-midpoint" ? "Centro aproximado da via" : "Coordenadas cadastradas"}: {item.lat!.toFixed(5)}, {item.lng!.toFixed(5)}
      </p>}
      {positioned && item.coordinateVerifiedAt && <p>Posição verificada em: <time dateTime={item.coordinateVerifiedAt}>{item.coordinateVerifiedAt}</time></p>}
    </div>
  );
}
