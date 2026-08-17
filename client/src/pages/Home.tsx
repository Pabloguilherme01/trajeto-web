/**
 * Design reminder — Rota da Estrada Clara:
 * editorial wayfinding, petrol-blue orientation, route-yellow actions,
 * asymmetric route landmarks and clear privacy-first microcopy.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  MapPinned,
  Menu,
  Navigation,
  Route,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

const routeSteps = [
  {
    number: "01",
    title: "Defina o destino",
    text: "Informe onde você quer chegar e encontre as opções que fazem sentido para a sua rota.",
    icon: Navigation,
  },
  {
    number: "02",
    title: "Compare com calma",
    text: "Condições, distância e conveniência aparecem juntas para a escolha ser realmente simples.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Abasteça com clareza",
    text: "Apresente o código da oferta no ponto participante e conclua o pagamento normalmente.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [, setLocation] = useLocation();

  const scrollToPlanner = () => {
    setLocation("/planejar");
    setShowMobileMenu(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F4EC] text-[#16333B]">
      <header className="relative z-30 border-b border-white/10 bg-[#14343C] text-white">
        <div className="container flex h-[76px] items-center justify-between gap-5">
          <a className="group flex items-center gap-3" href="#inicio" aria-label="Trajeto — início">
            <img
              className="h-10 w-10 rounded-xl bg-[#FFC928] object-contain p-1.5 shadow-[0_8px_20px_rgba(255,201,40,0.22)] transition-transform duration-200 group-hover:-rotate-6"
              src="/manus-storage/trajeto-mark_78544e73.png"
              alt="Símbolo da Trajeto"
            />
            <span className="brand-wordmark text-[1.38rem] text-white">trajeto</span>
            <span className="hidden border-l border-white/20 pl-2 text-[0.58rem] font-bold tracking-[0.2em] text-[#FFC928] sm:inline-block">GUIA DE ROTA</span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-white/72 md:flex" aria-label="Navegação principal">
            <a className="transition-colors hover:text-[#FFC928]" href="#como-funciona">Como funciona</a>
            <a className="transition-colors hover:text-[#FFC928]" href="#seguranca">Privacidade</a>
            <a className="transition-colors hover:text-[#FFC928]" href="#modelo">Estrutura</a>
          </nav>

          <button onClick={scrollToPlanner} className="hidden items-center gap-2 rounded-full bg-[#FFC928] px-4 py-2.5 text-xs font-bold text-[#15353D] transition duration-200 hover:bg-[#ffd454] active:scale-[0.97] md:flex">
            Começar a rota <ArrowRight className="size-3.5" />
          </button>

          <button
            onClick={() => setShowMobileMenu((value) => !value)}
            aria-label="Abrir menu"
            className="grid size-10 place-items-center rounded-full border border-white/15 text-white transition hover:bg-white/10 md:hidden"
          >
            {showMobileMenu ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {showMobileMenu && (
          <nav className="container flex flex-col gap-4 border-t border-white/10 py-5 text-sm text-white/75 md:hidden" aria-label="Navegação móvel">
            <a href="#como-funciona" onClick={() => setShowMobileMenu(false)}>Como funciona</a>
            <a href="#seguranca" onClick={() => setShowMobileMenu(false)}>Privacidade</a>
            <a href="#modelo" onClick={() => setShowMobileMenu(false)}>Estrutura</a>
            <button onClick={scrollToPlanner} className="w-fit rounded-full bg-[#FFC928] px-4 py-2.5 text-xs font-bold text-[#15353D]">Começar a rota</button>
          </nav>
        )}
      </header>

      <main id="inicio">
        <section className="hero-shell relative isolate overflow-hidden bg-[#E8EEE8] pb-16 pt-12 text-[#163840] lg:pb-24 lg:pt-20">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(247,244,236,1)_0%,rgba(247,244,236,0.96)_40%,rgba(247,244,236,0.4)_68%,rgba(22,56,64,0.15)_100%)]" />
          <img className="absolute inset-y-0 right-0 -z-30 h-full w-[68%] object-cover object-[67%_center] opacity-75" src="/manus-storage/trajeto-hero-route_1fc32299.jpg" alt="Rodovia com posto de serviço ao amanhecer" />
          <div className="route-curve pointer-events-none absolute -right-28 -top-40 -z-10 size-[620px] rounded-full border-[70px] border-[#FFC928]/30" />
          <div className="route-curve pointer-events-none absolute -bottom-80 left-[42%] -z-10 size-[630px] rounded-full border border-[#163840]/15" />

          <div className="container">
            <div className="mb-11 flex items-center gap-3 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#BA5B45] animate-route-in">
              <span className="h-px w-8 bg-[#BA5B45]" />
              Rota 01 · economia em movimento
            </div>
            <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.02fr)_460px]">
              <div className="max-w-[720px]">
                <p className="mb-5 text-sm text-[#49656A] animate-route-in [animation-delay:40ms]">Seu próximo abastecimento merece mais contexto antes de você chegar à bomba.</p>
                <h1 className="font-display max-w-[720px] text-[clamp(3.45rem,8vw,7.6rem)] font-semibold leading-[0.83] tracking-[-0.075em] animate-route-in [animation-delay:90ms]">
                  Seu caminho<br />
                  <span className="text-[#BA5B45]">rende mais.</span>
                </h1>
                <div className="mt-9 flex max-w-[560px] flex-col gap-5 border-l border-[#FFC928] pl-5 text-[1.05rem] leading-relaxed text-[#426168] sm:flex-row sm:items-end sm:justify-between animate-route-in [animation-delay:150ms]">
                  <p>Planeje a próxima parada com clareza, autonomia e contexto para decidir antes de abastecer.</p>
                  <a href="#como-funciona" className="group inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#BA5B45] hover:text-[#163840]">Entenda o fluxo <ArrowDownRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" /></a>
                </div>
                <div className="mt-9 flex max-w-[540px] divide-x divide-[#B9C6BD] border-y border-[#B9C6BD] animate-route-in [animation-delay:190ms]">
                  <div className="py-4 pr-6"><strong className="font-display text-4xl tracking-[-0.08em]">04</strong><span className="mt-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-[#637773]">sinais para comparar</span></div>
                  <div className="py-4 pl-6"><strong className="font-display text-4xl tracking-[-0.08em]">01</strong><span className="mt-1 block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-[#637773]">escolha guiada</span></div>
                </div>
              </div>

              <section id="planejador" className="relative border border-white/15 bg-[#F7F4EC] p-5 text-[#15343B] shadow-[0_28px_90px_rgba(0,0,0,0.28)] animate-route-in [animation-delay:170ms] sm:p-7" aria-labelledby="planner-title">
                <div className="absolute -left-px -top-px h-3 w-16 bg-[#FFC928]" />
                <div>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-2 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-[#BA5B45]">Dados reais, escolha clara</p>
                        <h2 id="planner-title" className="font-display text-3xl font-semibold tracking-[-0.055em]">Planeje sua rota.</h2>
                      </div>
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#163840] text-[#FFC928]"><Route className="size-5" /></div>
                    </div>
                    <div className="border-y border-[#D7DFDA] py-5 text-sm leading-relaxed text-[#5D7773]"><p><strong className="block text-[#163840]">1. Informe origem e destino</strong>A rota é calculada com distância e tempo estimado.</p><p className="mt-4"><strong className="block text-[#163840]">2. Veja postos próximos</strong>Os pontos encontrados vêm da base geográfica do Google Maps.</p><p className="mt-4"><strong className="block text-[#163840]">3. Solicite o resgate</strong>Entre com sua conta para registrar a solicitação.</p></div>
                    <button type="button" onClick={scrollToPlanner} className="mt-6 flex w-full items-center justify-center gap-2 bg-[#163840] px-5 py-4 text-sm font-bold text-white transition duration-200 hover:bg-[#24515A] active:scale-[0.98]">Planejar rota real <ChevronRight className="size-4" /></button>
                  </div>
              </section>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="relative bg-[#F7F4EC] py-20 lg:py-28">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[0.58fr_1.42fr] lg:gap-20">
              <div>
                <p className="eyebrow">Rota 02 · O percurso em três marcos</p>
                <h2 className="section-title mt-4">Menos incerteza.<br /><em>Mais direção.</em></h2>
                <p className="mt-6 max-w-sm text-[0.98rem] leading-relaxed text-[#60736F]">A jornada organiza informação antes, durante e depois da escolha, com espaço para conectar os dados reais da sua operação.</p>
              </div>
              <div className="relative grid gap-0 md:grid-cols-3">
                <div className="route-dash absolute left-[16%] right-[16%] top-[31px] hidden border-t border-dashed border-[#98AAA3] md:block" />
                {routeSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article className="relative border-t border-[#C6D0CA] py-7 md:border-l md:border-t-0 md:px-6 md:py-0" key={step.number}>
                      <div className="relative z-10 mb-8 grid size-16 place-items-center rounded-full border border-[#B7C5BD] bg-[#F7F4EC] text-[#163840]"><Icon className="size-5" /></div>
                      <p className="mb-5 text-[0.65rem] font-bold tracking-[0.18em] text-[#BA5B45]">{step.number}</p>
                      <h3 className="font-display text-[1.8rem] font-semibold leading-none tracking-[-0.05em]">{step.title}</h3>
                      <p className="mt-4 text-sm leading-relaxed text-[#60736F]">{step.text}</p>
                      {index < routeSteps.length - 1 && <span className="absolute right-3 top-6 hidden text-[#BA5B45] md:block"><ArrowRight className="size-4" /></span>}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="modelo" className="bg-[#E4ECE7] py-8 lg:py-12">
          <div className="container">
            <div className="grid overflow-hidden bg-[#163840] text-white lg:grid-cols-[0.86fr_1.14fr]">
              <div className="relative min-h-[330px] overflow-hidden p-8 sm:p-11">
                <img className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity" src="/manus-storage/trajeto-route-card_1132a0fe.jpg" alt="Mapa e objetos de planejamento de rota" />
                <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(16,51,59,0.95),rgba(16,51,59,0.5))]" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <MapPinned className="size-7 text-[#FFC928]" />
                  <div><p className="eyebrow text-[#FFC928]">Rota 03 · informação que acompanha</p><h2 className="font-display mt-4 max-w-sm text-4xl font-semibold leading-[0.95] tracking-[-0.06em]">O que importa chega junto da sua rota.</h2></div>
                </div>
              </div>
              <div className="p-8 text-[#17373D] sm:p-11">
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    ["Catálogo de postos", "Conecte os pontos participantes e seus dados operacionais."],
                    ["Ofertas contextualizadas", "Exiba regras e condições conforme a estratégia da sua rede."],
                    ["Código de resgate", "Inclua um código verificável no momento certo da jornada."],
                    ["Painel de operação", "Transforme escolhas em indicadores claros para o negócio."],
                  ].map(([title, copy], index) => (
                    <div className="group border-l border-[#B5C6BD] pl-4" key={title}>
                      <span className="text-[0.62rem] font-bold tracking-[0.18em] text-[#BA5B45]">0{index + 1}</span>
                      <h3 className="mt-3 text-base font-bold">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#59716E]">{copy}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[#BCD0C4] pt-6 text-sm text-[#59716E]"><Sparkles className="size-4 text-[#BA5B45]" /><span>Conecte dados, integrações e regras de negócio para transformar clareza em economia real.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="seguranca" className="relative overflow-hidden bg-[#F7F4EC] py-20 lg:py-28">
          <div className="container grid items-center gap-12 lg:grid-cols-[1fr_0.88fr] lg:gap-20">
            <div className="order-2 lg:order-1">
              <p className="eyebrow">Rota 04 · Privacidade como ponto de partida</p>
              <h2 className="section-title mt-4">Só peça o que<br /><em>ajuda a rota.</em></h2>
              <p className="mt-6 max-w-xl text-[1.04rem] leading-relaxed text-[#60736F]">A experiência foi desenhada para explicar permissões em linguagem humana. O visitante entende por que um dado é solicitado e continua no controle de cada escolha.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border-l-2 border-[#FFC928] bg-white/60 p-5"><Smartphone className="mb-4 size-5 text-[#163840]" /><h3 className="font-bold">Celular com contexto</h3><p className="mt-2 text-sm leading-relaxed text-[#60736F]">Use apenas para autenticação e comunicações que a pessoa realmente autorizou.</p></div>
                <div className="border-l-2 border-[#BA5B45] bg-white/60 p-5"><CircleHelp className="mb-4 size-5 text-[#163840]" /><h3 className="font-bold">Localização opcional</h3><p className="mt-2 text-sm leading-relaxed text-[#60736F]">Deixe claro que ela serve para proximidade e pode ser desligada a qualquer momento.</p></div>
              </div>
            </div>
            <div className="relative order-1 mx-auto w-full max-w-[430px] lg:order-2">
              <div className="absolute -inset-8 rounded-full border border-[#D8C9A2]" />
              <img className="relative z-10 w-full rounded-[44%_56%_49%_51%/55%_43%_57%_45%] shadow-[22px_24px_0_#FFC928]" src="/manus-storage/trajeto-privacy-visual_803f738e.jpg" alt="Ilustração de privacidade e mobilidade" />
              <div className="absolute -bottom-5 -left-5 z-20 flex items-center gap-3 bg-[#163840] p-4 text-white shadow-xl"><ShieldCheck className="size-5 text-[#FFC928]" /><span className="max-w-36 text-xs leading-relaxed">Transparência em cada permissão.</span></div>
            </div>
          </div>
        </section>

        <section className="bg-[#BA5B45] px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-[1216px] flex-col items-start justify-between gap-7 border border-white/25 p-7 text-white sm:p-10 lg:flex-row lg:items-center">
            <div><p className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#FFD7C8]">Sua próxima parada começa antes da bomba</p><h2 className="font-display text-[clamp(2.15rem,4vw,4rem)] font-semibold leading-[0.9] tracking-[-0.06em]">Uma rota clara para<br />a próxima escolha.</h2></div>
            <button onClick={scrollToPlanner} className="group flex shrink-0 items-center gap-3 bg-[#FFC928] px-6 py-4 text-sm font-bold text-[#163840] transition hover:bg-white active:scale-[0.98]">Começar o percurso <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></button>
          </div>
        </section>
      </main>

      <footer className="bg-[#14343C] py-10 text-white/65">
        <div className="container flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3"><img className="size-8 rounded-lg bg-[#FFC928] p-1" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><div><p className="brand-wordmark text-lg text-white">trajeto</p><p className="text-xs">Escolhas que acompanham a rota</p></div></div>
          <p className="max-w-md text-xs leading-relaxed">Demonstração visual com fluxo local. Não exibe preços, postos ou condições comerciais reais e não envia dados pessoais.</p>
        </div>
      </footer>
    </div>
  );
}
