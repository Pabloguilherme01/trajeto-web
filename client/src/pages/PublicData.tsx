import {
  ArrowRight,
  BusFront,
  CloudRain,
  Database,
  ExternalLink,
  Fuel,
  GraduationCap,
  HeartPulse,
  Landmark,
  MapPinned,
  Radio,
  Route,
  ShieldAlert,
  Users,
  WifiOff,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { appUrl } from "@/lib/appUrl";
import {
  PUBLIC_DATA_HUB_UPDATED_AT,
  PUBLIC_DATA_RESOURCES,
  SEMIURBAN_FARES,
  type PublicDataCategory,
} from "@/lib/publicDataHub";

const categoryMeta: Record<
  PublicDataCategory,
  { label: string; icon: typeof Database }
> = {
  transporte: { label: "Transporte", icon: BusFront },
  saude: { label: "Saúde", icon: HeartPulse },
  educacao: { label: "Educação", icon: GraduationCap },
  seguranca: { label: "Segurança viária", icon: ShieldAlert },
  territorio: { label: "Território", icon: MapPinned },
  lugares: { label: "Lugares", icon: MapPinned },
  combustivel: { label: "Combustível", icon: Fuel },
  clima: { label: "Clima e alertas", icon: CloudRain },
  rodovia: { label: "Rodovias", icon: Route },
  conectividade: { label: "Conectividade", icon: Radio },
  financeiro: { label: "Serviços financeiros", icon: Landmark },
  assistencia: { label: "Assistência social", icon: Users },
  ambiente: { label: "Meio ambiente", icon: Wind },
};

const DEPARTURE_RESOURCE_IDS = [
  "inmet-alertas",
  "defesa-civil-alertas",
  "dnit-rodovias",
  "anatel-cobertura",
  "stpc-df-gtfs",
] as const;

const departureResources = PUBLIC_DATA_RESOURCES.filter(item =>
  DEPARTURE_RESOURCE_IDS.includes(item.id as (typeof DEPARTURE_RESOURCE_IDS)[number]),
);

export default function PublicData() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const selectedResource = params.get("recurso");
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const openSource = (url: string) => {
    if (!online) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-8 sm:pt-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#C7FF3C]">
            Águas Lindas de Goiás · procedência visível
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
            Dados da cidade e do Entorno
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">
            Fontes oficiais e comunitárias organizadas para apoiar decisões de
            deslocamento. O Trajeto separa dado oficial, referência local e
            camada comunitária — e não apresenta histórico como informação em
            tempo real.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/70">
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              Hub revisado em {PUBLIC_DATA_HUB_UPDATED_AT}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              {PUBLIC_DATA_RESOURCES.length} fontes catalogadas
            </span>
          </div>
          {!online && (
            <p
              role="status"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/5 p-3 text-sm leading-relaxed text-[#DFFF9D]"
            >
              <WifiOff className="mt-0.5 size-4 shrink-0" />
              Você está offline. Tarifas e metadados salvos continuam visíveis;
              fontes externas só abrem quando a conexão voltar.
            </p>
          )}
        </header>

        <section
          className="mt-6 rounded-3xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.035] p-4 sm:p-5"
          aria-labelledby="departure-data-title"
        >
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#3DE3FF]">
            Antes de sair
          </p>
          <h2 id="departure-data-title" className="mt-1 text-xl font-black">
            Fontes que podem mudar sua decisão de viagem.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
            O Trajeto conecta clima oficial, contexto rodoviário, cobertura móvel
            e transporte do DF sem tratar referência histórica ou cobertura
            teórica como informação ao vivo.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
            {departureResources.map(item => {
              const meta = categoryMeta[item.category];
              const Icon = meta.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setLocation(
                      appUrl("/dados") +
                        "?recurso=" +
                        encodeURIComponent(item.id),
                    )
                  }
                  className="min-h-[7rem] rounded-2xl border border-white/8 bg-[#0B1014] p-3 text-left transition hover:border-[#3DE3FF]/30 active:scale-[.99]"
                >
                  <Icon className="size-4 text-[#3DE3FF]" />
                  <span className="mt-2 block text-xs font-black">
                    {item.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-white/60">
                    {item.sourceLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="transporte" className="mt-7" aria-labelledby="transport-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#C7FF3C]">
                Transporte semiurbano
              </p>
              <h2 id="transport-title" className="mt-1 text-2xl font-bold">
                Tarifas oficiais do corredor
              </h2>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
            Valores publicados pela ANTT e vigentes desde 28/06/2026. São
            referências tarifárias; horários, disponibilidade e operação podem
            mudar e devem ser confirmados antes da viagem.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SEMIURBAN_FARES.map(item => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-[#121B22] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
                    <BusFront className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-black">
                      {item.origin} → {item.destination}
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                      {item.operator} · vigência {item.effectiveFrom}
                    </p>
                  </div>
                  <strong className="shrink-0 text-lg text-[#C7FF3C]">
                    {item.fare.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLocation(
                        appUrl("/planejar") +
                          "?destino=" +
                          encodeURIComponent(item.plannerDestination) +
                          "&auto=1",
                      )
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-sm font-black text-[#0B1014]"
                  >
                    Planejar rota <ArrowRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openSource(item.sourceUrl)}
                    disabled={!online}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold disabled:opacity-50"
                  >
                    Fonte ANTT <ExternalLink className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="sources-title">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#C7FF3C]">
            Procedência
          </p>
          <h2 id="sources-title" className="mt-1 text-2xl font-bold">
            Fontes organizadas pelo Trajeto
          </h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {PUBLIC_DATA_RESOURCES.map(item => {
              const meta = categoryMeta[item.category];
              const Icon = meta.icon;
              const selected = selectedResource === item.id;
              return (
                <article
                  key={item.id}
                  id={"resource-" + item.id}
                  className={
                    "rounded-3xl border bg-[#121B22] p-4 transition " +
                    (selected
                      ? "border-[#C7FF3C]/60 ring-1 ring-[#C7FF3C]/25"
                      : "border-white/10")
                  }
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-[#C7FF3C]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-black">
                          {item.title}
                        </h3>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[.65rem] font-bold uppercase tracking-wide text-white/65">
                          {item.official ? "Oficial" : "Comunitária"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#C7FF3C]">
                        {meta.label} · {item.sourceLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/72">
                    {item.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                    {item.updatedAt && (
                      <span className="rounded-full bg-white/[.05] px-2.5 py-1">
                        Atualizado: {item.updatedAt}
                      </span>
                    )}
                    {item.updateFrequency && (
                      <span className="rounded-full bg-white/[.05] px-2.5 py-1">
                        Frequência: {item.updateFrequency}
                      </span>
                    )}
                    <span className="rounded-full bg-white/[.05] px-2.5 py-1">
                      Offline: {item.offlinePolicy === "snapshot" ? "snapshot local" : "metadados"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.localPath && (
                      <button
                        type="button"
                        onClick={() => setLocation(appUrl(item.localPath!))}
                        className="min-h-11 rounded-xl bg-white/[.08] px-3 text-sm font-bold"
                      >
                        Usar no Trajeto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openSource(item.sourceUrl)}
                      disabled={!online}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold disabled:opacity-50"
                    >
                      Abrir fonte <ExternalLink className="size-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0F171D] p-4 sm:p-5">
          <h2 className="text-lg font-black">Como o Trajeto usa esses dados</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/70">
            ANP já alimenta recursos locais; ANTT e o futuro GTFS apoiam
            transporte; INMET e Defesa Civil cobrem avisos oficiais; DNIT e PRF
            oferecem contexto rodoviário; Anatel ajuda a planejar contingência
            de conexão; CNES, SAMU, PNI e Farmácia Popular fortalecem saúde;
            MDS apoia assistência social; Banco Central cobre serviços
            financeiros; IBGE identifica o território; MonitorAr cobre
            qualidade do ar; e OpenStreetMap complementa descoberta de lugares.
            Bases grandes devem ser sincronizadas no build ou no servidor para
            não bloquear o mobile nem comprometer o modo offline.
          </p>
        </section>
      </div>
    </main>
  );
}
