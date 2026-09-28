import React from "react";
import { ArrowRight, Car, Clock3, MapPinned, Settings2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { getEconomyMode, getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations, mobileDestinationEvent, type MobileDestination } from "@/lib/mobileDestinations";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { getAutomaticDailyMode, getSavedDailyMode, setSavedDailyMode, type DailyModeId } from "@/lib/dailyModes";
import { chooseMobilePrimaryAction } from "@/lib/mobilePrimaryAction";

const modeLabel: Record<DailyModeId, string> = { automatico: "Automático", proxima: "Destino frequente", repetir: "Repetir viagem", economia: "Economia", offline: "Offline" };
const SETUP_KEY = "trajeto-daily-setup";
function storage() { try { return globalThis.localStorage ?? null; } catch { return null; } }
function getSetupCompleted() { return storage()?.getItem(SETUP_KEY) === "1"; }
function setSetupCompleted(value: boolean) { try { if (value) storage()?.setItem(SETUP_KEY, "1"); else storage()?.removeItem(SETUP_KEY); } catch {} }

export default function DailySetupCard() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [mode, setMode] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [setupDone, setSetupDone] = useState(getSetupCompleted);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      void listOfflineRoutes().then(routes => setSavedRoutes(routes.length)).catch(() => setSavedRoutes(0));
      setMode(getSavedDailyMode() ?? "automatico");
      setVehicle(getMobileVehicle());
      setSetupDone(getSetupCompleted());
    };
    refresh();
    const events = [mobilePreferenceEvent, mobileDestinationEvent, mobileVehicleEvent, offlineRouteEvent];
    window.addEventListener("online", refresh); window.addEventListener("offline", refresh); window.addEventListener("focus", refresh);
    events.forEach(name => window.addEventListener(name, refresh));
    return () => {
      window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("focus", refresh);
      events.forEach(name => window.removeEventListener(name, refresh));
    };
  }, []);

  const favorite = useMemo(() => getFavoriteDestination(getMobileDestinations(), getDestinationUsage()), [mode, setupDone, savedRoutes, vehicle]);
  const lastTrip = useMemo(() => getLastTrip(), [mode, setupDone, savedRoutes]);
  const automaticMode = getAutomaticDailyMode(online, savedRoutes);
  const primary = chooseMobilePrimaryAction({ online, mode, automaticMode, savedRoutes, favorite, lastTrip });
  const canFinishSetup = Boolean(favorite || lastTrip || savedRoutes > 0 || vehicle);

  const finishSetup = () => {
    setSavedDailyMode(mode);
    if (canFinishSetup) { setSetupCompleted(true); setSetupDone(true); }
  };

  return (
    <section className="container py-2 sm:py-4" aria-labelledby="daily-setup-title">
      <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#111A21] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]"><Settings2 className="size-3.5" /> Configuração rápida</p>
              <h2 id="daily-setup-title" className="mt-1.5 font-display text-xl font-semibold tracking-[-0.05em] text-white sm:text-2xl">Deixe o Trajeto pronto para o seu dia.</h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#8FA3AC]">Destinos, rota salva, veículo e economia ficam acessíveis em poucos toques. As preferências ficam neste aparelho.</p>
            </div>
            <span className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 text-[0.58rem] font-bold text-[#B7C5CA]"><span className={"size-1.5 rounded-full " + (online ? "bg-[#C7FF3C]" : "bg-[#FFB86B]")} />{online ? "Online" : "Offline"}</span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <a href={appUrl("/planejar")} className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><MapPinned className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-xs font-extrabold text-white">Destino</p><p className="mt-0.5 truncate text-[0.58rem] text-[#7F919A]">{favorite?.value ?? "Defina um destino"}</p></a>
            <a href={appUrl("/planejar?salvos=1")} className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><Clock3 className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-xs font-extrabold text-white">Rotas</p><p className="mt-0.5 text-[0.58rem] text-[#7F919A]">{savedRoutes ? savedRoutes + (savedRoutes === 1 ? " salva" : " salvas") : "Nenhuma salva"}</p></a>
            <a href="#calculadora" className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><WalletCards className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-xs font-extrabold text-white">Economia</p><p className="mt-0.5 text-[0.58rem] text-[#7F919A]">{getEconomyMode() ? "Modo economia ativo" : "Calcular custo"}</p></a>
            <a href={appUrl("/minha-conta")} className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><Car className="size-4 text-[#FFB86B]" /><p className="mt-2 text-xs font-extrabold text-white">Veículo</p><p className="mt-0.5 truncate text-[0.58rem] text-[#7F919A]">{vehicle?.name ?? "Cadastrar veículo"}</p></a>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[0.05] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="text-[0.57rem] font-extrabold uppercase tracking-[0.13em] text-[#C7FF3C]">Próxima ação</p><p className="mt-1 text-sm font-extrabold text-white">{primary.label}</p><p className="mt-0.5 text-[0.62rem] text-[#8FA3AC]">{setupDone ? "Modo " + modeLabel[mode] : "Use o automático ou escolha seu modo preferido."}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => { const next = mode === "automatico" ? automaticMode : "automatico"; setMode(next); setSavedDailyMode(next); }} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-[#D5E0E4]">{mode === "automatico" ? "Automático" : "Usar automático"}</button><button type="button" onClick={finishSetup} disabled={!canFinishSetup} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-45">{setupDone ? "Atualizar" : "Pronto"} <ArrowRight className="size-3.5" /></button></div>
          </div>
        </div>
      </div>
    </section>
  );
}