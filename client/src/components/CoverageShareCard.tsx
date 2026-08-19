import { coverageShareCardFilename, coverageShareCardUrl } from "@/lib/coverageShareCard";
import { Download, Image as ImageIcon } from "lucide-react";

export function CoverageShareCard({ city, state, corridor, authorizedStations, sourceDate }: { city: string; state: string; corridor: string; authorizedStations: number; sourceDate: string }) {
  const input = { city, state, corridor, authorizedStations, sourceDate, url: typeof window === "undefined" ? "" : window.location.href };
  const imageUrl = coverageShareCardUrl(input);
  const download = () => { const anchor = document.createElement("a"); anchor.href = imageUrl; anchor.download = coverageShareCardFilename(city); anchor.click(); };
  return <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20"><img src={imageUrl} alt={`Cartão de cobertura de ${city}`} className="aspect-[1.9] w-full object-cover" /><div className="flex items-center justify-between gap-3 p-3"><p className="flex items-center gap-1.5 text-xs text-[#B8C8BB]"><ImageIcon className="size-3.5 text-[#3DE3FF]" />Cartão visual com fonte e data</p><button type="button" onClick={download} className="inline-flex min-h-9 items-center rounded-lg border border-[#3DE3FF]/45 px-2.5 text-xs font-bold text-[#D2F8FF] hover:bg-[#3DE3FF] hover:text-[#0B1014]"><Download className="mr-1.5 size-3.5" />Baixar imagem</button></div></div>;
}
