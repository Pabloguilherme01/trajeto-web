import React, { useMemo, useState } from "react";
import { ChevronRight, MapPinned, Search, Share2, Siren, WifiOff } from "lucide-react";

import { appUrl } from "@/lib/appUrl";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildOfflineDestinationShareText, buildOfflineDestinationShareUrl, buildWazeNavigationUrl, getPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import {
  OFFLINE_DESTINATION_CATEGORIES,
  searchOfflineDestinations,
  type OfflineDestination,
  type OfflineDestinationCategory,
} from "@/lib/offlineDestinations";

type Props = {
  onSelectDestination: (destination: OfflineDestination) => void;
  compact?: boolean;
  highlightedDestinationId?: string | null;
};

function categoryLabel(category: OfflineDestinationCategory) {
  return OFFLINE_DESTINATION_CATEGORIES.find(item => item.id === category)?.label ?? category;
}

export default function OfflineRouteHub({ onSelectDestination, compact = false, highlightedDestinationId = null }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<OfflineDestinationCategory | "todos">("todos");
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(() => searchOfflineDestinations(query, category), [query, category]);
  const visible = showAll || query.trim() || category !== "todos" ? results : results.slice(0, compact ? 5 : 8);

  const choose = (destination: OfflineDestination) => {
    onSelectDestination(destination);
  };

  const share = async (destination: OfflineDestination) => {
    try {
      await shareText(
        buildOfflineDestinationShareText(destination),
        buildOfflineDestinationShareUrl(destination.id),
        "Trajeto · " + destination.shortName,
      );
    } catch {}
  };

  const navigate = (destination: OfflineDestination) => {
    const provider = getPreferredNavigationProvider();
    const url = provider === "waze"
      ? buildWazeNavigationUrl(destination.address)
      : provider === "apple"
        ? buildAppleMapsDirectionsUrl(destination.address)
        : buildGoogleMapsDirectionsUrl("", destination.address, "driving", true);
    window.open(url, "_blank", "noopener,noreferrer");
    vibration(8);
  };

  return (
    <section id="offline-route-hub" className="mt-5 rounded-[1.55rem] border border-[#3DE3FF]/15 bg-[#0E171D] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,.24)] sm:p-5" aria-labelledby="offline-route-hub-title">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.06] text-[#C7FF3C]">
          <MapPinned className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.52rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Disponível sem internet</p>
          <h2 id="offline-route-hub-title" className="mt-1 font-display text-xl font-semibold tracking-[-.045em]">Rotas rápidas para pontos essenciais</h2>
          <p className="mt-1.5 text-[0.64rem] leading-relaxed text-white/42">
            Endereços institucionais ficam prontos neste aparelho. Escolha um destino mesmo offline; o cálculo ao vivo e o trânsito entram quando uma conexão estiver disponível.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-[#0A1014] p-2">
        <div className="flex items-center gap-2 px-2">
          <Search className="size-4 shrink-0 text-white/30" aria-hidden="true" />
          <label htmlFor="offline-route-search" className="sr-only">Pesquisar ponto pronto offline</label>
          <input
            id="offline-route-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/25"
            placeholder="Hospital, Vapt Vupt, rodoviária…"
            enterKeyHint="search"
          />
        </div>
      </div>

      <div className="mobile-scroll-x mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Categorias de pontos offline">
        {OFFLINE_DESTINATION_CATEGORIES.map(item => {
          const active = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setCategory(item.id); setShowAll(false); }}
              aria-pressed={active}
              className={active
                ? "min-h-10 shrink-0 rounded-full bg-[#C7FF3C] px-3 text-[0.54rem] font-black text-[#0B1014]"
                : "min-h-10 shrink-0 rounded-full border border-white/8 bg-white/[.025] px-3 text-[0.54rem] font-black text-white/52"}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map(destination => (
          <article
            key={destination.id}
            className={"group rounded-[1.25rem] border bg-[#121B22] p-3.5 transition-colors " +
              (highlightedDestinationId === destination.id ? "border-[#C7FF3C]/35 bg-[#C7FF3C]/[.045]" : "border-white/8")}
          >
            <div className="flex items-start gap-3">
              <div className={"grid size-10 shrink-0 place-items-center rounded-xl " +
                (destination.emergency ? "bg-[#FF7D6A]/10 text-[#FFB7A9]" : "bg-[#3DE3FF]/[.08] text-[#3DE3FF]")}>
                {destination.emergency ? <Siren className="size-4" /> : <MapPinned className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.49rem] font-black uppercase tracking-[.12em] text-white/25">{categoryLabel(destination.category)}</p>
                    <h3 className="mt-0.5 text-sm font-black leading-snug"><a className="hover:underline" href={appUrl("/local/" + encodeURIComponent(destination.id))}>{destination.shortName}</a></h3>
                  </div>
                  {destination.emergency && <span className="rounded-full border border-[#FF7D6A]/20 bg-[#FF7D6A]/[.05] px-2 py-1 text-[0.46rem] font-black text-[#FFB7A9]">urgência</span>}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[0.59rem] leading-relaxed text-white/42">{destination.address}</p>
                <p className="mt-2 line-clamp-2 text-[0.56rem] leading-relaxed text-white/28">{destination.description}</p>
                <p className="mt-2 text-[0.48rem] font-bold text-white/25">Fonte: {destination.sourceLabel}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <button
                type="button"
                onClick={() => choose(destination)}
                className="mobile-action mobile-action-primary min-h-11"
                aria-label={"Usar " + destination.name + " como destino"}
              >
                Usar como destino
                <ChevronRight className="ml-auto size-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(destination)}
                className="mobile-action mobile-action-secondary min-h-11"
                aria-label={"Abrir navegação para " + destination.name}
              >
                Navegar
                <ChevronRight className="ml-auto size-4" />
              </button>
              <button
                type="button"
                onClick={() => void share(destination)}
                className="mobile-action mobile-action-icon border-white/10 bg-white/[.025] text-white/55"
                aria-label={"Compartilhar " + destination.name}
                title="Compartilhar"
              >
                <Share2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {!visible.length && (
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-sm text-white/45">
          Nenhum ponto offline corresponde à busca. Tente o nome da instituição, bairro ou serviço.
        </div>
      )}

      {results.length > visible.length && !query.trim() && category === "todos" && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mobile-action mobile-action-secondary mt-3 w-full min-h-11"
        >
          Ver todos os pontos prontos
          <span className="ml-auto text-white/30">{results.length}</span>
        </button>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/7 bg-white/[.018] px-3 py-2.5">
        <WifiOff className="mt-0.5 size-3.5 shrink-0 text-[#FFB86B]" />
        <p className="text-[0.5rem] leading-relaxed text-white/30">
          O modo offline guarda o destino e a referência. Ele não inventa distância, trânsito ou instruções de rua. Esses dados são recalculados pelo navegador de mapas quando houver conexão.
        </p>
      </div>
    </section>
  );
}
