import React, { useMemo, useState } from "react";
import { ArrowRight, Bus, Fuel, HeartPulse, Landmark, LocateFixed, MapPinned, Navigation, Search } from "lucide-react";

import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { resolveIntentQuery } from "@/lib/intentResolver";
import { normalizePlaceSearchText } from "@/lib/placeSearch";
import { rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { searchOfflineDestinations } from "@/lib/offlineDestinations";
import { vibration } from "@/lib/mobileTools";

type Props = { onMessage?: (message: string) => void };

const presets = [
  { label: "Abastecer", icon: Fuel, query: "postos", tone: "primary" },
  { label: "Saúde", icon: HeartPulse, query: "hospital", tone: "secondary" },
  { label: "Transporte", icon: Bus, query: "rodoviaria", tone: "secondary" },
  { label: "Serviços", icon: Landmark, query: "vapt vupt", tone: "secondary" },
] as const;

export default function QuickResolver({ onMessage }: Props) {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);

  const offlineMatches = useMemo(() => searchOfflineDestinations(input).slice(0, 4), [input]);

  const go = (query: string) => {
    const value = query.trim();
    if (value.length < 2) {
      onMessage?.("Digite o que você precisa.");
      return;
    }

    const offline = searchOfflineDestinations(value)[0];
    const normalizedValue = normalizePlaceSearchText(value);
    const normalizedName = offline ? normalizePlaceSearchText(offline.name) : "";
    const normalizedShortName = offline ? normalizePlaceSearchText(offline.shortName) : "";
    const isSpecificOfflineMatch = Boolean(
      offline &&
      value.length >= 4 &&
      (normalizedValue === normalizedName || normalizedValue === normalizedShortName),
    );
    if (offline && isSpecificOfflineMatch) {
      rememberIntent("route");
      vibration(8);
      setLocation(appUrl("/local/" + encodeURIComponent(offline.id)));
      return;
    }

    const intent = resolveIntentQuery(value);
    rememberSearch(value);
    rememberIntent(intent.kind === "route" ? "route" : "explore");
    vibration(8);

    if (intent.kind === "route") {
      setLocation(appUrl("/planejar") + "?offline=1&destino=" + encodeURIComponent(value));
      return;
    }

    setLocation(appUrl("/mapa") + "?q=" + encodeURIComponent(intent.query));
  };

  return (
    <section className="mt-5 rounded-[1.55rem] border border-[#3DE3FF]/15 bg-[#0E171D] p-3.5 shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-5" aria-labelledby="quick-resolver-title">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.06] text-[#C7FF3C]">
          <MapPinned className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.52rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Assistente local</p>
          <h2 id="quick-resolver-title" className="mt-1 font-display text-xl font-semibold tracking-[-.04em]">Resolver agora</h2>
          <p className="mt-1.5 text-[0.62rem] leading-relaxed text-white/40">Diga o que você precisa. O Trajeto tenta resolver a intenção primeiro e mantém a busca local quando estiver sem internet.</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-[#0A1014] p-2">
        <div className="flex items-center gap-2 px-2">
          <Search className="size-4 shrink-0 text-white/30" aria-hidden="true" />
          <label htmlFor="quick-resolver-search" className="sr-only">Resolver uma necessidade</label>
          <input
            id="quick-resolver-search"
            value={input}
            onChange={event => setInput(event.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={event => { if (event.key === "Enter") go(input); }}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/25"
            placeholder="hospital perto do Centro, posto, Vapt Vupt…"
            enterKeyHint="search"
          />
          <button type="button" onClick={() => go(input)} className="mobile-action-icon border-0 bg-transparent text-[#C7FF3C]" aria-label="Resolver busca">
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => go(item.query)} className={item.tone === "primary" ? "mobile-action mobile-action-primary min-h-12 justify-start rounded-2xl px-3" : "mobile-action mobile-action-secondary min-h-12 justify-start rounded-2xl px-3"}>
              <Icon className="size-4 shrink-0" />{item.label}
            </button>
          );
        })}
      </div>

      {expanded && input.trim().length >= 2 && offlineMatches.length > 0 && (
        <div className="mt-2 rounded-2xl border border-white/8 bg-white/[.02] p-2" aria-label="Sugestões locais">
          <p className="px-2 py-1 text-[0.48rem] font-black uppercase tracking-[.15em] text-white/25">Disponível localmente</p>
          {offlineMatches.map(item => (
            <button key={item.id} type="button" onClick={() => go(item.name)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-white/[.03]">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#3DE3FF]/[.08] text-[#3DE3FF]"><MapPinned className="size-3.5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{item.shortName}</span><span className="block truncate text-[0.52rem] text-white/35">{item.address}</span></span>
              <Navigation className="size-3.5 text-white/25" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => { rememberIntent("nearby"); setLocation(appUrl("/mapa")); }} className="mobile-action mobile-action-secondary min-h-10 rounded-full px-3 text-[0.55rem]"><LocateFixed className="size-3.5" /> Perto de mim</button>
        <button type="button" onClick={() => go("rodoviaria")} className="mobile-action mobile-action-secondary min-h-10 rounded-full px-3 text-[0.55rem]">Rodoviária</button>
        <button type="button" onClick={() => go("prefeitura")} className="mobile-action mobile-action-secondary min-h-10 rounded-full px-3 text-[0.55rem]">Prefeitura</button>
      </div>
    </section>
  );
}
