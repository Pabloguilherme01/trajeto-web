/**
 * Trajeto 2026: central pública de paradas e deslocamento para o corredor Águas Lindas–DF.
 * A interface prioriza a próxima decisão do motorista, não conteúdo promocional.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useProductEvents } from "@/hooks/useProductEvents";
import { corridorPresets } from "@/lib/corridorPresets";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowUpRight, BadgeCheck, CircleUserRound, ExternalLink, Fuel, LocateFixed, MapPinned, Navigation, Route, Search, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";

const anpQualityUrl = "https://anpcomvcpostos.anp.gov.br/";

function socialEventFor(platform: string) {
  if (platform === "instagram") return "social_instagram_click" as const;
  if (platform === "whatsapp") return "social_whatsapp_click" as const;
  return null;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activePresetId, setActivePresetId] = useState(corridorPresets[0].id);
  const activePreset = corridorPresets.find(item => item.id === activePresetId) ?? corridorPresets[0];
  const socialLinks = trpc.social.publicLinks.useQuery();
  const track = useProductEvents();

  const openSearch = (query: string, presetId = activePreset.id) => {
    track("station_search", query);
    setLocation(`/postos?region=${presetId}&q=${encodeURIComponent(query)}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openSearch(search.trim() || activePreset.query);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1014] text-[#EAF0F2]">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1014]/90 backdrop-blur-xl">
        <div className="container flex h-[70px] items-center justify-between gap-3">
          <button onClick={() => setLocation("/")} className="group flex items-center gap-2.5" aria-label="Trajeto — início">
            <img className="size-9 rounded-xl bg-[#C7FF3C] p-1.5 transition duration-200 group-hover:rotate-6" src="/favicon.svg" alt="" />
            <span className="brand-wordmark text-[1.25rem] text-white">trajeto</span>
            <span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#8DA0AB] sm:block">Entorno em movimento</span>
          </button>
          <nav className="hidden items-center gap-5 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-[#91A3AD] md:flex">
            <button onClick={() => document.getElementById("corredores")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#C7FF3C]">Corredores</button>
            <button onClick={() => document.getElementById("recursos")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#C7FF3C]">Recursos</button>
            <button onClick={() => document.getElementById("canais")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-[#C7FF3C]">Canais</button>
          </nav>
          {isAuthenticated ? <button onClick={() => setLocation("/minha-conta")} className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-[#0B1014]"><CircleUserRound className="size-4" /> {user?.name?.split(" ")[0] || "Minha rota"}</button> : <button onClick={startLogin} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#C7FF3C] px-3.5 py-2 text-xs font-extrabold text-[#0B1014] transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-60"><CircleUserRound className="size-4" /> Entrar</button>}
        </div>
      </header>

      <main>
        <section className="route-grid relative isolate overflow-hidden border-b border-white/8">
          <div className="pointer-events-none absolute -left-24 top-20 size-72 rounded-full border border-[#3DE3FF]/25" />
          <div className="pointer-events-none absolute right-[8%] top-14 hidden size-80 rounded-full border-[32px] border-[#8B5CF6]/15 lg:block" />
          <div className="container relative grid gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="max-w-3xl animate-route-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#D9FF91]"><LocateFixed className="size-3.5" /> Águas Lindas · DF · Entorno</div>
              <h1 className="mt-7 font-display text-[clamp(3.4rem,7vw,7.2rem)] font-semibold leading-[0.86] tracking-[-0.075em] text-white">Sua próxima<br /><span className="text-[#C7FF3C]">parada</span> começa aqui.</h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-[#B7C4CA] sm:text-lg">Consulte postos, compare desvios e escolha a rota com informações públicas. Feito para quem se move entre Águas Lindas e o Distrito Federal.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-[#CED9DE]"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><ShieldCheck className="size-4 text-[#3DE3FF]" /> Dados com origem visível</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Navigation className="size-4 text-[#C7FF3C]" /> Rotas reais no mapa</span></div>
            </div>

            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#121B22]/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:p-7" aria-labelledby="consulta-title">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C7FF3C] to-transparent" />
              <div className="flex items-center justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">Consulta de parada</p><h2 id="consulta-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Onde você vai agora?</h2></div><span className="grid size-11 place-items-center rounded-2xl bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-5" /></span></div>
              <form onSubmit={submitSearch} className="mt-7"><label className="text-xs font-bold text-[#A9BAC2]" htmlFor="home-search">Cidade, bairro, posto ou destino</label><div className="mt-2 flex rounded-2xl border border-white/12 bg-[#0B1014] p-1.5 focus-within:border-[#3DE3FF]"><Search className="ml-3 mt-3 size-5 shrink-0 text-[#3DE3FF]" /><input id="home-search" value={search} onChange={event => setSearch(event.target.value)} placeholder={activePreset.query} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-[#657780]" /><button aria-label="Pesquisar postos" className="grid size-11 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014] transition hover:scale-[1.03] hover:bg-white active:scale-95"><ArrowRight className="size-5" /></button></div></form>
              <div className="mt-6"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]">Atalhos do corredor</p><div className="mt-3 grid grid-cols-2 gap-2">{corridorPresets.map(preset => <button key={preset.id} onClick={() => { setActivePresetId(preset.id); openSearch(preset.query, preset.id); }} className={`rounded-xl border p-3 text-left transition ${activePreset.id === preset.id ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#0B1014]" : "border-white/10 bg-white/[0.03] text-[#D6E0E4] hover:-translate-y-0.5 hover:border-[#3DE3FF] hover:bg-[#3DE3FF]/10"}`}><span className="block text-xs font-extrabold">{preset.label}</span><span className="mt-1 block text-[0.65rem] opacity-65">{preset.detail}</span></button>)}</div></div>
              <p className="mt-5 text-xs leading-relaxed text-[#81929A]">Consulta aberta, sem cadastro. A conta é opcional e serve para guardar paradas, rotas e solicitações.</p>
            </section>
          </div>
        </section>

        <section id="corredores" className="bg-[#EAF0F2] py-16 text-[#0B1014] sm:py-20"><div className="container"><div className="flex flex-col justify-between gap-6 border-b border-[#B6C4CA] pb-7 lg:flex-row lg:items-end"><div><p className="eyebrow">Movimento diário</p><h2 className="section-title mt-3 max-w-2xl">Escolha o corredor,<br /><em>não só a cidade.</em></h2></div><p className="max-w-md text-sm leading-relaxed text-[#52636C]">Os atalhos colocam primeiro os destinos mais usados no eixo Águas Lindas–DF. Você continua livre para buscar qualquer localização.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{corridorPresets.map((preset, index) => <button key={preset.id} onClick={() => openSearch(preset.query, preset.id)} className="group relative overflow-hidden rounded-3xl border border-[#D0DADF] bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#0B1014] hover:shadow-[0_18px_36px_rgba(11,16,20,0.14)]"><span className="absolute right-5 top-3 font-display text-6xl leading-none text-[#EAF0F2]">0{index + 1}</span><div className="relative grid size-11 place-items-center rounded-2xl bg-[#0B1014] text-[#C7FF3C]"><Route className="size-5" /></div><h3 className="relative mt-10 text-xl font-extrabold tracking-tight">{preset.label}</h3><p className="relative mt-2 text-sm text-[#5D6D75]">{preset.detail}</p><span className="relative mt-7 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B1014]">Consultar postos <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></button>)}</div></div></section>

        <section id="recursos" className="bg-[#10181F] py-16 sm:py-20"><div className="container grid gap-8 lg:grid-cols-[0.82fr_1.18fr]"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">Mais decisão, menos ruído</p><h2 className="mt-4 font-display text-[clamp(3rem,5vw,5.4rem)] font-semibold leading-[0.88] tracking-[-0.07em] text-white">Sua rota<br /><span className="text-[#C7FF3C]">com contexto.</span></h2><p className="mt-6 max-w-sm text-sm leading-relaxed text-[#92A4AE]">A Trajeto apresenta dados públicos de localização e encaminha informações de qualidade para a fonte oficial, sem criar notas ou preços próprios.</p></div><div className="grid gap-3 sm:grid-cols-3"><button onClick={() => openSearch(activePreset.query, activePreset.id)} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:-translate-y-1 hover:border-[#3DE3FF] hover:bg-[#3DE3FF]/10"><MapPinned className="size-6 text-[#3DE3FF]" /><h3 className="mt-12 text-lg font-extrabold text-white">Postos por perto</h3><p className="mt-3 text-sm leading-relaxed text-[#91A3AD]">Veja postos reais, distância e horários disponíveis.</p><span className="mt-7 inline-flex text-xs font-bold text-[#3DE3FF]">Abrir consulta <ArrowRight className="ml-1 size-3.5" /></span></button><button onClick={() => setLocation("/planejar")} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:-translate-y-1 hover:border-[#C7FF3C] hover:bg-[#C7FF3C]/10"><Navigation className="size-6 text-[#C7FF3C]" /><h3 className="mt-12 text-lg font-extrabold text-white">Planejar desvio</h3><p className="mt-3 text-sm leading-relaxed text-[#91A3AD]">Calcule sua rota e consulte referências oficiais quando houver cobertura.</p><span className="mt-7 inline-flex text-xs font-bold text-[#C7FF3C]">Abrir planejador <ArrowRight className="ml-1 size-3.5" /></span></button><a href={anpQualityUrl} target="_blank" rel="noreferrer" className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:-translate-y-1 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10"><BadgeCheck className="size-6 text-[#BDA5FF]" /><h3 className="mt-12 text-lg font-extrabold text-white">Qualidade oficial</h3><p className="mt-3 text-sm leading-relaxed text-[#91A3AD]">Consulte fiscalizações e informações do posto no canal da ANP.</p><span className="mt-7 inline-flex text-xs font-bold text-[#BDA5FF]">Abrir fonte oficial <ExternalLink className="ml-1 size-3.5" /></span></a></div></div></section>

        <section id="canais" className="border-t border-white/8 bg-[#0B1014] py-16"><div className="container flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#C7FF3C]">Canais oficiais</p><h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.06em] text-white">Fale com a Trajeto<br />quando precisar.</h2></div><div className="max-w-xl"><p className="text-sm leading-relaxed text-[#92A4AE]">Use os canais oficiais para acompanhar a Trajeto ou abrir uma conversa rápida sobre consulta, rota e postos no Entorno.</p>{socialLinks.data?.length ? <div className="mt-5 flex flex-wrap gap-3">{socialLinks.data.map(link => { const eventName = socialEventFor(link.platform); return <a key={link.platform} href={link.url ?? "#"} target="_blank" rel="noreferrer" onClick={() => { if (eventName) track(eventName, activePreset.query); }} className={`social-link group inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${link.platform === "whatsapp" ? "bg-[#C7FF3C] text-[#0B1014]" : "border border-white/15 bg-white/[0.04] text-white"}`}><span>{link.platform === "whatsapp" ? "Conversar no WhatsApp" : `Seguir no ${link.platform}`}</span><ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>; })}</div> : <p className="mt-5 text-sm text-[#72838C]">Os canais oficiais serão publicados aqui quando estiverem prontos.</p>}</div></div></section>
      </main>

      <footer className="border-t border-white/8 bg-[#070B0E] py-7"><div className="container flex flex-col gap-4 text-xs text-[#7A8D96] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><img className="size-6 rounded-lg bg-[#C7FF3C] p-1" src="/manus-storage/trajeto-mark_78544e73.png" alt="" /><span className="brand-wordmark text-sm text-white">trajeto</span><span>· dados públicos em movimento</span></div><a href={anpQualityUrl} target="_blank" rel="noreferrer" className="transition hover:text-[#C7FF3C]">Qualidade e fiscalização: fonte oficial ANP</a></div></footer>
    </div>
  );
}
