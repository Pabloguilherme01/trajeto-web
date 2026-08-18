import { Button } from "@/components/ui/button";
import { corridorPresets } from "@/lib/corridorPresets";
import { trpc } from "@/lib/trpc";
import { BellRing, Clock3, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type AlertPreference = {
  id: number;
  corridorId: string;
  corridorLabel: string;
  timeSlot: "morning" | "afternoon" | "evening" | "anytime";
  active: boolean;
};

const slots = [
  { value: "morning", label: "Manhã · 6h–10h" },
  { value: "afternoon", label: "Tarde · 11h–16h" },
  { value: "evening", label: "Fim do dia · 17h–21h" },
  { value: "anytime", label: "Qualquer horário" },
] as const;

export function RouteAlertPreferences({ alerts }: { alerts: AlertPreference[] }) {
  const [corridorId, setCorridorId] = useState(corridorPresets[0]?.id ?? "");
  const [timeSlot, setTimeSlot] = useState<(typeof slots)[number]["value"]>("morning");
  const utils = trpc.useUtils();
  const save = trpc.personal.saveRouteAlert.useMutation({ onSuccess: () => utils.personal.overview.invalidate() });
  const remove = trpc.personal.removeRouteAlert.useMutation({ onSuccess: () => utils.personal.overview.invalidate() });
  const liveAlerts = trpc.personal.liveAlerts.useQuery(undefined, {
    enabled: alerts.length > 0,
    retry: 1,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
  const selected = useMemo(() => corridorPresets.find(item => item.id === corridorId), [corridorId]);
  const lastUpdated = liveAlerts.data?.checkedAt ? new Date(liveAlerts.data.checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;

  return <section className="mt-8 overflow-hidden rounded-3xl border border-[#3DE3FF]/25 bg-[#0F1B20] p-6 text-white sm:p-7">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Alertas de corredor</p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Escolha quando acompanhar.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A8BBC3]">Guarde um corredor e horário. A Trajeto registra seu consentimento e atualiza ocorrências reais a cada cinco minutos enquanto esta área permanece aberta.</p>
      </div>
      <BellRing className="size-7 text-[#C7FF3C]" />
    </div>

    <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs font-bold text-[#B8C9CF]">Corredor
        <select value={corridorId} onChange={event => setCorridorId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-[#0B1014] px-3 text-sm text-white outline-none focus:border-[#3DE3FF]">
          {corridorPresets.map(item => <option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-[#B8C9CF]">Horário
        <select value={timeSlot} onChange={event => setTimeSlot(event.target.value as (typeof slots)[number]["value"])} className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-[#0B1014] px-3 text-sm text-white outline-none focus:border-[#3DE3FF]">
          {slots.map(slot => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
        </select>
      </label>
      <Button onClick={() => selected && save.mutate({ corridorId: selected.id, corridorLabel: selected.label, timeSlot, active: true, consent: true })} disabled={!selected || save.isPending} className="mt-5 h-11 rounded-xl bg-[#C7FF3C] px-5 font-bold text-[#0B1014] hover:bg-white">
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar alerta"}
      </Button>
    </div>

    {alerts.length ? <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs text-[#A8BBC3]">Atualização automática a cada 5 minutos enquanto a área estiver aberta.</p>{lastUpdated && <p className="mt-1 text-[0.68rem] text-[#6D858F]">Última atualização: {lastUpdated}.</p>}</div>
        <Button onClick={() => liveAlerts.refetch()} disabled={liveAlerts.isFetching} className="h-9 rounded-lg border border-[#3DE3FF]/50 bg-transparent px-3 text-xs font-bold text-[#3DE3FF] hover:bg-[#3DE3FF] hover:text-[#0B1014]">
          {liveAlerts.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : "Atualizar agora"}
        </Button>
      </div>

      {liveAlerts.data && <div className="mt-4 grid gap-3">
        {liveAlerts.data.alerts.map(alert => <div key={alert.corridorId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-white">{alert.corridorLabel}</p><span className={`text-[0.62rem] font-bold uppercase tracking-[0.12em] ${alert.inWindow ? "text-[#C7FF3C]" : "text-[#A8BBC3]"}`}>{alert.inWindow ? "Janela ativa" : "Fora da janela"}</span></div>
          {alert.traffic ? <><p className="mt-2 text-xs text-[#A8BBC3]">{alert.traffic.label} · {new Date(alert.traffic.checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>{alert.traffic.incidents.slice(0, 2).map(incident => <p key={incident.id} className="mt-2 border-l-2 border-[#FF7D6A] pl-3 text-xs leading-relaxed text-[#FFD0C6]">{incident.description}{incident.delaySeconds ? ` · ${Math.round(incident.delaySeconds / 60)} min` : ""}</p>)}</> : <p className="mt-2 text-xs text-[#A8BBC3]">Não foi possível localizar o corredor para consulta.</p>}
        </div>)}
      </div>}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {alerts.map(alert => <div key={alert.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Clock3 className="size-4 text-[#3DE3FF]" /><div className="min-w-0 flex-1"><p className="font-bold text-white">{alert.corridorLabel}</p><p className="mt-1 text-xs text-[#A8BBC3]">{slots.find(slot => slot.value === alert.timeSlot)?.label ?? "Qualquer horário"}</p></div><button onClick={() => remove.mutate({ corridorId: alert.corridorId })} disabled={remove.isPending} className="grid size-9 place-items-center rounded-lg border border-white/10 text-[#FFAA9C] transition hover:bg-[#FF7D6A]/15" aria-label={`Remover alerta de ${alert.corridorLabel}`}><Trash2 className="size-4" /></button></div>)}
      </div>
    </> : <p className="mt-6 border-t border-dashed border-white/15 pt-5 text-sm text-[#A8BBC3]">Nenhum corredor salvo para alertas ainda.</p>}
  </section>;
}
