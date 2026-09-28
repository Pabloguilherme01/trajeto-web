import React from "react";
import { BadgeCheck, ExternalLink, FileBarChart, Fuel, ShieldCheck } from "lucide-react";

const sources = [
  {
    title: "Preços semanais da ANP",
    detail: "Pesquisa por município e posto, com referência da semana divulgada.",
    href: "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas",
    icon: Fuel,
  },
  {
    title: "Qualidade dos combustíveis",
    detail: "Dados abertos do PMQC para gasolina, etanol e diesel.",
    href: "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/pmqc-programa-de-monitoramento-da-qualidade-dos-combustiveis",
    icon: ShieldCheck,
  },
  {
    title: "ANP com VC — Postos",
    detail: "Consulta oficial de postos autorizados e canal para o consumidor.",
    href: "https://www.gov.br/anp/pt-br/centrais-de-conteudo/aplicativos/anp-com-vc-postos",
    icon: BadgeCheck,
  },
  {
    title: "CNH e CRLV digitais",
    detail: "Serviço oficial para manter documentos de trânsito no celular.",
    href: "https://www.gov.br/pt-br/servicos/obter-carteira-digital-de-transito",
    icon: FileBarChart,
  },
] as const;

export default function OfficialSourcesCard() {
  return (
    <section className="container py-8 sm:py-10" aria-labelledby="official-sources-title">
      <div className="rounded-[1.5rem] border border-white/10 bg-[#111A21] p-4 shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-[#3DE3FF]">Dados úteis</p>
            <h2 id="official-sources-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-white">Fontes oficiais para decidir melhor</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#8FA3AC]">Atalhos para informações públicas que complementam o Trajeto. O aplicativo não transforma referência oficial em preço garantido.</p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full border border-white/10 px-3 text-[0.58rem] font-bold text-[#9FB0B8]">Fonte externa · oficial</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map(({ title, detail, href, icon: Icon }) => (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="group min-h-28 rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-[#C7FF3C]/40 hover:bg-[#C7FF3C]/[0.04] focus-visible:border-[#3DE3FF]">
              <span className="flex items-center justify-between gap-3">
                <Icon className="size-4 text-[#C7FF3C]" aria-hidden="true" />
                <ExternalLink className="size-3.5 text-[#61757E] transition group-hover:text-[#3DE3FF]" aria-hidden="true" />
              </span>
              <strong className="mt-3 block text-xs font-extrabold text-white">{title}</strong>
              <span className="mt-1 block text-[0.62rem] leading-relaxed text-[#7F919A]">{detail}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
