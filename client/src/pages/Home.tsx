import { useProductEvents } from "@/hooks/useProductEvents";
import { appUrl } from "@/lib/appUrl";
import { corridorPresets, type CorridorPreset } from "@/lib/corridorPresets";
import { ArrowRight, BadgeCheck, Download, Fuel, MapPinned, Navigation, Search, ShieldCheck, TimerReset } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";

const anpQualityUrl = "https://anpcomvcpostos.anp.gov.br/";

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<CorridorPreset["id"]>(corridorPresets[0]?.id ?? "aguas-lindas");
  const track = useProductEvents();
  const activePreset = corridorPresets.find(item => item.id === activePresetId) ?? corridorPresets[0];

  const openSearch = (query: string, presetId = activePreset?.id) => {
    const normalized = query.trim() || activePreset?.query || "";
    if (normalized.length < 3) {
      setSearchError("Digite pelo menos 3 caracteres para pesquisar.");
      return;
    }
    setSearchError(null);
    track("station_search", normalized);
    setLocation(`${appUrl("/postos")}?region=${encodeURIComponent(presetId ?? "")}&q=${encodeURIComponent(normalized)}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openSearch(search);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1014] text-[#EAF0F2]">
      <header className="border-b border-white/8 bg-[#0B1014]">
        <div className="container flex h-[68px] items-center justify-between gap-4">
          <a href={appUrl("/")} className="flex items-center gap-2.5" aria-label="Trajeto — início">
            <img className="size-9 rounded-xl bg-[#C7FF3C] p-1.5" src={appUrl("/favicon.svg")} alt="" />
            <span className="brand-wordmark text-xl text-white">trajeto</span>
          </a>
          <nav className="flex items-center gap-2 text-xs font-bold">
            <a href={appUrl("/ajuda")} className="rounded-full px-3 py-2 text-[#9FB0B8] transition hover:bg-white/5 hover:text-white">Como funciona</a>
            <a href={appUrl("/planejar")} className="rounded-full bg-[#C7FF3C] px-4 py-2.5 text-[#0B1014] transition hover:bg-white">Planejar rota</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-[#C7FF3C]/15 bg-[#0F171D]">
          <div className="container py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#C7FF3C]">App para celular</p>
                <p className="mt-1 text-sm font-bold text-white">Instale o Trajeto na tela inicial e consulte o que já foi salvo mesmo sem internet.</p>
              </div>
              <a href="#instalar-app" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#C7FF3C]/45 px-4 py-2 text-xs font-extrabold text-[#DFFF9D] sm:w-auto">
                <Download className="size-4" /> Como instalar
              </a>
            </div>
          </div>
        </section>

        <section className="border-b border-white/8">
          <div className="container grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#D9FF91]">
                <Navigation className="size-3.5" /> Águas Lindas · DF · Entorno
              </div>
              <h1 className="mt-6 font-display text-[clamp(3.3rem,7vw,7rem)] font-semibold leading-[0.84] tracking-[-0.075em] text-white">
                Pare melhor.<br /><span className="text-[#C7FF3C]">Chegue melhor.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-[#B7C4CA] sm:text-lg">
                Encontre onde parar, compare distância e desvio e planeje a próxima viagem com referências de combustível. Sem cadastro para começar.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <MapPinned className="size-5 text-[#3DE3FF]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Postos reais</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Localização, distância e dados disponíveis na consulta.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <TimerReset className="size-5 text-[#C7FF3C]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Menos desvio</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Compare a parada com o impacto real na rota.</p>
                </div>
                <div className="border border-white/10 bg-white/[0.035] p-4">
                  <BadgeCheck className="size-5 text-[#BDA5FF]" />
                  <p className="mt-4 text-sm font-extrabold text-white">Fonte visível</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8799A2]">Referências oficiais aparecem separadas das estimativas.</p>
                </div>
              </div>
            </div>

            <section className="rounded-[1.75rem] border border-white/10 bg-[#121B22] p-5 shadow-[0_24px_80px_rgba(0,0,0,.3)] sm:p-7" aria-labelledby="search-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Comece aqui</p>
                  <h2 id="search-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Onde você vai passar?</h2>
                </div>
                <Fuel className="size-6 text-[#C7FF3C]" />
              </div>

              <form onSubmit={submitSearch} className="mt-7" noValidate>
                <label htmlFor="home-search" className="text-xs font-bold text-[#A9BAC2]">Cidade, bairro, posto ou destino</label>
                <div className="mt-2 flex rounded-2xl border border-white/12 bg-[#0B1014] p-1.5 focus-within:border-[#3DE3FF]">
                  <Search className="ml-3 mt-3 size-5 shrink-0 text-[#3DE3FF]" />
                  <input id="home-search" minLength={3} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? "home-search-error" : undefined} value={search} onChange={event => { setSearch(event.target.value); if (searchError) setSearchError(null); }} placeholder={activePreset?.query ?? "Ex.: Águas Lindas de Goiás"} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-[#657780]" />
                  <button type="submit" aria-label="Pesquisar postos" className="grid size-11 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014] transition hover:bg-white active:scale-95">
                    <ArrowRight className="size-5" />
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]">Atalhos mais usados</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {corridorPresets.slice(0, 4).map(preset => (
                    <button key={preset.id} onClick={() => { setActivePresetId(preset.id); openSearch(preset.query, preset.id); }} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C7FF3C] hover:bg-[#C7FF3C]/8">
                      <span className="block text-xs font-extrabold text-white">{preset.label}</span>
                      <span className="mt-1 block text-[0.65rem] text-[#7F919A]">{preset.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-relaxed text-[#7F919A]">
                Consulta pública. Entre somente se quiser salvar favoritos, veículos, rotas ou alertas.
              </p>
            </section>
          </div>
        </section>

        <section className="bg-[#EAF0F2] py-14 text-[#0B1014] sm:py-18">
          <div className="container">
            <div className="max-w-2xl">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#326575]">Uma decisão por vez</p>
              <h2 className="mt-3 font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[0.9] tracking-[-0.07em]">Descubra → compare → <em>decida.</em></h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#52636C]">O Trajeto não precisa que você entenda a plataforma. Você informa onde está indo e recebe o contexto necessário para escolher a próxima parada.</p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-[#CFD9DD] bg-white p-5">
                <span className="text-xs font-black text-[#52636C]">01</span>
                <h3 className="mt-8 text-xl font-extrabold">Ache o posto</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#617179]">Veja opções próximas e abra a navegação no aplicativo de mapas escolhido.</p>
              </article>
              <article className="rounded-2xl border border-[#CFD9DD] bg-white p-5">
                <span className="text-xs font-black text-[#52636C]">02</span>
                <h3 className="mt-8 text-xl font-extrabold">Meça o desvio</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#617179]">Veja o efeito da parada na viagem e compare o desvio antes de decidir.</p>
              </article>
              <article className="rounded-2xl border border-[#CFD9DD] bg-white p-5">
                <span className="text-xs font-black text-[#52636C]">03</span>
                <h3 className="mt-8 text-xl font-extrabold">Entenda o impacto</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#617179]">Quando houver dados suficientes, estime o custo da rota sem confundir referência com preço de bomba.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#10181F] py-14 sm:py-18">
          <div className="container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#C7FF3C]"><ShieldCheck className="size-5" /><span className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">Transparência</span></div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em] text-white sm:text-4xl">Preço de referência não é preço de bomba.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#9BAEB7]">Quando houver vínculo verificável, o Trajeto mostra a referência da ANP com data e fonte. Dados de mapas e estimativas próprias ficam identificados separadamente.</p>
            </div>
            <a href={anpQualityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-extrabold text-white transition hover:border-[#C7FF3C] hover:text-[#C7FF3C]">
              <BadgeCheck className="size-4" /> Ver fonte oficial
            </a>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#0B1014] py-12">
          <div className="container flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-white">Gostou da consulta?</p>
              <p className="mt-1 text-xs text-[#7F919A]">Compartilhe a página com quem faz esse caminho todos os dias.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={appUrl("/postos")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014]">Consultar postos <ArrowRight className="size-4" /></a>
              <a href={appUrl("/planejar")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-extrabold text-white">Planejar rota <Navigation className="size-4" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#070B0E] py-6">
        <div className="container flex flex-col gap-2 text-xs text-[#71828B] sm:flex-row sm:items-center sm:justify-between">
          <span>Trajeto · informação para quem se move no Entorno.</span>
          <a href={appUrl("/ajuda")} className="hover:text-white">Como funciona e fontes</a>
        </div>
      </footer>
    </div>
  );
}
