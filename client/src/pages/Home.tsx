/**
 * Design reminder — Energia de Rota:
 * a public mobility experience built from bolder color blocks, oversized type,
 * region portals and clear actions for discovering open station information.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowRight, ChevronRight, CircleUserRound, Fuel, LogIn, MapPinned, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const regions = [
  { id: "df-entorno", kicker: "Rota 01", name: "DF + Entorno", query: "Brasília, DF", copy: "Brasília, Águas Lindas e cidades vizinhas", color: "bg-[#FFC928]", foreground: "text-[#183A42]", marker: "01" },
  { id: "goias", kicker: "Rota 02", name: "Goiás", query: "Goiânia, GO", copy: "Goiânia, Anápolis e interior", color: "bg-[#D94F3D]", foreground: "text-white", marker: "02" },
  { id: "sao-paulo", kicker: "Rota 03", name: "São Paulo", query: "São Paulo, SP", copy: "Capital, ABC e principais eixos", color: "bg-[#3E54E8]", foreground: "text-white", marker: "03" },
  { id: "minas-gerais", kicker: "Rota 04", name: "Minas Gerais", query: "Belo Horizonte, MG", copy: "BH, Contagem e região metropolitana", color: "bg-[#123B40]", foreground: "text-[#F8F2E8]", marker: "04" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState(regions[0].id);
  const socialLinks = trpc.social.publicLinks.useQuery();

  const openRegion = (region = regions.find(item => item.id === activeRegion)!) => {
    setLocation(`/postos?region=${region.id}&q=${encodeURIComponent(region.query)}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = regions.find(item => item.id === activeRegion)!;
    const query = search.trim() || selected.query;
    setLocation(`/postos?region=${selected.id}&q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F2E8] text-[#163840]">
      <header className="relative z-30 border-b border-[#163840]/10 bg-[#163840] text-white">
        <div className="container flex h-[76px] items-center justify-between gap-4">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3" aria-label="Trajeto — início"><img className="size-10 rounded-xl bg-[#FFC928] p-1.5 shadow-[0_0_0_5px_rgba(255,201,40,0.12)]" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><span className="brand-wordmark text-[1.4rem] text-white">trajeto</span><span className="hidden border-l border-white/20 pl-3 text-[0.6rem] font-bold tracking-[0.2em] text-[#FFC928] sm:block">POSTOS ABERTOS</span></button>
          <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.12em] text-white/70 lg:flex"><button onClick={() => document.getElementById("regioes")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#FFC928]">Regiões</button><button onClick={() => document.getElementById("como-usar")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#FFC928]">Como usar</button><button onClick={() => document.getElementById("canais")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#FFC928]">Canais</button></nav>
          <div className="flex items-center gap-2">{isAuthenticated ? <button onClick={() => setLocation("/minha-conta")} className="inline-flex items-center gap-2 rounded-full bg-[#FFC928] px-4 py-2.5 text-xs font-bold text-[#163840] transition hover:bg-white"><CircleUserRound className="size-4" /> {user?.name?.split(" ")[0] || "Minha rota"}</button> : <button onClick={startLogin} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#FFC928] px-4 py-2.5 text-xs font-bold text-[#163840] transition hover:bg-white disabled:opacity-60"><LogIn className="size-4" /> Entrar / criar conta</button>}</div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#3E54E8] pb-12 pt-12 text-white lg:pb-20 lg:pt-20">
          <div className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full border-[44px] border-[#FFC928]" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 size-[520px] rounded-full bg-[#D94F3D]" />
          <div className="pointer-events-none absolute right-[30%] top-8 h-full w-px rotate-[24deg] bg-white/20" />
          <div className="container relative z-10 grid gap-11 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="pt-2"><div className="mb-8 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#FFC928]"><Zap className="size-3.5 fill-current" /> Consulta pública de postos</div><h1 className="font-display max-w-[780px] text-[clamp(3.7rem,8.1vw,7.7rem)] font-semibold leading-[0.8] tracking-[-0.08em]">O posto que<br /><span className="text-[#FFC928]">você procura</span><br />está na rota.</h1><p className="mt-8 max-w-xl border-l-2 border-[#FFC928] pl-5 text-[1.05rem] leading-relaxed text-white/82">Informações públicas, localização e referências oficiais de preço para ajudar você a decidir antes de sair.</p><div className="mt-9 flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-2 bg-white px-4 py-3 font-bold text-[#163840]"><ShieldCheck className="size-4 text-[#D94F3D]" /> Consulte sem cadastro</span><span className="inline-flex items-center gap-2 border border-white/35 px-4 py-3 font-bold text-white"><Sparkles className="size-4 text-[#FFC928]" /> Resgate com conta</span></div></div>
            <section className="relative border-4 border-[#163840] bg-[#F7F2E8] p-5 text-[#163840] shadow-[12px_12px_0_#FFC928] sm:p-7" aria-labelledby="consulta-title"><div className="absolute -right-4 -top-4 grid size-12 place-items-center rounded-full bg-[#D94F3D] text-xs font-bold text-white">AO<br />VIVO</div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#D94F3D]">Encontre pelo lugar</p><h2 id="consulta-title" className="font-display mt-2 text-4xl font-semibold leading-[0.9] tracking-[-0.065em]">Comece a consulta.</h2><form onSubmit={submitSearch} className="mt-7"><label className="text-xs font-bold text-[#48635E]" htmlFor="home-search">Cidade, bairro ou posto</label><div className="mt-2 flex border-2 border-[#163840] bg-white"><Search className="ml-3 mt-3.5 size-5 text-[#D94F3D]" /><input id="home-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: Águas Lindas de Goiás" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-[#8B9B93]" /><button aria-label="Pesquisar postos" className="bg-[#FFC928] px-4 text-[#163840] transition hover:bg-[#D94F3D] hover:text-white"><ArrowRight className="size-5" /></button></div><div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs leading-relaxed text-[#637872]">Selecione uma região ou pesquise livremente.</p><button type="button" onClick={() => document.getElementById("regioes")?.scrollIntoView({ behavior: "smooth" })} className="shrink-0 text-xs font-bold text-[#3E54E8] underline decoration-2 underline-offset-4">Ver regiões</button></div></form></section>
          </div>
        </section>

        <section id="regioes" className="relative bg-[#F7F2E8] py-16 lg:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 border-b-2 border-[#163840] pb-7 md:flex-row md:items-end"><div><p className="eyebrow">Portais de consulta</p><h2 className="font-display mt-3 text-[clamp(3rem,5.4vw,5.5rem)] font-semibold leading-[0.86] tracking-[-0.07em]">Sua região já<br /><span className="text-[#D94F3D]">vem na frente.</span></h2></div><p className="max-w-md text-sm leading-relaxed text-[#5B716C]">Atalhos pensados para abrir a consulta pública onde as pessoas mais circulam. Você pode trocar de região ou escrever qualquer outro destino.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{regions.map(region => <button key={region.id} onClick={() => { setActiveRegion(region.id); openRegion(region); }} className={`group relative min-h-64 overflow-hidden p-6 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_#163840] ${region.color} ${region.foreground}`}><span className="absolute right-5 top-3 font-display text-7xl font-semibold tracking-[-0.1em] opacity-20">{region.marker}</span><p className="relative text-[0.62rem] font-bold uppercase tracking-[0.17em] opacity-75">{region.kicker}</p><h3 className="relative font-display mt-12 text-4xl font-semibold leading-[0.88] tracking-[-0.065em]">{region.name}</h3><p className="relative mt-4 max-w-44 text-sm leading-relaxed opacity-80">{region.copy}</p><span className="relative mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">Explorar postos <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" /></span></button>)}</div><div className="mt-7 flex flex-col gap-4 border-2 border-[#163840] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><MapPinned className="size-6 text-[#D94F3D]" /><p className="text-sm leading-relaxed"><strong>Não encontrou a sua cidade?</strong> Escreva o nome da cidade na busca e comece uma consulta pública.</p></div><button onClick={() => openRegion()} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#163840] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#3E54E8]">Explorar região selecionada <ArrowRight className="size-4" /></button></div></div></section>

        <section id="como-usar" className="bg-[#D94F3D] py-16 text-white lg:py-20"><div className="container grid gap-10 lg:grid-cols-[0.74fr_1.26fr]"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#FFC928]">Informação antes da partida</p><h2 className="font-display mt-4 text-[clamp(3rem,5vw,5.25rem)] font-semibold leading-[0.84] tracking-[-0.075em]">Consulte. Compare. <span className="text-[#FFC928]">Siga.</span></h2></div><div className="grid gap-px bg-white/30 sm:grid-cols-3">{[["01", "Escolha a região", "Use um atalho ou digite um destino."], ["02", "Abra o posto", "Veja dados públicos e localização."], ["03", "Entre quando quiser", "Crie uma conta apenas para acompanhar e solicitar resgates."]].map(([number, title, copy]) => <article key={number} className="bg-[#D94F3D] p-6"><span className="font-display text-4xl text-[#FFC928]">{number}</span><h3 className="mt-9 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-white/75">{copy}</p></article>)}</div></div></section>

        <section id="canais" className="bg-[#123B40] py-14 text-white"><div className="container flex flex-col justify-between gap-9 lg:flex-row lg:items-end"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#FFC928]">Canais da Trajeto</p><h2 className="font-display mt-4 max-w-xl text-4xl font-semibold leading-[0.9] tracking-[-0.065em]">A rota também<br />continua fora do mapa.</h2></div><div className="max-w-xl border-l-2 border-[#FFC928] pl-5 text-sm leading-relaxed text-white/70">{socialLinks.data?.length ? <><p>Encontre os canais oficiais da Trajeto nos links abaixo.</p><div className="mt-5 flex flex-wrap gap-2">{socialLinks.data.map(link => <a key={link.platform} href={link.url ?? "#"} target="_blank" rel="noreferrer" className="border border-white/25 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#FFC928] transition hover:bg-[#FFC928] hover:text-[#163840]">{link.platform}</a>)}</div></> : <p>Os canais oficiais serão publicados aqui pelo painel operacional quando estiverem prontos. Nenhum perfil externo é exibido sem confirmação de titularidade.</p>}</div></div></section>
      </main>

      <footer className="bg-[#0C292E] py-8 text-white/60"><div className="container flex flex-col justify-between gap-5 text-xs sm:flex-row sm:items-center"><div className="flex items-center gap-2"><img className="size-7 rounded-md bg-[#FFC928] p-1" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><span className="brand-wordmark text-base text-white">trajeto</span><span>· dados públicos em movimento</span></div><button onClick={isAuthenticated ? () => setLocation("/minha-conta") : startLogin} className="font-bold text-[#FFC928] transition hover:text-white">{isAuthenticated ? "Minha rota" : "Entrar / criar conta"} <ArrowRight className="ml-1 inline size-3" /></button></div></footer>
    </div>
  );
}
