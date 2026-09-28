import React, { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, RotateCcw } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations, mobileDestinationEvent } from "@/lib/mobileDestinations";
import { getDepartureChecklist, resetDepartureChecklist, setDepartureChecklistCompleted, type DepartureChecklistId } from "@/lib/departureChecklist";

const checklist: Array<{ id: DepartureChecklistId; label: string; detail: string }> = [
  { id: "route", label: "Rota pronta", detail: "Tenha uma rota recente ou salva antes de sair." },
  { id: "destination", label: "Destino definido", detail: "Use um destino frequente para evitar digitação." },
  { id: "vehicle", label: "Veículo conferido", detail: "Seu veículo salvo deixa o cálculo de custo mais rápido." },
  { id: "documents", label: "Documentos acessíveis", detail: "Deixe a CNH e o documento do veículo acessíveis no celular." },
  { id: "fuel", label: "Combustível ou carga", detail: "Confirme manualmente se há autonomia suficiente para a viagem." },
];

const docsUrl = "https://www.gov.br/pt-br/servicos/obter-carteira-digital-de-transito";

export default function DailyDepartureChecklist() {
  const [state, setState] = useState(() => getDepartureChecklist());
  const [context, setContext] = useState({ savedRoutes: 0, destination: false, vehicle: false, trip: false });

  useEffect(() => {
    const refresh = () => {
      setState(getDepartureChecklist());
      void listOfflineRoutes().then(routes => setContext(current => ({ ...current, savedRoutes: routes.length }))).catch(() => {});
      setContext(current => ({
        ...current,
        destination: Boolean(getFavoriteDestination(getMobileDestinations(), getDestinationUsage())),
        vehicle: Boolean(getMobileVehicle()),
        trip: Boolean(getLastTrip()),
      }));
    };
    refresh();
    window.addEventListener("trajeto-departure-checklist", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("trajeto-departure-checklist", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const completed = state.completed.length;
  const readiness = useMemo(() => {
    const automatic = [
      context.savedRoutes > 0 || context.trip,
      context.destination,
      context.vehicle,
    ].filter(Boolean).length;
    return Math.min(checklist.length, completed + automatic);
  }, [completed, context]);

  const toggle = (id: DepartureChecklistId) => {
    setState(setDepartureChecklistCompleted(id, !state.completed.includes(id)));
  };

  return (
    <section className="container py-3 sm:py-4" aria-labelledby="departure-checklist-title">
      <div className="mobile-card overflow-hidden border border-white/10 bg-[#111A21] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-[#3DE3FF]">
              <ClipboardCheck className="size-3.5" /> Antes de sair
            </p>
            <h2 id="departure-checklist-title" className="mt-1 text-lg font-extrabold tracking-[-0.03em] text-white">Checklist de saída</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#8497A0]">O Trajeto lembra o básico e você marca o que já conferiu. O estado reinicia a cada dia.</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 px-2.5 py-1 text-[0.58rem] font-black text-[#DFFF9A]">{readiness}/{checklist.length}</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map(item => {
            const checked = state.completed.includes(item.id);
            const automatic = item.id === "route" ? context.savedRoutes > 0 || context.trip : item.id === "destination" ? context.destination : item.id === "vehicle" ? context.vehicle : false;
            return (
              <button key={item.id} type="button" aria-pressed={checked} onClick={() => toggle(item.id)} className={checked ? "flex min-h-16 items-center gap-3 rounded-xl border border-[#C7FF3C]/35 bg-[#C7FF3C]/8 p-3 text-left" : "flex min-h-16 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-left"}>
                <span className={checked ? "grid size-8 shrink-0 place-items-center rounded-lg bg-[#C7FF3C] text-[#0B1014]" : "grid size-8 shrink-0 place-items-center rounded-lg border border-white/15 text-transparent"}>
                  <Check className="size-4" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-xs font-extrabold text-white">{item.label}{automatic && !checked ? " · pronto" : ""}</strong>
                  <span className="mt-0.5 block text-[0.62rem] leading-relaxed text-[#7F919A]">{item.detail}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a href={docsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-[#B9C7CD] hover:border-[#3DE3FF]">
            Documentos oficiais <ExternalLink className="size-3.5" />
          </a>
          <button type="button" onClick={() => setState(resetDepartureChecklist())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-[#B9C7CD]">
            Limpar hoje <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
