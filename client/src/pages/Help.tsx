import { ArrowRight, CheckCircle2, Fuel, Landmark, MapPinned, Route as RouteIcon, ShieldCheck, WifiOff } from "lucide-react";
import { Link } from "wouter";
import OfflineReadiness from "@/components/OfflineReadiness";
import { appUrl } from "@/lib/appUrl";

const steps = [
  { n: "01", icon: MapPinned, title: "Explore", text: "Abra o mapa, encontre postos e toque em uma referência para ver a ficha completa." },
  { n: "02", icon: RouteIcon, title: "Planeje", text: "Informe o destino. O cálculo próprio é opcional e a navegação externa continua disponível." },
  { n: "03", icon: Fuel, title: "Salve", text: "Guarde locais e rotas no aparelho para recuperar tudo depois, inclusive com conexão limitada." },
];

export default function Help() {
  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-24 text-white md:pb-12">
      <div className="container max-w-4xl pt-6 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Ajuda</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.065em] sm:text-5xl">Use o Trajeto em poucos passos.</h1>
          </div>
          <Link href={appUrl("/")} className="min-h-11 shrink-0 rounded-xl border border-white/10 px-3 text-xs font-black text-white/70">Início</Link>
        </header>

        <section className="mt-6 rounded-[1.7rem] border border-white/10 bg-[#121B22] p-5 sm:p-7">
          <p className="text-sm leading-relaxed text-white/60">O app foi organizado em quatro ações simples: abrir o mapa, planejar uma rota, encontrar postos e recuperar o que você salvou. O restante fica como apoio, sem bloquear o fluxo principal.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {steps.map(step => (
              <article key={step.n} className="rounded-2xl border border-white/8 bg-[#0B1014] p-4">
                <div className="flex items-center justify-between">
                  <step.icon className="size-4 text-[#C7FF3C]" />
                  <span className="text-[0.5rem] font-black tracking-[.16em] text-white/25">{step.n}</span>
                </div>
                <h2 className="mt-5 text-sm font-black">{step.title}</h2>
                <p className="mt-1.5 text-[0.64rem] leading-relaxed text-white/45">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <Link href={appUrl("/servicos")} className="block rounded-[1.4rem] border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.055] p-5">
            <p className="flex items-center gap-2 text-[0.55rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]"><Landmark className="size-3.5" /> Utilidade pública</p>
            <p className="mt-2 text-lg font-black">Central de Águas Lindas</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">Saúde, segurança, assistência, trânsito, educação, cidadania e canais de emergência, com catálogo local e acesso offline.</p>
            <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3DE3FF] px-3 text-xs font-black text-[#0B1014]">Abrir central <ArrowRight className="size-3.5" /></span>
          </Link>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={appUrl("/planejar")} className="rounded-[1.4rem] border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.08] p-5">
            <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Começar</p>
            <p className="mt-2 text-lg font-black">Planejar uma rota</p>
            <p className="mt-1 text-xs text-white/45">Origem, destino, mapa, salvar e compartilhar.</p>
            <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir <ArrowRight className="size-3.5" /></span>
          </Link>
          <Link href={appUrl("/mapa")} className="rounded-[1.4rem] border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.06] p-5">
            <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Começar</p>
            <p className="mt-2 text-lg font-black">Encontrar postos</p>
            <p className="mt-1 text-xs text-white/45">Mapa, fichas, filtros, favoritos e navegação.</p>
            <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#3DE3FF]/25 px-3 text-xs font-black text-[#C9F7FF]">Abrir <ArrowRight className="size-3.5" /></span>
          </Link>
        </section>

        <section className="mt-4 rounded-[1.4rem] border border-white/8 bg-white/[.025] p-5">
          <h2 className="text-base font-black">O que continua funcionando sem conta</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="flex gap-2 text-xs leading-relaxed text-white/50"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />Favoritos e rotas salvas ficam neste aparelho.</p>
            <p className="flex gap-2 text-xs leading-relaxed text-white/50"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />O mapa próprio do Trajeto não exige Google para aparecer.</p>
            <p className="flex gap-2 text-xs leading-relaxed text-white/50"><WifiOff className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" />Com internet perdida, o app usa cache e dados já armazenados quando disponíveis.</p>
            <p className="flex gap-2 text-xs leading-relaxed text-white/50"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />Dados oficiais e referências secundárias são identificados separadamente.</p>
          </div>
        </section>

        <OfflineReadiness />

        <section className="mt-4 pb-4 text-center text-[0.56rem] leading-relaxed text-white/25">
          Para trânsito, incidentes e chegada em tempo real, use o navegador externo escolhido.
        </section>
      </div>
    </main>
  );
}
