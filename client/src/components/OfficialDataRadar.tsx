import { BarChart3, Database, ExternalLink, Fuel, ShieldCheck } from "lucide-react";

const datasets = [
  {
    title: "Preços de revenda",
    date: "Semana de 20–26/09/2026",
    detail: "ANP publica médias por Brasil, região, estado, município e preços por posto.",
    href: "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas",
    icon: Fuel,
  },
  {
    title: "Série histórica",
    date: "Atualizada em 25/09/2026",
    detail: "Séries semanais e mensais para comparar gasolina, etanol, diesel, GNV e GLP.",
    href: "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/serie-historica-do-levantamento-de-precos",
    icon: BarChart3,
  },
  {
    title: "Qualidade · PMQC",
    date: "Dados publicados até junho/2026",
    detail: "Resultados de amostras conformes de gasolina, etanol e diesel em CSV e JSON.",
    href: "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/pmqc-programa-de-monitoramento-da-qualidade-dos-combustiveis",
    icon: ShieldCheck,
  },
  {
    title: "Dados cadastrais",
    date: "Atualizado em 25/09/2026",
    detail: "Cadastro aberto dos revendedores varejistas de combustíveis em operação.",
    href: "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos",
    icon: Database,
  },
] as const;

export default function OfficialDataRadar() {
  return (
    <section className="container py-4 sm:py-6" aria-labelledby="data-radar-title">
      <div className="rounded-[1.5rem] border border-white/10 bg-[#111A21] p-4 shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Dados de referência</p>
            <h2 id="data-radar-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em] text-white">Radar ANP</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#8FA3AC]">O Trajeto separa dado oficial de estimativa própria. Abra a fonte para consultar o arquivo ou painel mais recente antes de tomar uma decisão.</p>
          </div>
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/10 px-2.5 text-[.56rem] font-bold text-[#8FA3AC]">fontes públicas</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {datasets.map(({ title, date, detail, href, icon: Icon }) => (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="group min-h-36 rounded-2xl border border-white/8 bg-white/[.025] p-3 transition hover:border-[#C7FF3C]/35 hover:bg-[#C7FF3C]/[.04] focus-visible:border-[#3DE3FF]">
              <span className="flex items-center justify-between">
                <Icon className="size-4 text-[#C7FF3C]" aria-hidden="true" />
                <ExternalLink className="size-3 text-[#62757E]" aria-hidden="true" />
              </span>
              <strong className="mt-4 block text-xs font-extrabold text-white">{title}</strong>
              <span className="mt-1 block text-[.56rem] font-bold uppercase tracking-[.08em] text-[#3DE3FF]">{date}</span>
              <span className="mt-2 block text-[.62rem] leading-relaxed text-[#7F919A]">{detail}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
