import { ArrowRight, BadgeCheck, Compass, Fuel, MapPinned, Route as RouteIcon, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";

type Mission = { id: string; title: string; detail: string; xp: number; href: string; icon: typeof Compass };

const missions: Mission[] = [
  { id: "mapa", title: "Explore o mapa", detail: "Abra o mapa da cidade e conheça os postos disponíveis.", xp: 20, href: "/mapa", icon: MapPinned },
  { id: "ficha", title: "Abra uma ficha", detail: "Veja fonte, confiança e como chegar em um local.", xp: 25, href: "/local/rham", icon: Fuel },
  { id: "rota", title: "Planeje uma saída", detail: "Informe um destino e abra a navegação.", xp: 30, href: "/planejar", icon: RouteIcon },
];

const STORAGE_KEY = "trajeto:explorer:missions";

function readCompleted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function Explorer() {
  const [, setLocation] = useLocation();
  const [completed, setCompleted] = useState<string[]>(readCompleted);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(completed)); } catch {}
  }, [completed]);

  const complete = (mission: Mission) => {
    setCompleted(current => current.includes(mission.id) ? current : [...current, mission.id]);
    setLocation(appUrl(mission.href));
  };

  const xp = missions.filter(item => completed.includes(item.id)).reduce((sum, item) => sum + item.xp, 0);
  const level = Math.floor(xp / 50) + 1;

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-3xl pt-5 sm:pt-8">
        <header className="rounded-[1.7rem] border border-white/10 bg-[#121B22] p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Compass className="size-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.55rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Explorer · opcional</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-.05em]">Descubra o Trajeto jogando.</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50">Missões locais usando somente ações reais do aplicativo. Seu progresso fica neste aparelho.</p>
            </div>
            <div className="text-right">
              <Trophy className="ml-auto size-5 text-[#FFB86B]" />
              <p className="mt-1 text-lg font-black">{xp} XP</p>
              <p className="text-[0.5rem] font-bold uppercase tracking-[.12em] text-white/30">Nível {level}</p>
            </div>
          </div>
        </header>

        <section className="mt-4 space-y-2" aria-label="Missões">
          {missions.map(mission => {
            const done = completed.includes(mission.id);
            const Icon = mission.icon;
            return (
              <article key={mission.id} className={"rounded-[1.35rem] border bg-[#121B22] p-4 " + (done ? "border-[#C7FF3C]/20" : "border-white/8")}>
                <div className="flex items-start gap-3">
                  <div className={"grid size-10 shrink-0 place-items-center rounded-xl " + (done ? "bg-[#C7FF3C]/10 text-[#C7FF3C]" : "bg-white/[.04] text-[#3DE3FF]")}>
                    {done ? <BadgeCheck className="size-5" /> : <Icon className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black">{mission.title}</h2>
                      <span className="text-[0.55rem] font-black text-[#FFB86B]">+{mission.xp} XP</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{mission.detail}</p>
                    <button type="button" onClick={() => complete(mission)} className={"mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black " + (done ? "border border-white/8 text-white/45" : "bg-[#C7FF3C] text-[#0B1014]")}>
                      {done ? "Concluída" : "Fazer agora"} <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-4 text-center text-[0.52rem] leading-relaxed text-white/25">O Explorer não interfere no planejamento, mapa, dados ANP ou favoritos. É uma camada opcional de descoberta.</p>
      </div>
    </main>
  );
}
