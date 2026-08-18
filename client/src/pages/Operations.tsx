import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, BarChart3, Clock3, Fuel, Loader2, MapPinned, Route as RouteIcon, Share2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

const DEFAULT_ANP_SOURCE_URL = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/revendas_lpc_2026-08-09_2026-08-15.xlsx";
const socialPlatforms = ["instagram", "whatsapp", "tiktok", "youtube"] as const;
const growthLabels: Record<string, string> = {
  station_search: "Buscas de postos",
  map_open: "Mapas abertos",
  station_compare: "Comparações iniciadas",
  route_open: "Rotas abertas",
  favorite_intent: "Interesse em favorito",
  favorite_saved: "Favoritos salvos",
  account_cta: "Chamadas para conta",
  redemption_requested: "Resgates solicitados",
  social_instagram_click: "Cliques no Instagram",
  social_whatsapp_click: "Cliques no WhatsApp",
  alert_preference_saved: "Alertas de corredor salvos",
  anp_quality_open: "Consultas ANP com VC",
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Operations() {
  const overview = trpc.operations.overview.useQuery();
  const [anpUrl, setAnpUrl] = useState(DEFAULT_ANP_SOURCE_URL);
  const [anpNotice, setAnpNotice] = useState<string | null>(null);
  const [socialDraft, setSocialDraft] = useState<Record<(typeof socialPlatforms)[number], string>>({ instagram: "", whatsapp: "", tiktok: "", youtube: "" });
  const syncAnp = trpc.operations.syncAnp.useMutation({ onSuccess: result => { setAnpNotice(`${result.imported.toLocaleString("pt-BR")} referências ANP foram importadas.`); overview.refetch(); }, onError: () => setAnpNotice("Não foi possível importar a planilha. Confirme se a URL é uma planilha .xlsx oficial da ANP.") });
  const social = trpc.social.all.useQuery();
  const saveSocial = trpc.social.save.useMutation({ onSuccess: () => social.refetch() });
  const data = overview.data;

  useEffect(() => {
    if (!social.data) return;
    setSocialDraft(current => ({ ...current, ...Object.fromEntries(social.data.map(link => [link.platform, link.url ?? ""])) }));
  }, [social.data]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <header className="mb-9 flex flex-col justify-between gap-6 border-b border-[#D8DED5] pb-7 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Operação Trajeto</p><h1 className="font-display mt-3 text-5xl font-semibold leading-none tracking-[-0.065em]">Visão de rota.</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-[#637873]">Acompanhe o que foi pesquisado, os resgates solicitados e a evolução da operação com dados registrados no sistema.</p></div>
          <Link href="/planejar"><Button className="rounded-none bg-[#163840] font-bold text-white hover:bg-[#28545B]">Abrir planejador <ArrowRight className="ml-2 size-4" /></Button></Link>
        </header>

        {overview.isLoading && <div className="flex min-h-64 items-center justify-center text-[#58716B]"><Loader2 className="mr-3 size-5 animate-spin" />Carregando dados operacionais…</div>}
        {overview.isError && <div className="border-l-4 border-[#BA5B45] bg-[#F6E9E3] p-6"><h2 className="font-display text-2xl font-semibold">Acesso restrito à operação</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6C534C]">Entre com a conta proprietária da aplicação para visualizar as informações operacionais. A rota pública continua disponível para pesquisa.</p></div>}

        {data && <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Rotas pesquisadas", value: data.totals.routeSearches, note: "consultas registradas", icon: RouteIcon, accent: "#FFC928" },
              { label: "Resgates solicitados", value: data.totals.redemptions, note: "pedidos gerados", icon: Fuel, accent: "#BA5B45" },
              { label: "Aguardando ação", value: data.totals.pendingRedemptions, note: "status solicitado", icon: Clock3, accent: "#163840" },
              { label: "Consentimentos", value: data.totals.consentEvents, note: "decisões registradas", icon: ShieldCheck, accent: "#668B7D" },
            ].map(metric => <article key={metric.label} className="relative overflow-hidden border border-[#D7DFD8] bg-white p-5"><span className="absolute right-0 top-0 h-2 w-16" style={{ backgroundColor: metric.accent }} /><metric.icon className="size-5 text-[#58726E]" /><p className="mt-7 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#778A85]">{metric.label}</p><p className="font-display mt-2 text-5xl font-semibold tracking-[-0.075em]">{metric.value}</p><p className="mt-2 text-xs text-[#697D78]">{metric.note}</p></article>)}
          </section>

          <section className="mt-8 border border-[#D7DFD8] bg-[#E5E9FF] p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Sinais de conversão</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">O que move a jornada.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#506A64]">Eventos agregados da jornada pública. Eles não armazenam identificadores de pessoa, número de telefone ou conteúdo de busca detalhado.</p></div><Activity className="size-5 text-[#3E54E8]" /></div>{data.growthEvents.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.growthEvents.map(item => <div key={item.event} className="border-l-4 border-[#3E54E8] bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.13em] text-[#607670]">{growthLabels[item.event] || item.event}</p><p className="font-display mt-2 text-4xl font-semibold tracking-[-0.07em]">{item.total}</p></div>)}</div> : <p className="mt-6 border-t border-dashed border-[#AAB8D5] pt-5 text-sm text-[#53656B]">Os sinais aparecerão aqui conforme visitantes pesquisarem, compararem e abrirem rotas.</p>}</section>

          <section className="mt-8 grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="border border-[#D7DFD8] bg-white p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Mais pesquisadas</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Rotas que chamam atenção.</h2></div><BarChart3 className="size-5 text-[#BA5B45]" /></div>{data.topRoutes.length ? <div className="mt-7 divide-y divide-[#E0E6E0]">{data.topRoutes.map((route, index) => <div key={`${route.origin}-${route.destination}`} className="flex items-center gap-4 py-4"><span className="font-display text-2xl tracking-[-0.06em] text-[#BA5B45]">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{route.origin}</p><p className="my-1 flex items-center gap-1 text-xs text-[#71847F]"><ArrowRight className="size-3" /> {route.destination}</p></div><span className="border border-[#CBD8CF] px-2 py-1 text-xs font-bold text-[#45635C]">{route.consultations} {route.consultations === 1 ? "consulta" : "consultas"}</span></div>)}</div> : <div className="mt-7 flex min-h-48 flex-col justify-center border-y border-dashed border-[#CCD7CE] text-sm text-[#6D817C]"><MapPinned className="mb-3 size-5 text-[#BA5B45]" /><p className="font-bold text-[#42615A]">Ainda não há rotas registradas.</p><p className="mt-1">As primeiras pesquisas feitas no planejador aparecerão aqui.</p></div>}</article>

            <article className="border border-[#D7DFD8] bg-[#163840] p-6 text-white sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#FFC928]">Sinal da operação</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Resgates em aberto.</h2></div><Activity className="size-5 text-[#FFC928]" /></div>{data.recentRedemptions.length ? <div className="mt-7 space-y-3">{data.recentRedemptions.map(redemption => <div key={redemption.id} className="border-l-2 border-[#FFC928] bg-white/8 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{redemption.stationName}</p><span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#FFC928]">{redemption.status}</span></div><p className="mt-2 text-xs text-white/60">{redemption.redemptionCode} · {formatDate(redemption.requestedAt)}</p></div>)}</div> : <div className="mt-7 flex min-h-48 flex-col justify-center border-y border-dashed border-white/20 text-sm text-white/65"><Fuel className="mb-3 size-5 text-[#FFC928]" /><p className="font-bold text-white">Nenhuma solicitação pendente.</p><p className="mt-1">Os resgates aparecem aqui assim que forem solicitados por usuários autenticados.</p></div>}</article>
          </section>

          <section className="mt-8 border border-[#D7DFD8] bg-white p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Últimas consultas</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Percursos registrados.</h2></div><RouteIcon className="size-5 text-[#BA5B45]" /></div>{data.recentRoutes.length ? <div className="mt-7 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#D7DFD8] text-[0.62rem] uppercase tracking-[0.14em] text-[#748681]"><tr><th className="pb-3 pr-6 font-bold">Origem</th><th className="pb-3 pr-6 font-bold">Destino</th><th className="pb-3 pr-6 font-bold">Distância</th><th className="pb-3 font-bold">Consulta</th></tr></thead><tbody className="divide-y divide-[#E4EAE4]">{data.recentRoutes.map(route => <tr key={route.id}><td className="py-4 pr-6 font-semibold">{route.origin}</td><td className="py-4 pr-6 text-[#5C746E]">{route.destination}</td><td className="py-4 pr-6 text-[#5C746E]">{(route.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</td><td className="py-4 text-xs text-[#748681]">{formatDate(route.createdAt)}</td></tr>)}</tbody></table></div> : <p className="mt-7 border-t border-dashed border-[#CCD7CE] pt-6 text-sm text-[#6D817C]">Sem dados ainda. Use o planejador para fazer a primeira consulta.</p>}</section>
          <section className="mt-8 border border-[#D7DFD8] bg-[#EAF0E9] p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Referências semanais da ANP</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Atualize os preços pesquisados.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5B716C]">Cole a URL da planilha “Preços por posto revendedor” publicada pela ANP. A importação mantém a origem e a data de coleta de cada referência, sem transformar o dado em preço em tempo real.</p></div><Fuel className="size-5 text-[#BA5B45]" /></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={anpUrl} onChange={event => setAnpUrl(event.target.value)} aria-label="URL da planilha ANP" className="min-w-0 flex-1 border border-[#BFCFC4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#163840]" /><Button onClick={() => syncAnp.mutate({ sourceUrl: anpUrl })} disabled={syncAnp.isPending} className="rounded-none bg-[#163840] font-bold text-white hover:bg-[#28545B]">{syncAnp.isPending ? <Loader2 className="size-4 animate-spin" /> : "Importar ANP"}</Button></div>{anpNotice && <p className="mt-4 border-l-2 border-[#FFC928] pl-3 text-sm text-[#54706A]">{anpNotice}</p>}</section>
          <section className="mt-8 border border-[#D7DFD8] bg-white p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Canais oficiais</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Vínculos sociais autônomos.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5B716C]">Cole apenas URLs oficiais. O site mostra um canal publicamente somente depois que você salva um link HTTPS válido; nenhuma conta externa é conectada ou recebe permissões.</p></div><Share2 className="size-5 text-[#BA5B45]" /></div><div className="mt-6 grid gap-4 md:grid-cols-2">{socialPlatforms.map(platform => <label key={platform} className="block"><span className="mb-2 block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#607670]">{platform}</span><input value={socialDraft[platform]} onChange={event => setSocialDraft(current => ({ ...current, [platform]: event.target.value }))} placeholder={`https://${platform === "whatsapp" ? "wa.me/" : `${platform}.com/`}`} className="w-full border border-[#BFCFC4] bg-[#F9FBF8] px-3 py-2.5 text-sm outline-none focus:border-[#163840]" /></label>)}</div><div className="mt-6 flex flex-wrap items-center gap-4"><Button onClick={() => saveSocial.mutate({ links: socialPlatforms.map(platform => ({ platform, url: socialDraft[platform].trim() || null, active: Boolean(socialDraft[platform].trim()) })) })} disabled={saveSocial.isPending} className="rounded-none bg-[#163840] font-bold text-white hover:bg-[#28545B]">{saveSocial.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar canais"}</Button>{saveSocial.isSuccess && <p className="text-sm text-[#357044]">Canais atualizados. A home já exibirá apenas os links ativos.</p>}{saveSocial.isError && <p className="text-sm text-[#B13C2D]">Use URLs HTTPS completas e válidas para publicar um canal.</p>}</div></section>
        </>}
      </div>
    </DashboardLayout>
  );
}
