import React, { useState } from "react";
import { getNavigationPreferences, saveNavigationPreferences, type NavigationProvider } from "@/lib/navigationPreferences";
import RouteIntelligenceCard from "./RouteIntelligenceCard";
import { supportsLiveRouting } from "@/lib/runtimeCapabilities";
import { CheckCircle2, Fuel, Navigation, RefreshCw, Route, Save, Share2, WifiOff, Map, Plus, X } from "lucide-react";

type Props = {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  recommendationName?: string | null;
  detourKm?: number | null;
  detourSource?: "real" | "estimated" | null;
  fuelCost?: number | null;
  litersNeeded?: number | null;
  autonomyKm?: number | null;
  offline: boolean;
  snapshot?: boolean;
  snapshotSavedAt?: string | null;
  saved?: boolean;
  onNavigate: () => void;
  onShare: () => void;
  onSave: () => void | Promise<void>;
  onRefresh?: () => void;
  onStations: () => void;
  onGoogleMaps?: () => void;
  onWaze?: () => void;
  onAppleMaps?: () => void;
  onMultiStopNavigate?: (waypoints: string[]) => void;
  onGoogleMapsPreferred?: (preference: "default" | "avoid-tolls" | "avoid-highways", waypoints: string[]) => void;
  onAppleMapsPreferred?: (preference: "default" | "avoid-tolls" | "avoid-highways", waypoints: string[]) => void;
  activeRouteLabel?: string | null;
  routeConfirmed?: boolean;
};

