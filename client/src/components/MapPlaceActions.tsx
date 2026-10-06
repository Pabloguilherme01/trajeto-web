import React, { useEffect, useState } from "react";
import { Copy, Share2, Ruler, X, Navigation } from "lucide-react";
import type { StationMapItem } from "./StationMap";
import { buildDestinationPlannerUrl } from "@/lib/tripLinks";
import { buildOrganicMapsNavigationUrl } from "@/lib/mobileTools";

/** Share the named destination only; never append the user's GPS to a link. */
export default function MapPlaceActions({ place }: { place: StationMapItem }) {
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [measureFrom, setMeasureFrom] = useState<StationMapItem | null>(null);
  useEffect(() => { setNotice(""); setFailed(false); }, [place.id, place.name, place.address]);
  if (["origin", "live-position", "device-location"].includes(place.id ?? "")) return null;
  const destination = [place.name, place.address].filter(Boolean).join(" · ");
  const validPoint = (item: StationMapItem) => typeof item.lat === "number" && typeof item.lng === "number" && Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180 && (item.lat !== 0 || item.lng !== 0);
  let metres: number | null = null;
  if (measureFrom && validPoint(measureFrom) && validPoint(place)) {
    const rad = (value: number) => value * Math.PI / 180;
    const a = Math.sin(rad(place.lat! - measureFrom.lat!) / 2) ** 2 + Math.cos(rad(measureFrom.lat!)) * Math.cos(rad(place.lat!)) * Math.sin(rad(place.lng! - measureFrom.lng!) / 2) ** 2;
    metres = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }
  const share = async () => {
    setNotice(""); setFailed(false);
    try {
      const url = new URL(buildDestinationPlannerUrl(destination), window.location.origin).href;
      if (typeof navigator.share === "function") {
        await navigator.share({ title: place.name, text: destination, url });
        setNotice("Lugar compartilhado.");
      } else {
        await navigator.clipboard.writeText(destination + "\n" + url);
        setNotice("Link do lugar copiado para enviar.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFailed(true); setNotice("Não foi possível compartilhar. Tente copiar o endereço.");
    }
  };
  const openOrganicMaps = () => {
    if (!validPoint(place)) return;
    const url = buildOrganicMapsNavigationUrl({ lat: place.lat!, lng: place.lng! }, place.name, "drive");
    if (!url) return;
    window.location.href = url;
  };
  const copy = async () => {
    setNotice(""); setFailed(false);
    try { await navigator.clipboard.writeText(place.address); setNotice("Endereço copiado."); }
    catch { setFailed(true); setNotice("Não foi possível copiar. Confira a permissão do navegador."); }
  };
  return <div className="mt-3">
    <div className="flex flex-wrap gap-2 [&>button]:flex-1 [&>button]:basis-32">
      <button type="button" onClick={() => void share()} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/[.06] px-2 text-xs font-bold text-primary"><Share2 className="size-4 shrink-0" />Compartilhar</button>
      <button type="button" disabled={!place.address} onClick={() => void copy()} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-border/15 bg-background px-2 text-xs font-bold text-foreground/80 disabled:opacity-40"><Copy className="size-4 shrink-0" />Copiar endereço</button>
      {validPoint(place) && <button type="button" onClick={openOrganicMaps} className="flex min-h-11 min-w-0 flex-1 basis-32 items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/[.06] px-2 text-xs font-bold text-accent"><Navigation className="size-4 shrink-0" />Organic Maps</button>}
    </div>
    {!measureFrom && validPoint(place) && <button type="button" onClick={() => setMeasureFrom(place)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/15 bg-background px-2 text-xs font-bold text-foreground/80"><Ruler className="size-4" />Medir a partir daqui</button>}
    {measureFrom && <div className="mt-2 rounded-xl border border-border/10 bg-muted/[.04] p-3">
      <p role="status" className="text-xs leading-relaxed text-foreground/80">{metres !== null && metres > 0 ? <><strong>{metres < 1000 ? Math.round(metres).toLocaleString("pt-BR") + " m" : (metres / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " km"} em linha reta</strong><br />{measureFrom.name} → {place.name}</> : "Agora escolha outro lugar no mapa."}</p>
      <button type="button" onClick={() => setMeasureFrom(null)} className="mt-1 flex min-h-11 items-center gap-2 text-xs font-bold text-foreground/80"><X className="size-4" />Encerrar medição</button>
    </div>}
    {notice && <p role={failed ? "alert" : "status"} className={"mt-2 text-xs leading-relaxed " + (failed ? "text-warning" : "text-muted-foreground")}>{notice}</p>}
  </div>;
}
