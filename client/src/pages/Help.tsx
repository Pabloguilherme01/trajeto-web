import { ArrowLeft, CircleCheck, Database, ExternalLink, MapPin, Navigation, ShieldCheck, WifiOff } from "lucide-react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";

const cards = [
  {
    icon: Database,
    title: "ANP é a base cadastral",
    text: "CNPJ, autorização, produtos e outras informações oficiais entram pela base da ANP. Quando existe conciliação, referências do Google são associadas à mesma ficha, não viram outro posto.",
  },
  {
    icon: MapPin,
    title: "Google é enriquecimento",
    text: "Perto de mim usa Nearby Search para descobrir referências próximas. Localização, mapa e navegação continuam atribuídos à fonte Google.",
  },
  {
    icon: ShieldCheck,
    title: "Qualidade é verificável",
    text: "Preço, data, coordenada e cadastro mostram a procedência quando ela existe. Dados ausentes permanecem como ausentes.",
  },
  {
    icon: WifiOff,
    title: "Offline é local",
    text: "Favoritos, buscas recentes, catálogo armazenado e rotas salvas podem continuar disponíveis. Nearby, trânsito e provedores de navegação dependem de conexão.",
  },
];

export default function Help() {
  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-24 text-white md:pb-12">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1014]/92 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-white">
            <ArrowLeft className="size-4 text-[#C7FF3C]" />
            <span className="brand-wordmark text-[1.1rem]">trajeto</span>
          </Link>
          <span className="rounded-full border border-white/8 px-2.5 py-1 text-[0.48rem] font-black uppercase tracking-[.14em] text-white/35">Mais</span>
        </div>
      </header>

      <div className="container max-w-3xl pt-7 sm:pt-10">
        <p className="text-[0.5rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Fontes e funcionamento</p>
        <h1 className="mt-2 font-display text-[clamp(2.35rem,9vw,4.5rem)] font-semibold leading-[.92] tracking-[-.07em]">
          Clareza antes<br /><span className="text-[#C7FF3C]">da navegação.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/45">
          O Trajeto separa cadastro oficial, referências de mapa, preços e cálculos. A tela principal mostra só o que ajuda a decidir; os detalhes ficam disponíveis quando você precisar.
        </p>

        <section className="mt-7 grid gap-2 sm:grid-cols-2">
          {cards.map(card => (
            <article key={card.title} className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
              <div className="grid size-10 place-items-center rounded-xl bg-white/[.03] text-[#3DE3FF]"><card.icon className="size-4" /></div>
              <h2 className="mt-3 text-sm font-black">{card.title}</h2>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-white/40">{card.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] p-4">
          <div className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />
            <div>
              <h2 className="text-sm font-black">Fluxo principal</h2>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-white/40">Encontrar → decidir → chegar. A lista é a interface principal; o mapa abre sob demanda; “No caminho” calcula rota e paradas.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.47rem] font-black uppercase tracking-[.1em] text-white/25">Encontrar</p><p className="mt-1 text-xs font-black">Busca · perto · filtros</p></div>
            <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.47rem] font-black uppercase tracking-[.1em] text-white/25">Decidir</p><p className="mt-1 text-xs font-black">Preço · distância · fontes</p></div>
            <div className="rounded-xl border border-white/8 bg-[#0B1014] p-3"><p className="text-[0.47rem] font-black uppercase tracking-[.1em] text-white/25">Chegar</p><p className="mt-1 text-xs font-black">Google · Waze · Apple</p></div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-[#10191F] p-4">
          <div className="flex items-start gap-3">
            <Navigation className="mt-0.5 size-4 shrink-0 text-[#3DE3FF]" />
            <div className="min-w-0">
              <h2 className="text-sm font-black">No caminho</h2>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-white/40">O planejador usa rota, preço de referência e desvio quando esses dados estão disponíveis. Qualquer economia mostrada é explicitamente identificada como estimativa do Trajeto.</p>
            </div>
          </div>
          <Link href="/planejar" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-[0.6rem] font-black text-[#0B1014]">Abrir planejador <ArrowLeft className="size-3 rotate-180" /></Link>
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-[#10191F] p-4">
          <h2 className="text-sm font-black">Fontes oficiais</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href="https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-white/8 px-3 text-[0.58rem] font-black text-white/65">Consulta de posto ANP <ExternalLink className="size-3.5" /></a>
            <a href="https://anpcomvcpostos.anp.gov.br/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-white/8 px-3 text-[0.58rem] font-black text-white/65">ANP com VC <ExternalLink className="size-3.5" /></a>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-[#10191F] p-4">
          <h2 className="text-sm font-black">Transparência e privacidade</h2>
          <p className="mt-1 text-[0.62rem] leading-relaxed text-white/40">Consulte como o Trajeto usa localização, armazenamento local e serviços externos.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/privacidade" className="inline-flex min-h-10 items-center rounded-xl border border-white/8 px-3 text-[.55rem] font-black text-white/65">Privacidade</Link>
            <Link href="/termos" className="inline-flex min-h-10 items-center rounded-xl border border-white/8 px-3 text-[.55rem] font-black text-white/65">Termos</Link>
            <Link href="/transparencia" className="inline-flex min-h-10 items-center rounded-xl bg-[#C7FF3C] px-3 text-[.55rem] font-black text-[#0B1014]">Ver tudo</Link>
          </div>
        </section>

        <p className="mt-6 text-center text-[0.48rem] leading-relaxed text-white/20">Google Maps e Google Places fornecem referências de mapa e navegação; a base oficial continua identificada separadamente.</p>
      </div>
    </main>
  );
}