export default function MobileNavigationCenter({
  origin, destination, distance, duration, recommendationName, detourKm, detourSource,
  fuelCost, litersNeeded, autonomyKm, offline, snapshot = false, snapshotSavedAt,
  saved = false, onNavigate, onShare, onSave, onRefresh, onStations, onGoogleMaps, onWaze, onAppleMaps, onMultiStopNavigate, onGoogleMapsPreferred, onAppleMapsPreferred, activeRouteLabel = null, routeConfirmed = true,
}: Props) {
  const [stops, setStops] = useState<string[]>([]);
  const [stopDraft, setStopDraft] = useState("");
  const savedNavigation = getNavigationPreferences();
  const [routePreference, setRoutePreference] = useState<"default" | "avoid-tolls" | "avoid-highways">(savedNavigation.preference);
  const [preferredProvider, setPreferredProvider] = useState<NavigationProvider>(savedNavigation.provider);
  const addStop = () => { const value = stopDraft.trim(); if (!value || stops.length >= 3) return; setStops(current => [...current, value]); setStopDraft(""); };
  const removeStop = (index: number) => setStops(current => current.filter((_, i) => i !== index));

  const snapshotAge = snapshotSavedAt ? (() => {
    const time = Date.parse(snapshotSavedAt);
    if (!Number.isFinite(time)) return null;
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    return `há ${Math.round(hours / 24)} d`;
  })() : null;

  const canNavigate = !offline && routeConfirmed;
  const navigationReason = offline
    ? "Sem conexão: a navegação externa precisa de internet."
    : !routeConfirmed
      ? "Selecione uma rota para liberar a navegação."
      : null;
  const status = offline ? "Offline" : snapshot ? `Snapshot salvo${snapshotAge ? ` · ${snapshotAge}` : ""}` : "Dados atuais";

  return (
    <section aria-labelledby="navigation-center-title" className="mt-6 overflow-hidden rounded-[1.5rem] border border-border bg-card text-white shadow-[0_22px_70px_rgba(0,0,0,.24)]">
      <div className="border-b border-white/8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-primary">Centro de navegação</p>
            <h2 id="navigation-center-title" className="mt-2 font-display text-[clamp(1.8rem,7vw,2.8rem)] font-semibold leading-[.95] tracking-[-.055em]">Pronto para ir.</h2>
            <p className="mt-2 truncate text-sm font-semibold text-white/65" title={destination}>→ {destination}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-2 text-[0.58rem] font-black text-white/65">
            {offline ? <WifiOff className="size-3.5" /> : <CheckCircle2 className="size-3.5 text-primary" />}
            <span aria-live="polite">{status}</span>
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Rota</p>
            <p className="mt-1 text-base font-black">{distance}</p>
            <p className="text-[0.65rem] text-muted-foreground">{duration}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Combustível</p>
            <p className="mt-1 text-base font-black">{fuelCost != null ? fuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00A0/g, " ") : "—"}</p>
            <p className="text-[0.65rem] text-muted-foreground">{litersNeeded != null ? `${litersNeeded.toLocaleString("pt-BR")} L` : "configure o veículo"}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.04] p-3">
            <p className="text-[0.52rem] font-bold uppercase tracking-[.12em] text-muted-foreground">Parada</p>
            <p className="mt-1 truncate text-base font-black">{recommendationName ?? "—"}</p>
            <p className="text-[0.65rem] text-muted-foreground">{detourKm != null ? `${detourKm.toLocaleString("pt-BR")} km de desvio` : "sem parada calculada"}</p>
          </div>
        </div>

        {activeRouteLabel && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[.05] px-3 py-2.5">
            <div><p className="text-[0.5rem] font-black uppercase tracking-[.14em] text-primary">Rota selecionada</p><p className="mt-0.5 text-xs font-black text-white">{activeRouteLabel}</p></div>
            <span className="text-[0.52rem] text-muted-foreground">{routeConfirmed ? "Confirmada" : "Selecione uma rota"}</span>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5">
            <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-muted-foreground">Origem</p>
            <p className="mt-1 truncate text-xs font-bold text-white/80" title={origin}>{origin}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5">
            <p className="text-[0.5rem] font-black uppercase tracking-[.12em] text-muted-foreground">Destino</p>
            <p className="mt-1 truncate text-xs font-bold text-white/80" title={destination}>{destination}</p>
          </div>
        </div>
        {autonomyKm != null && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[.05] px-3 py-2.5 text-xs text-primary">
            <Fuel className="size-4 shrink-0" />
            Autonomia estimada: <strong>{autonomyKm.toLocaleString("pt-BR")} km</strong>
          </div>
        )}
        {recommendationName && detourKm != null && (
          <p className="mt-3 text-[0.68rem] leading-relaxed text-muted-foreground">
            Parada sugerida: <strong className="text-white/75">{recommendationName}</strong>. Desvio {detourSource === "real" ? "real" : "estimado"}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <button type="button" onClick={onNavigate} disabled={!canNavigate} aria-describedby={navigationReason ? "navigation-lock-help" : undefined} className="col-span-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-background shadow-[0_10px_28px_rgba(199,255,60,.12)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2">
          <Navigation className="size-5" /> Navegar agora
        </button>
        {navigationReason && <p id="navigation-lock-help" className="col-span-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2 text-center text-[0.62rem] font-bold leading-relaxed text-muted-foreground" role="status" aria-live="polite">{navigationReason}</p>}
        <button type="button" onClick={onStations} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white/[.07] px-3 text-xs font-black text-white active:scale-[.98]">
          <Fuel className="size-4" /> Paradas
        </button>
        <button type="button" onClick={onShare} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white/[.07] px-3 text-xs font-black text-white active:scale-[.98]">
          <Share2 className="size-4" /> Enviar
        </button>
        <button type="button" onClick={() => void onSave()} disabled={saved || (offline && snapshot)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black text-white disabled:cursor-default disabled:opacity-50">
          {saved ? <CheckCircle2 className="size-4 text-primary" /> : <Save className="size-4" />} {saved ? "Salva" : "Salvar"}
        </button>
        {onGoogleMaps && <button type="button" onClick={onGoogleMaps} disabled={!canNavigate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[.05] px-3 text-xs font-black text-accent disabled:opacity-40"><Map className="size-4" /> Google Maps</button>}
        {onWaze && <button type="button" onClick={onWaze} disabled={!canNavigate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-warning/20 bg-warning/[.05] px-3 text-xs font-black text-warning disabled:opacity-40">Waze</button>}
        {onAppleMaps && <button type="button" onClick={onAppleMaps} disabled={!canNavigate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-white disabled:opacity-40">Apple Maps</button>}
        {(onGoogleMapsPreferred || onAppleMapsPreferred) && <div className="col-span-2 rounded-xl border border-white/8 bg-white/[.03] p-3 sm:col-span-4">
          <p className="text-xs font-black text-white">Preferência da viagem</p>
          <p className="mt-1 text-[0.62rem] text-muted-foreground">O navegador escolhido calcula o trânsito e a rota atual.</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(["default","avoid-tolls","avoid-highways"] as const).map(value => <button key={value} type="button" onClick={() => setRoutePreference(value)} className={"min-h-10 rounded-lg px-2 text-[0.62rem] font-black " + (routePreference === value ? "bg-primary text-background" : "bg-white/[.06] text-white/70")}>{value === "default" ? "Equilibrada" : value === "avoid-tolls" ? "Evitar pedágios" : "Evitar rodovias"}</button>)}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(["google","waze","apple"] as const).map(provider => <button key={provider} type="button" onClick={() => { setPreferredProvider(provider); saveNavigationPreferences({ provider, preference: routePreference }); }} className={"min-h-10 rounded-lg px-2 text-[0.62rem] font-black " + (preferredProvider === provider ? "bg-white text-background" : "bg-white/[.06] text-white/70")}>{provider === "google" ? "Google" : provider === "waze" ? "Waze" : "Apple"}</button>)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {preferredProvider === "google" && onGoogleMapsPreferred && <button type="button" onClick={() => { saveNavigationPreferences({ provider: "google", preference: routePreference }); onGoogleMapsPreferred(routePreference, stops); }} disabled={!canNavigate} className="col-span-2 min-h-11 rounded-lg bg-primary text-xs font-black text-background disabled:opacity-40">Abrir no Google Maps</button>}
            {preferredProvider === "waze" && onWaze && <button type="button" onClick={() => { saveNavigationPreferences({ provider: "waze", preference: routePreference }); onWaze(); }} disabled={!canNavigate} className="col-span-2 min-h-11 rounded-lg bg-primary text-xs font-black text-background disabled:opacity-40">Abrir no Waze</button>}
            {preferredProvider === "apple" && onAppleMapsPreferred && <button type="button" onClick={() => { saveNavigationPreferences({ provider: "apple", preference: routePreference }); onAppleMapsPreferred(routePreference, stops); }} disabled={!canNavigate} className="col-span-2 min-h-11 rounded-lg bg-primary text-xs font-black text-background disabled:opacity-40">Abrir no Apple Maps</button>}
          </div>
        </div>}
        {onMultiStopNavigate && <div className="col-span-2 rounded-xl border border-white/8 bg-white/[.03] p-3 sm:col-span-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-white">Múltiplas paradas</p><p id="multi-stop-help" className="mt-1 text-[0.62rem] text-muted-foreground">{stops.length < 3 ? `Até 3 paradas · ${stops.length}/3 adicionadas.` : "Limite de 3 paradas atingido."}</p></div></div>{stops.map((stop, index) => <div key={stop + index} className="mt-2 flex items-center gap-2 rounded-lg bg-white/[.04] px-3 py-2 text-xs text-white"><span className="font-black text-primary">{index + 1}</span><span className="min-w-0 flex-1 truncate">{stop}</span><button type="button" aria-label={"Remover parada " + (index + 1)} onClick={() => removeStop(index)}><X className="size-3.5" /></button></div>)}{stops.length < 3 && <div className="mt-2 flex gap-2"><input value={stopDraft} onChange={event => setStopDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addStop(); } }} inputMode="text" enterKeyHint="done" placeholder="Ex.: posto, endereço ou cidade" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[.04] px-3 py-3 text-xs text-white outline-none placeholder:text-muted-foreground" aria-label="Nova parada" aria-describedby="multi-stop-help" /><button type="button" onClick={addStop} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-white/[.08] px-3 text-xs font-black"><Plus className="size-4" />Adicionar</button></div>}{stops.length > 0 && onMultiStopNavigate && <button type="button" onClick={() => onMultiStopNavigate(stops)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-black text-background"><Navigation className="size-4" />Navegar com {stops.length} {stops.length === 1 ? "parada" : "paradas"} no Google Maps</button>}</div>}
        {snapshot && onRefresh && !offline && (
          <button type="button" onClick={onRefresh} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/25 px-3 text-xs font-black text-primary">
            <RefreshCw className="size-4" /> Atualizar
          </button>
        )}
      </div>

      {!offline && supportsLiveRouting() && <RouteIntelligenceCard origin={origin} destination={destination} waypoints={stops} />}

      <p className="border-t border-white/8 px-4 py-2.5 text-center text-[0.56rem] font-semibold leading-relaxed text-muted-foreground">
        {offline
          ? "A rota salva continua disponível. Dados novos e navegação externa precisam de conexão."
          : "O Google Maps abre a navegação externa. Mantenha a atenção na direção."}
      </p>
    </section>
  );
}
