import { AlarmClock, CalendarClock, ChevronDown, Clock3 } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  calculateDepartureTime,
  defaultArrivalTarget,
  departureMinutesDelta,
  describeDepartureStatus,
  type ArrivalDay,
} from "@/lib/arrivalPlanner";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function ArrivalTimePlannerCard({ durationSeconds }: { durationSeconds: number | null | undefined }) {
  const [initial] = useState(() => defaultArrivalTarget());
  const [arrivalTime, setArrivalTime] = useState(initial.time);
  const [day, setDay] = useState<ArrivalDay>(initial.day);
  const [buffer, setBuffer] = useState(10);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  const result = calculateDepartureTime(arrivalTime, day, durationSeconds, buffer, now);
  const status = result ? describeDepartureStatus(result.departure, now) : null;
  const delta = result ? departureMinutesDelta(result.departure, now) : 0;
  const statusMessage =
    status === "upcoming"
      ? "Saia em cerca de " + Math.max(1, delta) + " min."
      : status === "due"
        ? "A janela de saída é agora."
        : status === "late"
          ? "Este horário de saída já passou. Ajuste a chegada ou saia assim que puder."
          : "";

  return (
    <details className="mt-3 min-w-0 overflow-hidden rounded-[1.5rem] border border-[#3DE3FF]/15 bg-[#10191F] text-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]">
          <AlarmClock className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Planejar horário</span>
          <span className="mt-0.5 block break-words text-sm font-black">Precisa chegar em um horário? Calcule quando sair.</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-white/35" />
      </summary>

      <div className="border-t border-white/8 px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-white/45">
          O cálculo usa apenas a duração desta rota e a margem que você escolher. Não inventa trânsito extra e não salva seu horário.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="min-w-0 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.62rem] font-bold text-white/55">
            Quero chegar às
            <input
              aria-label="Quero chegar às"
              type="time"
              value={arrivalTime}
              onChange={event => setArrivalTime(event.target.value)}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-black text-white outline-none focus:border-[#3DE3FF]"
            />
          </label>

          <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <p className="text-[0.62rem] font-bold text-white/55">Dia</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={day === "today"}
                onClick={() => setDay("today")}
                className={day === "today" ? "min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-xs font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/10 px-2 text-xs font-bold text-white/65"}
              >
                Hoje
              </button>
              <button
                type="button"
                aria-pressed={day === "tomorrow"}
                onClick={() => setDay("tomorrow")}
                className={day === "tomorrow" ? "min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-xs font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/10 px-2 text-xs font-bold text-white/65"}
              >
                Amanhã
              </button>
            </div>
          </div>

          <label className="min-w-0 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.62rem] font-bold text-white/55">
            Margem extra
            <select
              aria-label="Margem extra"
              value={buffer}
              onChange={event => setBuffer(Number(event.target.value))}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-black text-white outline-none focus:border-[#3DE3FF]"
            >
              {[0, 5, 10, 15, 20, 30, 45, 60].map(value => <option key={value} value={value}>{value} min</option>)}
            </select>
          </label>
        </div>

        {result ? (
          <>
            <div className={"mt-3 rounded-2xl border p-3 " + (status === "late" ? "border-[#FFB86B]/20 bg-[#FFB86B]/[.05]" : status === "due" ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/[.05]" : "border-[#3DE3FF]/15 bg-[#3DE3FF]/[.035]")} role="status" aria-live="polite">
              <p className="text-xs font-black">{statusMessage}</p>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
              <div className="min-w-0 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] p-3">
                <Clock3 className="size-4 text-[#C7FF3C]" />
                <p className="mt-2 text-[0.55rem] font-black uppercase tracking-[.1em] text-white/35">Saída sugerida</p>
                <p className="mt-1 break-words text-xl font-black">{formatTime(result.departure)}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[.025] p-3">
                <CalendarClock className="size-4 text-[#3DE3FF]" />
                <p className="mt-2 text-[0.55rem] font-black uppercase tracking-[.1em] text-white/35">Chegada-alvo</p>
                <p className="mt-1 break-words text-xl font-black">{formatTime(result.arrival)}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[.025] p-3">
                <AlarmClock className="size-4 text-[#BDA5FF]" />
                <p className="mt-2 text-[0.55rem] font-black uppercase tracking-[.1em] text-white/35">Tempo reservado</p>
                <p className="mt-1 break-words text-xl font-black">{result.totalPlanningMinutes} min</p>
              </div>
            </div>
            <p className="mt-2 text-[0.62rem] leading-relaxed text-white/35">
              {result.routeMinutes} min da rota + {result.bufferMinutes} min de margem. Tudo calculado neste aparelho.
            </p>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.04] p-3 text-xs font-bold text-[#FFD9AF]">
            Ajuste o horário para calcular uma saída válida.
          </p>
        )}
      </div>
    </details>
  );
}
