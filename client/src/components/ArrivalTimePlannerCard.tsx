import { useEffect, useState } from "react";
import { AlarmClock, CalendarClock, Clock3 } from "lucide-react";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { calculateDepartureTime, type ArrivalDay } from "@/lib/arrivalPlanner";

const ARRIVAL_KEY = "trajeto-arrival-planner";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function defaultArrivalTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return date.toTimeString().slice(0, 5);
}

export default function ArrivalTimePlannerCard(props: { route: RouteIntelligenceRoute | null }) {
  const [arrivalTime, setArrivalTime] = useState(defaultArrivalTime);
  const [day, setDay] = useState<ArrivalDay>("today");
  const [buffer, setBuffer] = useState(10);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ARRIVAL_KEY) || "null");
      if (saved?.arrivalTime) setArrivalTime(saved.arrivalTime);
      if (saved?.day === "today" || saved?.day === "tomorrow") setDay(saved.day);
      if (Number.isFinite(saved?.buffer)) setBuffer(Math.max(0, Math.min(60, Number(saved.buffer))));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ARRIVAL_KEY, JSON.stringify({ arrivalTime, day, buffer }));
    } catch {}
  }, [arrivalTime, day, buffer]);

  if (!props.route?.durationSeconds || props.route.durationSeconds <= 0) return null;

  const result = calculateDepartureTime(arrivalTime, day, props.route.durationSeconds, buffer);

  return (
    <section className="mt-4 rounded-3xl border border-[#3DE3FF]/15 bg-[#10191F] p-4 text-white sm:p-5" aria-labelledby="arrival-time-planner-title">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]">
          <AlarmClock className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Planejamento de saída</p>
          <h3 id="arrival-time-planner-title" className="mt-1 text-xl font-black tracking-[-.04em]">Defina a chegada. O Trajeto calcula a saída.</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/40">Usa a duração atual da rota selecionada. A margem é uma escolha sua e não uma previsão adicional do trânsito.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/50">
          Quero chegar às
          <input
            type="time"
            value={arrivalTime}
            onChange={event => setArrivalTime(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-black text-white outline-none focus:border-[#3DE3FF]"
          />
        </label>

        <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[.1em] text-white/40">Dia</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button type="button" aria-pressed={day === "today"} onClick={() => setDay("today")} className={day === "today" ? "min-h-11 rounded-xl bg-[#C7FF3C] text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/8 text-[0.6rem] font-bold text-white/60"}>Hoje</button>
            <button type="button" aria-pressed={day === "tomorrow"} onClick={() => setDay("tomorrow")} className={day === "tomorrow" ? "min-h-11 rounded-xl bg-[#C7FF3C] text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/8 text-[0.6rem] font-bold text-white/60"}>Amanhã</button>
          </div>
        </div>

        <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/50">
          Margem extra (min)
          <select value={buffer} onChange={event => setBuffer(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-black text-white outline-none focus:border-[#3DE3FF]">
            {[0, 5, 10, 15, 20, 30, 45, 60].map(value => <option key={value} value={value}>{value} min</option>)}
          </select>
        </label>
      </div>

      {result ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] p-3">
            <Clock3 className="size-3.5 text-[#C7FF3C]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Saída sugerida</p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-[-.06em] text-white">{formatTime(result.departure)}</p>
            <p className="mt-1 text-[0.52rem] text-white/35">{day === "today" ? "hoje" : "amanhã"}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <CalendarClock className="size-3.5 text-[#3DE3FF]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Chegada-alvo</p>
            <p className="mt-1 text-sm font-black">{formatTime(result.arrival)}</p>
            <p className="mt-1 text-[0.52rem] text-white/35">horário definido por você</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <Clock3 className="size-3.5 text-[#BDA5FF]" />
            <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Tempo planejado</p>
            <p className="mt-1 text-sm font-black">{result.totalPlanningMinutes} min</p>
            <p className="mt-1 text-[0.52rem] text-white/35">rota + margem escolhida</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-[0.58rem] text-amber-100">Não foi possível calcular com este horário.</p>
      )}
    </section>
  );
}
