import { ArrowLeft, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";

function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-24 text-white md:pb-12">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1014]/92 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center gap-3">
          <Link href="/ajuda" className="grid size-10 place-items-center rounded-xl text-white/60" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="brand-wordmark text-[1rem]">trajeto</p>
            <p className="text-[.44rem] font-black uppercase tracking-[.14em] text-white/25">transparência</p>
          </div>
        </div>
      </header>
      <article className="container max-w-3xl pt-7 sm:pt-10">
        <p className="text-[.5rem] font-black uppercase tracking-[.17em] text-[#3DE3FF]">Documentos públicos</p>
        <h1 className="mt-2 font-display text-[clamp(2.2rem,9vw,4rem)] font-semibold leading-[.92] tracking-[-.06em]">{title}</h1>
        {children}
      </article>
    </main>
  );
}

export function Privacy() {
  return (
    <Layout title="Política de Privacidade">
      <section className="mt-6 space-y-5 text-sm leading-relaxed text-white/55">
        <p>O Trajeto usa recursos locais do navegador para manter favoritos, histórico de buscas, preferências, rotas recentes e dados de funcionamento offline neste aparelho.</p>
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Localização</h2>
          <p className="mt-2 text-xs">A localização do dispositivo é solicitada apenas após uma ação do usuário, como “Perto de mim”. Ela é usada para calcular proximidade e posicionar o mapa.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Serviços externos</h2>
          <p className="mt-2 text-xs">Quando ativados, Google Maps/Places, Waze e Apple Maps podem receber as informações necessárias à pesquisa ou navegação. O Trajeto identifica esses dados como externos.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Dados salvos</h2>
          <p className="mt-2 text-xs">Os recursos de favoritos, buscas recentes e preferências são mantidos localmente no dispositivo enquanto a aplicação os utilizar. O Trajeto não exige cadastro para essas funções.</p>
        </div>
        <p className="text-xs text-white/35">Esta página descreve o comportamento atual do aplicativo; mudanças relevantes devem ser refletidas aqui antes de serem consideradas parte do produto.</p>
      </section>
    </Layout>
  );
}

export function Terms() {
  return (
    <Layout title="Termos de Uso">
      <section className="mt-6 space-y-5 text-sm leading-relaxed text-white/55">
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Dados e fontes</h2>
          <p className="mt-2 text-xs">O Trajeto diferencia dados oficiais, bases locais e enriquecimento externo. Disponibilidade, preço, horário e status podem mudar e devem ser conferidos na fonte indicada quando a decisão for sensível.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Navegação</h2>
          <p className="mt-2 text-xs">As rotas abertas em Google Maps, Waze e Apple Maps pertencem a esses serviços. O Trajeto não garante trânsito, disponibilidade de ruas ou condições locais.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <h2 className="font-black text-white">Preços e estimativas</h2>
          <p className="mt-2 text-xs">Preços exibidos identificam a fonte e o período de referência quando disponíveis. Cálculos de economia, custo ou desvio são apresentados como cálculos do Trajeto quando não forem fornecidos por fonte externa.</p>
        </div>
        <p className="text-xs text-white/35">O uso de serviços externos também está sujeito aos termos e políticas dos respectivos provedores.</p>
        <div className="flex flex-wrap gap-2">
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-white/8 px-3 text-[.52rem] font-black text-white/55">Termos do Google</a>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-white/8 px-3 text-[.52rem] font-black text-white/55">Privacidade do Google</a>
        </div>
      </section>
    </Layout>
  );
}

export default function Legal({ defaultSection = "overview" }: { defaultSection?: "overview" | "privacy" | "terms" }) {
  if (defaultSection === "privacy") return <Privacy />;
  if (defaultSection === "terms") return <Terms />;
  return (
    <Layout title="Transparência">
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/privacidade" className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <ShieldCheck className="size-5 text-[#C7FF3C]" />
          <h2 className="mt-3 text-sm font-black">Privacidade</h2>
          <p className="mt-1 text-xs text-white/40">Localização, armazenamento local e serviços externos.</p>
        </Link>
        <Link href="/termos" className="rounded-2xl border border-white/8 bg-[#121B22] p-4">
          <MapPin className="size-5 text-[#3DE3FF]" />
          <h2 className="mt-3 text-sm font-black">Termos de uso</h2>
          <p className="mt-1 text-xs text-white/40">Fontes, navegação, preços e limites do aplicativo.</p>
        </Link>
      </div>
      <div className="mt-5 rounded-2xl border border-white/8 bg-[#121B22] p-4">
        <p className="text-xs leading-relaxed text-white/45">Conteúdo de Google Maps/Places é apresentado com indicação de fonte e permanece diferenciado dos dados oficiais do Trajeto.</p>
        <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/8 px-3 text-[.55rem] font-black text-white/65">Google Maps <ExternalLink className="size-3.5" /></a>
      </div>
    </Layout>
  );
}
