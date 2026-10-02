import { ArrowRight, CheckCircle2, Fuel, Landmark, MapPinned, Route as RouteIcon, ShieldCheck, WifiOff } from "lucide-react";
import { Link } from "wouter";
import OfflineReadiness from "@/components/OfflineReadiness";
import AppUpdateCheck from "@/components/AppUpdateCheck";
import { appUrl } from "@/lib/appUrl";

const steps = [
  { n: "01", icon: Landmark, title: "Encontre", text: "Busque serviços de saúde, assistência e cidadania. Consulte contatos, horários e a fonte oficial." },
  { n: "02", icon: RouteIcon, title: "Planeje", text: "Informe o destino. O cálculo próprio é opcional e a navegação externa continua disponível." },
  { n: "03", icon: Fuel, title: "Salve", text: "Toque no coração para guardar serviços e postos. Rotas calculadas também podem ser salvas no aparelho." },
];

export default function Help() {
  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-24 text-white md:pb-12">
      <div className="container max-w-4xl pt-6 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#3DE3FF]">Ajuda</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.065em] sm:text-5xl">Use o Trajeto em poucos passos.</h1>
          </div>
          <Link href={appUrl("/")} className="min-h-11 shrink-0 rounded-xl border border-white/10 px-3 text-xs font-black text-white/70">Início</Link>
        </header>

        <AppUpdateCheck />
        <section className="mt-6 trajeto-card rounded-[1.7rem] border border-white/10 bg-[#121B22] p-5 sm:p-7">
          <p className="text-sm leading-relaxed text-white/75">Encontre o atendimento que precisa, veja como chegar e guarde seus atalhos neste aparelho. A central reúne serviços públicos de Águas Lindas e canais estaduais e nacionais de apoio.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {steps.map(step => (
              <article key={step.n} className="trajeto-card rounded-2xl border border-white/8 bg-[#0B1014] p-4">
                <div className="flex items-center justify-between">
                  <step.icon className="size-4 text-[#C7FF3C]" />
                  <span className="text-xs font-black tracking-[.16em] text-white/60">{step.n}</span>
                </div>
                <h2 className="mt-5 text-sm font-black">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <Link href={appUrl("/servicos")} className="block rounded-[1.4rem] border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.055] p-5">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#3DE3FF]"><Landmark className="size-3.5" /> Utilidade pública</p>
            <p className="mt-2 text-lg font-black">Central de Águas Lindas</p>
            <p className="mt-1 text-sm leading-relaxed text-white/75">Saúde, segurança, assistência, trânsito, educação, cidadania e canais de emergência, com catálogo local e acesso offline.</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3DE3FF] px-3 text-xs font-black text-[#0B1014]">Abrir central <ArrowRight className="size-3.5" /></span>
          </Link>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={appUrl("/planejar")} className="rounded-[1.4rem] border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.08] p-5">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#C7FF3C]">Começar</p>
            <p className="mt-2 text-lg font-black">Planejar uma rota</p>
            <p className="mt-1 text-sm text-white/75">Origem, destino, mapa, salvar e compartilhar.</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">Abrir <ArrowRight className="size-3.5" /></span>
          </Link>
          <Link href={appUrl("/mapa")} className="rounded-[1.4rem] border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.06] p-5">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#3DE3FF]">Começar</p>
            <p className="mt-2 text-lg font-black">Explorar a cidade</p>
            <p className="mt-1 text-sm text-white/75">Destinos, serviços, postos e planejamento no mapa.</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#3DE3FF]/25 px-3 text-xs font-black text-[#C9F7FF]">Abrir <ArrowRight className="size-3.5" /></span>
          </Link>
        </section>

        <section className="mt-4 rounded-[1.4rem] border border-white/8 bg-white/[.025] p-5">
          <h2 className="text-base font-black">O que continua funcionando sem conta</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="flex gap-2 text-sm leading-relaxed text-white/75"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />Favoritos e rotas salvas ficam neste aparelho.</p>
            <p className="flex gap-2 text-sm leading-relaxed text-white/75"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />Pontos, rotas salvas e ruas da área urbana de Águas Lindas ficam disponíveis após preparar o acesso offline.</p>
            <p className="flex gap-2 text-sm leading-relaxed text-white/75"><WifiOff className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" />Com internet perdida, o app usa cache e dados já armazenados quando disponíveis.</p>
            <p className="flex gap-2 text-sm leading-relaxed text-white/75"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />Dados oficiais e referências secundárias são identificados separadamente.</p>
          </div>
        </section>

        <OfflineReadiness />

        <section className="mt-4 trajeto-card rounded-3xl border border-white/10 bg-[#121B22] p-5" aria-labelledby="practical-help-title">
          <h2 id="practical-help-title" className="text-lg font-bold">Ajuda prática</h2>
          <div className="mt-3 divide-y divide-white/10 text-sm text-white/80">
            <details><summary className="min-h-12 cursor-pointer py-3 font-bold">Como criar atalhos para os serviços que uso?</summary><p className="pb-4 leading-relaxed">Na central, toque no coração do serviço. Use Serviços salvos para encontrar seus contatos sem repetir a busca. Os favoritos ficam neste navegador e funcionam offline depois da preparação do app.</p><Link href={appUrl("/servicos") + "?salvos=1"} className="mb-4 inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 font-bold">Abrir serviços salvos</Link></details>
            <details><summary className="min-h-12 cursor-pointer py-3 font-bold">Como colocar o Trajeto na tela inicial?</summary><p className="pb-4 leading-relaxed">Use Instalar app quando o navegador oferecer essa opção. No Android, também procure Instalar ou Adicionar à tela inicial no menu do navegador. No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início. Se aparecer, ative Abrir como App da Web e confirme Adicionar. Instalar não substitui a conferência do pacote offline acima.</p></details>
            <details><summary className="min-h-12 cursor-pointer py-3 font-bold">O que fazer se não abrir sem internet?</summary><p className="pb-4 leading-relaxed">Abra o site com internet e toque em Preparar acesso offline. O app confere e tenta recuperar os arquivos que faltam, sem apagar seus favoritos ou rotas. Se houver uma versão nova, use Atualizar e confira novamente. Quando aparecer Pronto para usar sem internet, desligue a conexão e teste a central. Esse pacote inclui o app, os dados preparados e as ruas da área urbana de Águas Lindas. Novas rotas viárias e trânsito ao vivo exigem conexão; sem rede, use rotas salvas ou estimativas identificadas. Evite o modo privado para guardar atalhos e não limpe os dados do navegador se quiser manter os favoritos e rotas.</p></details>
            <details><summary className="min-h-12 cursor-pointer py-3 font-bold">Por que meu favorito não foi salvo?</summary><p className="pb-4 leading-relaxed">O navegador pode bloquear o armazenamento ou estar sem espaço. Verifique as permissões do site e o espaço do aparelho, tente salvar novamente e recarregue para conferir. O app informa quando a gravação falha.</p></details>
            <details><summary className="min-h-12 cursor-pointer py-3 font-bold">Como informar um problema ou contato incorreto?</summary><p className="pb-3 leading-relaxed">Informe a tela, o que tentou fazer e a mensagem exibida. O formulário de suporte é público; descreva o problema sem documentos pessoais. Para uma solicitação sobre atendimento municipal, use a Ouvidoria e guarde o protocolo.</p><div className="mb-4 flex flex-wrap gap-2"><a href="https://github.com/Pabloguilherme01/trajeto-web/issues/new" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 font-bold">Suporte do Trajeto · online</a><Link href={appUrl("/servicos") + "?servico=ouvidoria-municipal"} className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 font-bold">Ouvidoria Municipal</Link></div></details>
          </div>
        </section>

        <section className="mt-4 pb-4 text-center text-sm leading-relaxed text-white/70">
          Para trânsito, incidentes e chegada em tempo real, use o navegador externo escolhido.
        </section>
      </div>
    </main>
  );
}
