import { X } from "lucide-react";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { DirectoryCardShape, DirectoryPriceIndex } from "@/lib/stationDirectoryModel";
import { getDirectoryCoordinates, getDirectoryGasolinePrice } from "@/lib/stationDirectoryModel";
import { getDistanceKm, type Coordinates } from "@/lib/stationDirectorySearch";

type Props = {
  open: boolean;
  onClose: () => void;
  items: DirectoryCardShape[];
  pricesByCnpj: DirectoryPriceIndex;
  userCoords: Coordinates | null;
};

function name(item: DirectoryCardShape) {
  return item.local?.displayName || item.anp?.razaoSocial || "Posto";
}

function date(item: DirectoryCardShape, prices: DirectoryPriceIndex) {
  const price = prices.get(item.key)?.find(entry => entry.productKey === "gasolina-comum");
  return price?.collectionDate ? new Date(price.collectionDate).toLocaleDateString("pt-BR") : "—";
}

function money(value: number | null) {
  return value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function StationCompareSheet({ open, onClose, items, pricesByCnpj, userCoords }: Props) {
  if (!open) return null;
  const rows = items.slice(0, 3);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="station-compare-title">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Fechar comparação" onClick={onClose} />
      <section className="absolute inset-x-2 bottom-2 mx-auto max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#10191F] shadow-[0_28px_90px_rgba(0,0,0,.6)]">
        <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5">
          <div>
            <p className="text-[0.48rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Comparação</p>
            <h2 id="station-compare-title" className="mt-1 text-base font-black">Dados lado a lado</h2>
            <p className="mt-1 text-[0.52rem] text-white/35">Máximo de 3 postos · sem ranking.</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-white/8 text-white/55" aria-label="Fechar"><X className="size-4" /></button>
        </header>

        <div className="grid gap-2 overflow-y-auto p-3 sm:grid-cols-3 sm:p-4">
          {rows.map(item => {
            const price = getDirectoryGasolinePrice(item, pricesByCnpj);
            const distance = getDistanceKm(userCoords, getDirectoryCoordinates(item));
            const hasAnp = Boolean(item.anp);
            const coords = Boolean(getDirectoryCoordinates(item));
            return (
              <article key={item.key} className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
                <h3 className="line-clamp-2 text-sm font-black text-white">{name(item)}</h3>
                <p className="mt-1 text-[0.5rem] text-white/35">{hasAnp ? "ANP" : "Catálogo local"}</p>
                <p className="mt-4 text-[1.45rem] font-black tracking-[-.04em] text-[#D9FF91]">{money(price)}</p>
                <p className="mt-1 text-[0.52rem] text-white/35">Gasolina comum · {date(item, pricesByCnpj)}</p>
                <dl className="mt-4 space-y-2 text-[0.55rem]">
                  <div className="flex justify-between gap-2"><dt className="text-white/30">Distância</dt><dd className="font-black text-white/70">{distance == null ? "—" : distance.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-white/30">Cadastro</dt><dd className="font-black text-white/70">{hasAnp ? "ANP" : "Local"}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-white/30">Coordenada</dt><dd className="font-black text-white/70">{coords ? "sim" : "não confirmada"}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
        <footer className="border-t border-white/8 px-4 py-3 text-[0.5rem] text-white/30">A comparação expõe dados disponíveis; não declara vencedor nem recomendação.</footer>
      </section>
    </div>
  );
}

export type { AnpPriceRecord };
