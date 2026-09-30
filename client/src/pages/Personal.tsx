import DashboardLayout from "@/components/DashboardLayout";
import { RouteAlertPreferences } from "@/components/RouteAlertPreferences";
import { VehicleGarage } from "@/components/VehicleGarage";
import { Button } from "@/components/ui/button";
import { personalAccessCopy } from "@/lib/dashboardAccessCopy";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BellRing, Clock3, Fuel, Heart, History, Loader2, MapPinned, Route as RouteIcon, Share2 } from "lucide-react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import MobilePageHeader from "@/components/MobilePageHeader";

function date(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Personal() {
  const overview = trpc.personal.overview.useQuery();
  const utils = trpc.useUtils();
  const removeFavorite = trpc.personal.removeFavorite.useMutation({ onSuccess: () => utils.personal.overview.invalidate() });
  const data = overview.data;

  return <DashboardLayout accessCopy={personalAccessCopy}>
    <div className="mx-auto max-w-7xl">
      <MobilePageHeader eyebrow="Minha conta" title="Seu painel de viagem." description="Rotas, postos favoritos, veículo e alertas organizados para a próxima saída." icon={History} actionLabel="Planejar uma rota" actionHref="/planejar" accent="violet" />
      <header className="mb-9 hidden flex-col gap-6 border-b border-white/10 pb-7 md:flex">
        <div><p className="eyebrow">Minha rota</p><h1 className="font-display mt-3 text-5xl font-semibold leading-none tracking-[-0.065em] text-white">Tudo que você guardou.</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-[#9FB1BA]">Guarde apenas o que ajuda nas próximas viagens: postos, veículos, rotas e alertas.</p></div>
        <Link href="/postos?q=Bras%C3%ADlia%2C%20DF"><Button className="rounded-xl bg-[#C7FF3C] font-bold text-[#0B1014] hover:bg-white">Consultar postos <ArrowRight className="ml-2 size-4" /></Button></Link>
      </header>

      {overview.isLoading && <div role="status" aria-live="polite" className="flex min-h-72 items-center justify-center text-[#AFC0C7]"><Loader2 className="mr-3 size-5 animate-spin" />Carregando sua rota…</div>}
      {overview.isError && <div role="alert" className="rounded-2xl border border-[#FF7D6A]/30 bg-[#FF7D6A]/10 p-5 text-sm leading-relaxed text-[#FFC2B7]"><strong className="block text-white">Não foi possível carregar seus dados.</strong><span className="mt-1 block">Tente novamente em alguns instantes. Seus registros no servidor não são apagados por esta falha.</span><Button type="button" onClick={() => overview.refetch()} disabled={overview.isFetching} className="mt-4 min-h-11 bg-[#C7FF3C] font-bold text-[#0B1014] hover:bg-white">{overview.isFetching ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Tentar novamente</Button></div>}
      {data && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Consultas salvas", value: data.routes.length, icon: History, accent: "#C7FF3C" },
            { label: "Favoritos", value: data.favorites.length, icon: Heart, accent: "#BDA5FF" },
            { label: "Corredores alertados", value: data.alerts.length, icon: BellRing, accent: "#3DE3FF" },
          ].map(item => <article key={item.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5"><span className="absolute right-0 top-0 h-1.5 w-16" style={{ backgroundColor: item.accent }} /><item.icon className="size-5 text-[#AFC0C7]" /><p className="mt-7 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8397A1]">{item.label}</p><p className="font-display mt-2 text-5xl font-semibold tracking-[-0.075em] text-white">{item.value}</p></article>)}
        </section>

        <RouteAlertPreferences alerts={data.alerts} />

        <VehicleGarage />

        <section className="mt-8">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Postos favoritos</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em] text-white">Suas paradas rápidas.</h2></div><Heart className="size-5 text-[#FF7D6A]" /></div>{data.favorites.length ? <div className="mt-7 divide-y divide-white/10">{data.favorites.map(station => <div key={station.id} className="flex items-center gap-4 py-4"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#C7FF3C] text-[#0B1014]"><Fuel className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{station.stationName}</p><p className="mt-1 truncate text-xs text-[#97AAB2]">{station.stationAddress}</p></div><div className="flex gap-2"><a href={`https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-lg border border-white/12 text-[#C7FF3C] transition hover:bg-white hover:text-[#0B1014]" aria-label="Abrir no mapa"><MapPinned className="size-3.5" /></a><button onClick={() => removeFavorite.mutate({ placeId: station.placeId })} disabled={removeFavorite.isPending} className="grid size-8 place-items-center rounded-lg border border-white/12 text-[#FFAA9C] transition hover:bg-[#FF7D6A]/15" aria-label="Remover favorito"><Heart className="size-3.5 fill-current" /></button></div></div>)}</div> : <div className="mt-7 flex min-h-40 flex-col justify-center border-y border-dashed border-white/15 text-sm text-[#9FB1BA]"><Heart className="mb-3 size-5 text-[#FF7D6A]" /><p className="font-bold text-white">Nenhum posto salvo ainda.</p><p className="mt-1">Use o coração na consulta pública para criar seus atalhos.</p></div>}</article>
        </section>

        <div className="mt-8 space-y-2 md:hidden">
          {data.routes.length ? data.routes.map(route => (
            <article key={`mobile-${route.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.52rem] font-black uppercase tracking-[0.14em] text-[#3DE3FF]">Rota salva</p>
                  <h3 className="mt-1 truncate text-sm font-black text-white">{route.origin} → {route.destination}</h3>
                </div>
                <Link href={`/planejar?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`} className="mobile-pressable grid shrink-0 place-items-center rounded-xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/10 text-[#C7FF3C]" aria-label={`Repetir rota de ${route.origin} para ${route.destination}`}>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[0.62rem]">
                <div className="rounded-xl bg-black/15 p-3"><span className="block text-white/35">Distância</span><strong className="mt-1 block text-white">{(route.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong></div>
                <div className="rounded-xl bg-black/15 p-3"><span className="block text-white/35">Consulta</span><strong className="mt-1 block text-white">{date(route.createdAt)}</strong></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => { void shareText(`Minha rota no Trajeto: ${route.origin} → ${route.destination}.`, `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`, "Trajeto"); }} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl border border-[#BDA5FF]/20 bg-[#BDA5FF]/[0.06] px-3 text-[0.6rem] font-black text-[#E6DCFF]"><Share2 className="size-3.5" /> Compartilhar</button><Link href={`/planejar?origem=${encodeURIComponent(route.origin)}&destino=${encodeURIComponent(route.destination)}`} className="mobile-pressable inline-flex items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.6rem] font-black text-[#0B1014]"><ArrowRight className="size-3.5" /> Repetir rota</Link></div>
              <div className="mt-2 rounded-xl border border-white/8 bg-black/10 p-3 text-[0.62rem]">
                <span className="text-white/35">Cenário</span>
                <strong className="mt-1 block text-[#C7FF3C]">{route.vehicleNickname || "Sem veículo salvo"}</strong>
                <span className="mt-0.5 block text-[#A9BBC2]">{route.vehicleNickname ? `${route.selectedFuel === "ethanol" ? "Etanol" : "Gasolina"}${route.estimatedTripCost ? ` · ${Number(route.estimatedTripCost).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : " · sem custo salvo"}` : "Você ainda não registrou um cenário de combustível."}</span>
              </div>
            </article>
          )) : <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-[#9FB1BA]">Nenhuma rota salva ainda. <Link href="/planejar" className="font-bold text-[#C7FF3C]">Planeje sua próxima viagem.</Link></div>}
        </div>

        <section className="mt-8 hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7 md:block"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Histórico de consultas</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em] text-white">Caminhos que você pesquisou.</h2></div><RouteIcon className="size-5 text-[#3DE3FF]" /></div>{data.routes.length ? <div className="mt-7 overflow-x-auto"><table className="min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-[0.62rem] uppercase tracking-[0.14em] text-[#8498A1]"><tr><th className="pb-3 pr-6">Origem</th><th className="pb-3 pr-6">Destino</th><th className="pb-3 pr-6">Distância</th><th className="pb-3 pr-6">Veículo e cenário</th><th className="pb-3">Consulta</th></tr></thead><tbody className="divide-y divide-white/10">{data.routes.map(route => <tr key={route.id}><td className="py-4 pr-6 font-semibold text-white">{route.origin}</td><td className="py-4 pr-6 text-[#A9BBC2]">{route.destination}</td><td className="py-4 pr-6 text-[#A9BBC2]">{(route.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</td><td className="py-4 pr-6 text-xs text-[#A9BBC2]">{route.vehicleNickname ? <><strong className="block text-[#C7FF3C]">{route.vehicleNickname}</strong><span>{route.selectedFuel === "ethanol" ? "Etanol" : "Gasolina"}{route.estimatedTripCost ? ` · ${Number(route.estimatedTripCost).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : " · sem custo salvo"}</span></> : "Sem cenário de combustível"}</td><td className="py-4 text-xs text-[#8498A1]"><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{date(route.createdAt)}</span></td></tr>)}</tbody></table></div> : <div className="mt-7 border-t border-dashed border-white/15 pt-6 text-sm text-[#9FB1BA]">Suas pesquisas feitas com a conta aparecerão aqui. <Link href="/planejar" className="font-bold text-[#C7FF3C] underline underline-offset-4">Planejar uma rota</Link>.</div>}</section>
      </>}
    </div>
  </DashboardLayout>;
}
