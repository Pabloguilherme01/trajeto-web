import {
  ArrowRight,
  BusFront,
  CloudRain,
  Radio,
  Route,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import {
  getDepartureSignals,
  type DepartureMode,
  type DepartureSignalKind,
} from "@/lib/departureAssistant";

const icons: Record<DepartureSignalKind, LucideIcon> = {
  weather: CloudRain,
  road: Route,
  connectivity: Radio,
  transit: BusFront,
  offline: WifiOff,
};

export default function DepartureAssistant({
  origin,
  destination,
  mode,
  online,
  hasOfflineRoute,
}: {
  origin: string;
  destination: string;
  mode: DepartureMode;
  online: boolean;
  hasOfflineRoute: boolean;
}) {
  const [, setLocation] = useLocation();
  const signals = useMemo(
    () =>
      getDepartureSignals({
        origin,
        destination,
        mode,
        online,
        hasOfflineRoute,
      }),
    [origin, destination, mode, online, hasOfflineRoute],
  );

  if (destination.trim().length < 3 && online) return null;
  if (signals.length === 0) return null;

  return (
    <section
      className="mt-4 rounded-[1.45rem] border border-white/10 bg-[#10191F] p-4"
      aria-labelledby="departure-assistant-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#3DE3FF]">
            Antes de sair
          </p>
          <h2 id="departure-assistant-title" className="mt-1 text-lg font-black">
            Contexto útil para esta viagem.
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-xs font-bold text-white/55">
          {signals.length}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/65">
        O Trajeto destaca fontes que podem afetar sua decisão. Nada aqui é
        tratado como alerta, trânsito ou sinal em tempo real sem uma fonte que
        garanta isso.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {signals.slice(0, 4).map(signal => {
          const Icon = icons[signal.kind];
          const body = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.05] text-[#C7FF3C]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-white">
                  {signal.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-white/65">
                  {signal.detail}
                </span>
              </span>
              {signal.resourceId && (
                <ArrowRight className="size-4 shrink-0 text-white/55" />
              )}
            </>
          );

          return signal.resourceId ? (
            <button
              key={signal.id}
              type="button"
              onClick={() =>
                setLocation(
                  appUrl("/dados") +
                    "?recurso=" +
                    encodeURIComponent(signal.resourceId!),
                )
              }
              className="flex min-h-[5.5rem] items-start gap-3 rounded-2xl border border-white/8 bg-[#0B1014] p-3 text-left transition hover:border-[#C7FF3C]/25 active:scale-[.99]"
            >
              {body}
            </button>
          ) : (
            <div
              key={signal.id}
              className="flex min-h-[5.5rem] items-start gap-3 rounded-2xl border border-[#FFB86B]/15 bg-[#FFB86B]/[.035] p-3"
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
