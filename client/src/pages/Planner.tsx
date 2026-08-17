import { RouteMap } from "@/components/RouteMap";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, Fuel, Loader2, MapPin, MessageSquareLock, Route as RouteIcon, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

type PlannedRoute = NonNullable<ReturnType<typeof trpc.routes.plan.useMutation>["data"]>;

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export default function Planner() {
  const [, setLocation] = useLocation();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [locationConsent, setLocationConsent] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsNotice, setSmsNotice] = useState<string | null>(null);
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);
  const planRoute = trpc.routes.plan.useMutation({ onSuccess: setPlanned });
  const recordConsent = trpc.consent.record.useMutation();
  const requestRedemption = trpc.operations.requestRedemption.useMutation({
    onSuccess: redemption => setRescueMessage(`Solicitação registrada. Seu código é ${redemption.code}.`),
    onError: error => {
      if (error.message.includes("Please login")) startLogin();
    },
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRescueMessage(null);
    if (locationConsent) {
      await recordConsent.mutateAsync({ purpose: "location", accepted: true, policyVersion: "2026-08" });
    }
    await planRoute.mutateAsync({ origin, destination, locationConsent });
  };

  const requestStop = (stop: PlannedRoute["stops"][number]) => {
    if (!planned?.searchId) {
      setRescueMessage("A rota foi exibida, mas ainda não pôde ser registrada. Tente calcular novamente.");
      return;
    }
    requestRedemption.mutate({ routeSearchId: planned.searchId, placeId: stop.placeId, stationName: stop.name, stationAddress: stop.address });
  };

  const recordSmsConsent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = smsPhone.replace(/\D/g, "");
    if (digits.length < 10 || !smsConsent) {
      setSmsNotice("Informe um celular válido e marque o consentimento antes de continuar.");
      return;
    }
    await recordConsent.mutateAsync({ purpose: "sms_auth", accepted: true, phone: digits, policyVersion: "2026-08" });
    setSmsNotice("Seu aceite foi registrado. A confirmação por SMS será disponibilizada quando o serviço Twilio for conectado.");
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#163840]">
      <header className="border-b border-[#D8DED5] bg-[#14343C] text-white">
        <div className="container flex h-[72px] items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" aria-label="Voltar para início">
            <img className="size-9 rounded-lg bg-[#FFC928] p-1" src="/manus-storage/trajeto-mark_78544e73.png" alt="" />
            <span className="brand-wordmark text-xl text-white">trajeto</span>
            <span className="hidden border-l border-white/20 pl-3 text-[0.62rem] font-bold tracking-[0.18em] text-[#FFC928] sm:block">PLANEJADOR</span>
          </Link>
          <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-xs font-bold text-white/70 transition hover:text-[#FFC928]"><ArrowLeft className="size-4" /> Início</button>
        </div>
      </header>

      <main className="container py-10 lg:py-14">
        <div className="mb-10 max-w-3xl">
          <p className="eyebrow">Rota com dados reais</p>
          <h1 className="font-display mt-4 text-[clamp(3rem,6vw,5.4rem)] font-semibold leading-[0.86] tracking-[-0.065em]">Compare o caminho<br /><span className="text-[#BA5B45]">antes de chegar.</span></h1>
          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[#5A706D]">Pesquise uma rota de carro, veja distância e duração calculadas pelo Google Maps e encontre postos reais próximos ao início e ao destino.</p>
        </div>

        <section className="grid overflow-hidden border border-[#C7D2C9] bg-white lg:grid-cols-[0.74fr_1.26fr]">
          <form onSubmit={submit} className="relative bg-[#163840] p-6 text-white sm:p-8">
            <div className="absolute left-0 top-0 h-2 w-24 bg-[#FFC928]" />
            <div className="mb-8 flex items-start justify-between gap-5"><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Seu ponto de partida</p><h2 className="font-display mt-3 text-3xl font-semibold leading-none tracking-[-0.055em]">Desenhe a rota.</h2></div><RouteIcon className="size-6 text-[#FFC928]" /></div>
            <label className="text-xs font-bold text-white/75" htmlFor="origin">Origem</label>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#FFC928]" /><input id="origin" required minLength={3} value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Brasília, DF" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>
            <label className="mt-7 block text-xs font-bold text-white/75" htmlFor="destination">Destino</label>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#BA5B45]" /><input id="destination" required minLength={3} value={destination} onChange={event => setDestination(event.target.value)} placeholder="Ex.: Águas Lindas de Goiás, GO" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>
            <label className="mt-7 flex cursor-pointer items-start gap-3 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/75"><input checked={locationConsent} onChange={event => setLocationConsent(event.target.checked)} className="mt-0.5 size-4 accent-[#FFC928]" type="checkbox" /><span><strong className="block text-white">Registrar minha escolha de localização</strong>O consentimento é opcional e fica salvo como evidência da sua decisão.</span></label>
            <Button type="submit" disabled={planRoute.isPending} className="mt-7 h-12 w-full rounded-none bg-[#FFC928] font-bold text-[#163840] hover:bg-white">{planRoute.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Calculando rota…</> : <>Ver postos e percurso <ArrowRight className="ml-2 size-4" /></>}</Button>
            {planRoute.isError && <p role="alert" className="mt-4 border-l-2 border-[#FFB5A1] pl-3 text-sm text-[#FFD1C3]">Não foi possível calcular a rota. Confira os endereços e tente novamente.</p>}
          </form>

          <div className="p-6 sm:p-8">
            {!planned ? (
              <div className="flex h-full min-h-[340px] flex-col justify-between"><div className="grid size-14 place-items-center rounded-full bg-[#E9EFE9] text-[#BA5B45]"><Sparkles className="size-6" /></div><div><p className="eyebrow">O que aparece aqui</p><h2 className="font-display mt-4 max-w-md text-4xl font-semibold leading-[0.93] tracking-[-0.06em]">Postos reais,<br />dados com contexto.</h2><p className="mt-5 max-w-lg text-sm leading-relaxed text-[#627773]">A busca usa localização e rota para organizar os pontos de abastecimento. Quando a referência oficial da ANP estiver vinculada ao posto, ela aparece separada e com a data de coleta.</p></div><div className="flex flex-wrap gap-3 text-xs font-bold text-[#496760]"><span className="border border-[#C7D2C9] px-3 py-2">Google Maps</span><span className="border border-[#C7D2C9] px-3 py-2">ANP · atualização periódica</span></div></div>
            ) : (
              <div>
                <div className="grid gap-3 border-b border-[#D8DED5] pb-6 sm:grid-cols-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Distância</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{planned.route.distanceLabel}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Tempo estimado</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{minutes(planned.route.durationSeconds)}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Trajeto</p><p className="mt-2 text-sm font-semibold leading-snug">{planned.route.summary || "Rota calculada"}</p></div></div>
                <div className="mt-6"><RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} /></div>
                <div className="mt-6 flex items-center gap-3 rounded-sm bg-[#EFF3EE] px-4 py-3 text-xs leading-relaxed text-[#54706A]"><ShieldCheck className="size-4 shrink-0 text-[#BA5B45]" />{planned.priceCoverage > 0 ? `${planned.priceCoverage} referência(s) de preço da ANP foram vinculadas a esta pesquisa.` : "Os postos abaixo são reais. Ainda não há referência ANP vinculada aos identificadores retornados."}</div>
              </div>
            )}
          </div>
        </section>

        {planned && <section className="mt-10"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Paradas na rota</p><h2 className="font-display mt-3 text-4xl font-semibold tracking-[-0.06em]">Postos encontrados.</h2></div><p className="max-w-md text-sm leading-relaxed text-[#607570]">As condições comerciais não são inferidas: uma solicitação de resgate só registra seu interesse e deve ser confirmada pela operação.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{planned.stops.map(stop => <article key={stop.placeId} className="flex min-h-60 flex-col border border-[#D4DDD5] bg-white p-5"><div className="flex items-start justify-between gap-4"><div className="grid size-9 place-items-center rounded-full bg-[#E8EEE8] text-[#163840]"><Fuel className="size-4" /></div><span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#748985]">Posto próximo</span></div><h3 className="mt-7 text-lg font-bold leading-tight">{stop.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#667A76]">{stop.address}</p><div className="mt-auto pt-5">{stop.priceReference ? <p className="mb-4 text-xs text-[#55736C]">Referência ANP: <strong>{Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · {new Date(stop.priceReference.collectedAt).toLocaleDateString("pt-BR")}</p> : <p className="mb-4 text-xs text-[#788A86]">Preço oficial ainda não vinculado para este posto.</p>}<Button onClick={() => requestStop(stop)} disabled={requestRedemption.isPending} variant="outline" className="w-full rounded-none border-[#163840] text-[#163840] hover:bg-[#163840] hover:text-white">Solicitar resgate</Button></div></article>)}</div>
        </section>}

        {planned && planned.anpReferences.length > 0 && <section className="mt-10 border border-[#D7DFD8] bg-white p-6 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Referências oficiais de preço</p><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Levantamento semanal da ANP.</h2></div><span className="border border-[#CBD8CF] px-3 py-2 text-xs font-bold text-[#45635C]">Dados por município</span></div><p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#607570]">Estas referências são registros de postos pesquisados pela ANP nos municípios da sua rota. Elas não são associadas automaticamente aos resultados do Google Maps e não constituem oferta comercial.</p><div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#D7DFD8] text-[0.62rem] uppercase tracking-[0.14em] text-[#748681]"><tr><th className="pb-3 pr-5">Posto pesquisado</th><th className="pb-3 pr-5">Produto</th><th className="pb-3 pr-5">Preço</th><th className="pb-3">Coleta</th></tr></thead><tbody className="divide-y divide-[#E4EAE4]">{planned.anpReferences.slice(0, 10).map(reference => <tr key={reference.id}><td className="py-3 pr-5"><strong className="block">{reference.stationName}</strong><span className="text-xs text-[#71847F]">{reference.municipality}/{reference.state}</span></td><td className="py-3 pr-5 text-[#5C746E]">{reference.product}</td><td className="py-3 pr-5 font-bold">{Number(reference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="py-3 text-xs text-[#748681]">{new Date(reference.collectedAt).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div></section>}

        <section className="mt-10 grid overflow-hidden border border-[#C7D2C9] bg-[#EAF0E9] lg:grid-cols-[0.74fr_1.26fr]">
          <div className="bg-[#14343C] p-7 text-white sm:p-9"><MessageSquareLock className="size-7 text-[#FFC928]" /><p className="mt-12 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Autenticação por SMS</p><h2 className="font-display mt-4 max-w-sm text-4xl font-semibold leading-[0.92] tracking-[-0.06em]">Seu aceite precisa ser claro.</h2><p className="mt-5 max-w-md text-sm leading-relaxed text-white/70">O número será destinado exclusivamente à confirmação de acesso. Sem aceite, nenhum código deve ser enviado. Para registrar a decisão, o sistema guarda somente uma impressão criptográfica do número e seus quatro últimos dígitos.</p></div>
          <form onSubmit={recordSmsConsent} className="p-7 sm:p-9"><p className="eyebrow">Etapa preparada</p><h3 className="font-display mt-3 text-3xl font-semibold tracking-[-0.055em]">Registre o consentimento.</h3><label className="mt-6 block text-xs font-bold text-[#31525A]" htmlFor="sms-phone">Celular para futura confirmação</label><input id="sms-phone" value={smsPhone} onChange={event => setSmsPhone(event.target.value)} inputMode="tel" placeholder="(00) 00000-0000" className="mt-2 w-full border-b border-[#9BACA5] bg-transparent py-3 text-lg outline-none focus:border-[#163840]" /><label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#42635D]"><input checked={smsConsent} onChange={event => setSmsConsent(event.target.checked)} className="mt-0.5 size-4 accent-[#163840]" type="checkbox" /><span>Autorizo o envio de <strong>um código de autenticação por SMS</strong> para este número, quando o serviço estiver ativo. Esta autorização não inclui mensagens promocionais.</span></label><Button type="submit" disabled={recordConsent.isPending} className="mt-7 h-11 rounded-none bg-[#163840] px-5 font-bold text-white hover:bg-[#28545B]">{recordConsent.isPending ? <Loader2 className="size-4 animate-spin" /> : "Registrar aceite"}</Button>{smsNotice && <p className="mt-5 border-l-2 border-[#BA5B45] pl-3 text-sm leading-relaxed text-[#54706A]">{smsNotice}</p>}</form>
        </section>

        {rescueMessage && <div className="mt-8 flex items-center gap-3 border-l-4 border-[#FFC928] bg-[#EAF0E9] p-5 text-sm text-[#42645C]"><CheckCircle2 className="size-5 text-[#163840]" />{rescueMessage}</div>}
        <div className="mt-12 border-t border-[#D8DED5] pt-6 text-xs leading-relaxed text-[#667A76]">Dados geográficos e de rota: Google Maps. Preços, quando exibidos, são referências oficiais periódicas da ANP e não constituem oferta ou garantia de preço no posto.</div>
      </main>
    </div>
  );
}
