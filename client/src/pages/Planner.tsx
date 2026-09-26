import { RouteMap } from "@/components/RouteMap";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { StationSheet } from "@/components/StationSheet";
import { trpc } from "@/lib/trpc";
import { useProductEvents } from "@/hooks/useProductEvents";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Fuel, Loader2, MapPin, Route as RouteIcon, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type PlannedRoute = NonNullable<ReturnType<typeof trpc.routes.plan.useMutation>["data"]>;

function minutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function RouteResultSkeleton() {
  return <div aria-label="Carregando resultado da rota" className="flex min-h-[340px] flex-col justify-between" role="status">
    <div className="flex gap-3"><div className="h-16 flex-1 animate-pulse bg-[#E7ECE7]" /><div className="h-16 flex-1 animate-pulse bg-[#E7ECE7]" /></div>
    <div className="h-44 animate-pulse border border-[#D8DED5] bg-[#EEF2ED]" />
    <div className="space-y-3"><div className="h-4 w-28 animate-pulse bg-[#E7ECE7]" /><div className="h-8 w-3/4 animate-pulse bg-[#E7ECE7]" /><p className="text-xs text-[#6A7C78]">Calculando percurso e buscando postos próximos…</p></div>
  </div>;
}

export default function Planner() {
  const [, setLocation] = useLocation();
  const [origin, setOrigin] = useState(() => new URLSearchParams(window.location.search).get("origem") || "");
  const [destination, setDestination] = useState(() => new URLSearchParams(window.location.search).get("destino") || "");
  const [locationConsent, setLocationConsent] = useState(false);
  const [planned, setPlanned] = useState<PlannedRoute | null>(null);
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  
  useEffect(() => {
    const routeLabel = origin.trim() && destination.trim() ? origin.trim() + " → " + destination.trim() : "Planejar rota";
    const title = routeLabel + " · Trajeto";
    const description = origin.trim() && destination.trim()
      ? "Planeje " + origin.trim() + " → " + destination.trim() + " e compare distância, duração e opções de abastecimento."
      : "Planeje uma rota, compare distância, duração e opções de abastecimento.";
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
  }, [origin, destination]);
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [gasolinePrice, setGasolinePrice] = useState("");
  const [ethanolPrice, setEthanolPrice] = useState("");
  const [gasolineKmPerLiter, setGasolineKmPerLiter] = useState("");
  const [ethanolKmPerLiter, setEthanolKmPerLiter] = useState("");
  const [priceWeight, setPriceWeight] = useState(70);
  const [selectedStop, setSelectedStop] = useState<PlannedRoute["stops"][number] | null>(null);
  const { isAuthenticated } = useAuth();
  const track = useProductEvents();
  const planRoute = trpc.routes.plan.useMutation({ onSuccess: result => { setPlanned(result); track("route_open", destination || origin); } });
  const recordConsent = trpc.consent.record.useMutation();
  const requestRedemption = trpc.operations.requestRedemption.useMutation({
    onSuccess: redemption => { track("redemption_requested", destination || origin); setRescueMessage(`Solicitação registrada. Seu código é ${redemption.code}.`); },
    onError: error => {
      if (error.message.includes("Please login")) startLogin();
    },
  });
  const favoriteInput = useMemo(() => ({ placeIds: planned?.stops.map(stop => stop.placeId) ?? [] }), [planned]);
  const favoriteState = trpc.personal.favoriteState.useQuery(favoriteInput, { enabled: isAuthenticated && Boolean(planned?.stops.length) });
  const addFavorite = trpc.personal.addFavorite.useMutation({ onSuccess: () => { favoriteState.refetch(); track("favorite_saved", destination || origin); }, onError: error => { if (error.message.includes("Please login")) startLogin(); } });
  const vehicles = trpc.personal.vehicles.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const selectedVehicle = vehicles.data?.find(vehicle => vehicle.id === selectedVehicleId) ?? null;
  const selectedConsumption = selectedVehicle ? Number(selectedVehicle.customKmPerLiter ?? selectedVehicle.highwayKmPerLiter ?? selectedVehicle.cityKmPerLiter ?? 0) : 0;
  const fuelEconomyInput = useMemo(() => {
    const price = Number(pricePerLiter.replace(",", "."));
    if (!planned || !selectedVehicle || !Number.isFinite(price) || price <= 0 || selectedConsumption <= 0) return null;
    return { distanceKm: planned.route.distanceMeters / 1000, pricePerLiter: price, kmPerLiter: selectedConsumption, tankLiters: selectedVehicle.tankLiters ? Number(selectedVehicle.tankLiters) : null };
  }, [planned, selectedVehicle, selectedConsumption, pricePerLiter]);
  const fuelEconomy = trpc.personal.fuelEconomy.useQuery(fuelEconomyInput ?? { distanceKm: 0, pricePerLiter: 1, kmPerLiter: 1 }, { enabled: Boolean(fuelEconomyInput) && isAuthenticated, retry: 0 });

  useEffect(() => {
    if (selectedVehicleId || !vehicles.data?.length) return;
    setSelectedVehicleId(vehicles.data[0].id);
  }, [selectedVehicleId, vehicles.data]);

  useEffect(() => {
    if (!selectedVehicle || selectedConsumption <= 0) return;
    setGasolineKmPerLiter(current => current || String(selectedConsumption));
    setEthanolKmPerLiter(current => current || String(selectedConsumption));
  }, [selectedVehicle, selectedConsumption]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRescueMessage(null);
    if (locationConsent) {
      await recordConsent.mutateAsync({ purpose: "location", accepted: true, policyVersion: "2026-08" });
    }
    const parse = (value: string) => Number(value.replace(",", "."));
    const gasoline = parse(gasolinePrice);
    const ethanol = parse(ethanolPrice);
    const gasolineConsumption = parse(gasolineKmPerLiter);
    const ethanolConsumption = parse(ethanolKmPerLiter);
    const economy = selectedVehicle && [gasoline, ethanol, gasolineConsumption, ethanolConsumption].every(value => Number.isFinite(value) && value > 0)
      ? { vehicleId: selectedVehicle.id, gasolinePrice: gasoline, ethanolPrice: ethanol, gasolineKmPerLiter: gasolineConsumption, ethanolKmPerLiter: ethanolConsumption }
      : undefined;
    await planRoute.mutateAsync({ origin, destination, locationConsent, economy, recommendation: { priceWeight } });
  };

  const toggleFavorite = () => {
    if (!selectedStop) return;
    if (!isAuthenticated) return startLogin();
    addFavorite.mutate({ placeId: selectedStop.placeId, stationName: selectedStop.name, stationAddress: selectedStop.address, lat: selectedStop.lat, lng: selectedStop.lng });
  };
  const openNavigation = (stop: PlannedRoute["stops"][number]) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.name)}&destination_place_id=${encodeURIComponent(stop.placeId)}`, "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };

  const openNavigation = (stop: PlannedRoute["stops"][number]) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.name)}&destination_place_id=${encodeURIComponent(stop.placeId)}`, "_blank", "noopener,noreferrer");
    track("route_open", destination || origin);
  };

  const shareRoute = async () => {
    if (!origin.trim() || !destination.trim()) return;
    const url = `${window.location.origin}/planejar?origem=${encodeURIComponent(origin.trim())}&destino=${encodeURIComponent(destination.trim())}`;
    const text = `Planejei esta rota no Trajeto: ${origin.trim()} → ${destination.trim()}. Veja distância, duração e opções de abastecimento.`;
    try {
      if (navigator.share) await navigator.share({ title: "Trajeto · rota", text, url });
      else { await navigator.clipboard.writeText(`${text}\\n${url}`); setRescueMessage("Link da rota copiado para compartilhar."); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRescueMessage("Não foi possível preparar o compartilhamento agora.");
    }
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
          <h1 className="font-display mt-4 text-[clamp(3rem,6vw,5.4rem)] font-semibold leading-[0.86] tracking-[-0.065em]">Escolha melhor<br /><span className="text-[#BA5B45]">antes de sair.</span></h1>
          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[#5A706D]">Pesquise uma rota de carro, veja distância e duração e compare onde parar sem confundir referência de combustível com preço em tempo real.</p>
          <div className="mt-5 grid gap-2 border-l-2 border-[#FFC928] bg-[#FFFBEF] p-4 text-xs leading-relaxed text-[#5A706D] sm:grid-cols-3"><p><strong className="text-[#163840]">Rota e distância:</strong> Google Maps na consulta atual.</p><p><strong className="text-[#163840]">Trânsito:</strong> TomTom quando houver ocorrência acionável.</p><p><strong className="text-[#163840]">Combustível:</strong> referências semanais datadas da ANP, não preço em tempo real.</p></div>
        </div>

        <section className="grid overflow-hidden border border-[#C7D2C9] bg-white lg:grid-cols-[0.74fr_1.26fr]">
          <form onSubmit={submit} className="relative bg-[#163840] p-6 text-white sm:p-8">
            <div className="absolute left-0 top-0 h-2 w-24 bg-[#FFC928]" />
            <div className="mb-8 flex items-start justify-between gap-5"><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#FFC928]">Seu ponto de partida</p><h2 className="font-display mt-3 text-3xl font-semibold leading-none tracking-[-0.055em]">Desenhe a rota.</h2></div><RouteIcon className="size-6 text-[#FFC928]" /></div>
            <label className="text-xs font-bold text-white/75" htmlFor="origin">Origem</label>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#FFC928]" /><input id="origin" required minLength={3} value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Brasília, DF" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>
            <label className="mt-7 block text-xs font-bold text-white/75" htmlFor="destination">Destino</label>
            <div className="relative mt-2"><MapPin className="absolute left-0 top-3.5 size-4 text-[#BA5B45]" /><input id="destination" required minLength={3} value={destination} onChange={event => setDestination(event.target.value)} placeholder="Ex.: Águas Lindas de Goiás, GO" className="w-full border-b border-white/25 bg-transparent py-3 pl-7 text-base outline-none placeholder:text-white/35 focus:border-[#FFC928]" /></div>
            <fieldset className="mt-7 border-t border-white/15 pt-5"><legend className="text-xs font-bold text-[#FFC928]">O que pesa mais na decisão</legend><div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-white/70">Menor desvio</span><output htmlFor="recommendation-weight" className="rounded-full bg-white/10 px-2.5 py-1 font-bold text-[#FFC928]">{priceWeight}% preço</output><span className="font-bold text-white/70">Menor preço</span></div><input id="recommendation-weight" type="range" min="0" max="100" step="5" value={priceWeight} onChange={event => setPriceWeight(Number(event.target.value))} aria-describedby="recommendation-weight-description" className="mt-3 h-2 w-full cursor-pointer accent-[#FFC928]" /><p id="recommendation-weight-description" className="mt-3 text-xs leading-relaxed text-white/60">Preço: <strong className="text-white">{priceWeight}%</strong> · desvio real: <strong className="text-white">{100 - priceWeight}%</strong>. O Trajeto mede o desvio real nos candidatos com referência de preço disponíveis para esta rota.</p></fieldset>
            {isAuthenticated && <fieldset className="mt-7 border-t border-white/15 pt-5"><legend className="text-xs font-bold text-[#FFC928]">Comparar combustíveis nesta rota</legend><p className="mt-2 text-xs leading-relaxed text-white/60">Opcional. Os valores escolhidos ficam vinculados ao histórico desta rota.</p><label className="mt-3 block text-xs font-bold text-white/75">Veículo<select value={selectedVehicleId ?? ""} onChange={event => setSelectedVehicleId(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm"><option value="">Selecione</option>{vehicles.data?.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.nickname}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-white/75">Gasolina R$/L<input value={gasolinePrice} onChange={event => setGasolinePrice(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Etanol R$/L<input value={ethanolPrice} onChange={event => setEthanolPrice(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Gasolina km/L<input value={gasolineKmPerLiter} onChange={event => setGasolineKmPerLiter(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label><label className="text-xs font-bold text-white/75">Etanol km/L<input value={ethanolKmPerLiter} onChange={event => setEthanolKmPerLiter(event.target.value)} inputMode="decimal" className="mt-1.5 w-full border border-white/25 bg-[#0F2B31] px-3 py-2.5 text-base text-white outline-none focus:border-[#FFC928] sm:text-sm" /></label></div></fieldset>}
            <label className="mt-7 flex cursor-pointer items-start gap-3 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/75"><input checked={locationConsent} onChange={event => setLocationConsent(event.target.checked)} className="mt-0.5 size-4 accent-[#FFC928]" type="checkbox" /><span><strong className="block text-white">Registrar minha escolha de localização</strong>O consentimento é opcional e fica salvo como evidência da sua decisão.</span></label>
            <div className="sticky bottom-0 z-10 -mx-6 mt-7 border-t border-white/15 bg-[#163840]/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"><Button type="submit" disabled={planRoute.isPending} className="min-h-12 w-full rounded-none bg-[#FFC928] font-bold text-[#163840] hover:bg-white">{planRoute.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Calculando rota…</> : <>Comparar rota e paradas <ArrowRight className="ml-2 size-4" /></>}</Button></div>
            {planRoute.isError && <p role="alert" className="mt-4 border-l-2 border-[#FFB5A1] pl-3 text-sm text-[#FFD1C3]">Não foi possível calcular a rota. Confira os endereços e tente novamente.</p>}
          </form>

          <div className="p-6 sm:p-8">
            {planRoute.isPending ? <RouteResultSkeleton /> : !planned ? (
              <div className="flex h-full min-h-[340px] flex-col justify-between"><div className="grid size-14 place-items-center rounded-full bg-[#E9EFE9] text-[#BA5B45]"><Sparkles className="size-6" /></div><div><p className="eyebrow">O que aparece aqui</p><h2 className="font-display mt-4 max-w-md text-4xl font-semibold leading-[0.93] tracking-[-0.06em]">Postos reais,<br />dados com contexto.</h2><p className="mt-5 max-w-lg text-sm leading-relaxed text-[#627773]">A busca usa localização e rota para organizar os pontos de abastecimento. Quando a referência oficial da ANP estiver vinculada ao posto, ela aparece separada e com a data de coleta.</p></div><div className="flex flex-wrap gap-3 text-xs font-bold text-[#496760]"><span className="border border-[#C7D2C9] px-3 py-2">Google Maps</span><span className="border border-[#C7D2C9] px-3 py-2">ANP · atualização periódica</span></div></div>
            ) : (
              <div>
                <div className="grid gap-3 border-b border-[#D8DED5] pb-6 sm:grid-cols-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Distância</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{planned.route.distanceLabel}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Tempo estimado</p><p className="font-display mt-1 text-3xl font-semibold tracking-[-0.06em]">{minutes(planned.route.durationSeconds)}</p></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#BA5B45]">Trajeto</p><p className="mt-2 text-sm font-semibold leading-snug">{planned.route.summary || "Rota calculada"}</p></div></div>
                <div className="mt-6"><RouteMap origin={planned.route.origin} destination={planned.route.destination} stops={planned.stops} /></div>
                <section className="mt-6 border border-[#C7D2C9] bg-[#F2F5EF] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#54706A]">Situação da rota</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">{planned.traffic.label}</h3><p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#54706A]">{planned.traffic.detail} Consulta registrada em {new Date(planned.traffic.checkedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p></div><span className={`rounded-full px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${planned.traffic.state === "active" ? "bg-[#DDEFD4] text-[#315227]" : "bg-[#FFF1BF] text-[#6C4E00]"}`}>{planned.traffic.state === "active" ? "Fonte ao vivo" : "Cobertura pendente"}</span></div>{planned.traffic.incidents.length > 0 && <div className="mt-5 grid gap-3 border-y border-[#D1DBD1] py-4">{planned.traffic.incidents.map(incident => <article key={incident.id} className="border-l-2 border-[#BA5B45] bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-bold text-[#163840]">{incident.description}</p><span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#8A4434]">{incident.severity === "major" ? "Impacto alto" : incident.severity === "moderate" ? "Impacto moderado" : "Impacto leve"}</span></div><p className="mt-2 text-xs leading-relaxed text-[#58716B]">{[incident.from, incident.to].filter(Boolean).join(" → ") || "Local informado pela fonte"}{incident.delaySeconds ? ` · atraso estimado de ${Math.round(incident.delaySeconds / 60)} min` : ""}{incident.reportedAt ? ` · atualização ${new Date(incident.reportedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p></article>)}</div>}<div className="mt-4 flex flex-wrap gap-2">{planned.traffic.officialSources.map(source => <a key={source.label} href={source.url} target="_blank" rel="noreferrer" className="border border-[#C7D2C9] bg-white px-3 py-2 text-xs font-bold text-[#36564E] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">{source.label} · {source.detail}</a>)}<a href={planned.traffic.anpComVcUrl} target="_blank" rel="noreferrer" onClick={() => track("anp_quality_open", destination || origin)} className="border border-[#C7D2C9] bg-white px-3 py-2 text-xs font-bold text-[#36564E] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">ANP com VC · qualidade do posto</a></div></section>
                <div className="mt-6 flex items-center gap-3 rounded-sm bg-[#EFF3EE] px-4 py-3 text-xs leading-relaxed text-[#54706A]"><ShieldCheck className="size-4 shrink-0 text-[#BA5B45]" />{planned.priceCoverage > 0 ? `${planned.priceCoverage} referência(s) de preço da ANP foram vinculadas a esta pesquisa.` : "Os postos abaixo são reais. Ainda não há referência ANP vinculada aos identificadores retornados."}</div>
                {planned.recommendation && <section className="mt-6 border border-[#C6DA65] bg-[#F4F8D9] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#567100]">Opção que atende sua prioridade</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">{planned.recommendation.name}</h3></div><span className={`border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${planned.recommendation.detourSource === "real" ? "border-[#8AAA42] bg-white text-[#486800]" : "border-[#C8B569] bg-[#FFFBE9] text-[#695B17]"}`}>{planned.recommendation.detourSource === "real" ? "Desvio real" : "Desvio aproximado"}</span></div><p className="mt-2 text-sm leading-relaxed text-[#52644A]">Preço de referência: <strong>{planned.recommendation.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · desvio {planned.recommendation.detourSource === "real" ? "real" : "estimado"} de <strong>{planned.recommendation.detourKm.toLocaleString("pt-BR")} km</strong>.</p>{planned.recommendation.netSavings && <div className="mt-3 border-l-2 border-[#789C28] bg-white/60 p-3"><p className="text-xs font-bold text-[#426100]">Economia líquida estimada: {planned.recommendation.netSavings.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs leading-relaxed text-[#5B6C4B]">Economia no percurso: {planned.recommendation.netSavings.grossFuelSaving.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · custo estimado do desvio: {planned.recommendation.netSavings.detourFuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. {planned.recommendation.netSavingsMethod}</p></div>}<p className="mt-2 text-xs leading-relaxed text-[#5B6C4B]">{planned.recommendation.rationale} {planned.recommendation.method}</p><p className="mt-2 text-xs font-medium text-[#52644A]">{planned.recommendationDiagnostics.realDetoursCalculated}/{planned.recommendationDiagnostics.requestedCandidates} candidato(s) tiveram o desvio calculado pela rota real.</p></section>}
                {planned.economy && <section className="mt-6 border border-[#BA5B45]/35 bg-[#FFF5EE] p-4 sm:p-5"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#8A4434]">Comparação gasolina × etanol</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">Melhor cenário: {planned.economy.recommendedFuel === "ethanol" ? "etanol" : "gasolina"}.</h3><p className="mt-2 text-sm leading-relaxed text-[#58716B]">{planned.economy.reason} O ponto de equilíbrio do etanol é {planned.economy.breakEvenEthanolPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/L.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C7F78]">Gasolina</p><p className="font-display mt-2 text-3xl tracking-[-0.06em]">{planned.economy.gasoline.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs text-[#5B716C]">{planned.economy.gasoline.litersNeeded.toLocaleString("pt-BR")} L · {planned.economy.gasoline.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C7F78]">Etanol</p><p className="font-display mt-2 text-3xl tracking-[-0.06em]">{planned.economy.ethanol.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs text-[#5B716C]">{planned.economy.ethanol.litersNeeded.toLocaleString("pt-BR")} L · {planned.economy.ethanol.costPerKm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km</p></div></div></section>}
                <section className="mt-6 border border-[#9BC9B4] bg-[#EAF4EC] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#356451]">Economia da rota</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#163840]">Quanto esta viagem pode consumir.</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-[#56766A]">A estimativa combina a distância real da rota com um veículo e preço escolhidos por você. Ela não presume consumo nem preço de bomba.</p></div><Fuel className="size-5 text-[#356451]" /></div>{isAuthenticated ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#365E51]">Veículo<select value={selectedVehicleId ?? ""} onChange={event => setSelectedVehicleId(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none focus:border-[#163840]"><option value="">Selecione um veículo</option>{vehicles.data?.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.nickname}{vehicle.customKmPerLiter || vehicle.highwayKmPerLiter || vehicle.cityKmPerLiter ? ` · ${vehicle.customKmPerLiter ?? vehicle.highwayKmPerLiter ?? vehicle.cityKmPerLiter} km/L` : " · consumo não informado"}</option>)}</select></label><label className="text-xs font-bold text-[#365E51]">Preço escolhido (R$/L)<input value={pricePerLiter} onChange={event => setPricePerLiter(event.target.value)} inputMode="decimal" placeholder="Ex.: 5,89" className="mt-1.5 w-full border border-[#A7CDBA] bg-white px-3 py-2.5 text-sm text-[#163840] outline-none placeholder:text-[#8AA89D] focus:border-[#163840]" /></label>{planned.anpReferences.length > 0 && <div className="sm:col-span-2"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#56766A]">Usar uma referência semanal ANP como ponto de partida</p><div className="mt-2 flex flex-wrap gap-2">{planned.anpReferences.slice(0, 4).map(reference => <button key={reference.id} type="button" onClick={() => setPricePerLiter(String(reference.price))} className="border border-[#A7CDBA] bg-white px-3 py-2 text-xs font-bold text-[#356451] transition hover:border-[#163840] hover:bg-[#163840] hover:text-white">{reference.product} · {Number(reference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</button>)}</div></div>}<div className="sm:col-span-2">{!vehicles.isLoading && !vehicles.data?.length && <p className="border-l-2 border-[#356451] bg-white/55 p-3 text-xs leading-relaxed text-[#365E51]">Cadastre um veículo na <Link href="/minha-conta" className="font-bold underline underline-offset-2">Minha conta</Link> para usar consumo e autonomia pessoais.</p>}{selectedVehicle && selectedConsumption <= 0 && <p className="border-l-2 border-[#BA5B45] bg-white/55 p-3 text-xs leading-relaxed text-[#7C3F30]">Este veículo não tem consumo informado. Edite-o na Minha conta antes de calcular.</p>}{fuelEconomy.isLoading && <p className="text-sm font-bold text-[#356451]">Calculando estimativa…</p>}{fuelEconomy.data && <div className="grid gap-3 sm:grid-cols-3"><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Custo de ida</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.tripCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Combustível</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.litersNeeded.toLocaleString("pt-BR")} L</p></div><div className="bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#6C8E81]">Autonomia</p><p className="font-display mt-2 text-3xl tracking-[-0.06em] text-[#163840]">{fuelEconomy.data.autonomyKm ? `${fuelEconomy.data.autonomyKm.toLocaleString("pt-BR")} km` : "—"}</p><p className="mt-1 text-xs text-[#56766A]">{fuelEconomy.data.refuelsNeeded == null ? "Adicione o tanque para estimar paradas." : fuelEconomy.data.refuelsNeeded ? `${fuelEconomy.data.refuelsNeeded} parada(s) estimada(s).` : "Sem parada estimada."}</p></div></div>}</div></div> : <div className="mt-5 border-l-2 border-[#356451] bg-white/55 p-4 text-sm leading-relaxed text-[#365E51]">Entre na sua conta para usar um veículo salvo e calcular consumo, custo e autonomia desta rota. <button type="button" onClick={startLogin} className="font-bold underline underline-offset-2">Entrar agora</button></div>}</section>
              </div>
            )}
          </div>
        </section>

        {planned && <section className="mt-10"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Paradas na rota</p><h2 className="font-display mt-3 text-4xl font-semibold tracking-[-0.06em]">Postos encontrados.</h2></div><div className="flex items-end gap-3"><p className="max-w-md text-sm leading-relaxed text-[#607570]">Preços são referências datadas; o desvio informado é real quando calculado pela rota.</p><button type="button" onClick={shareRoute} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-none border border-[#163840] px-4 py-2 text-xs font-bold text-[#163840] transition hover:bg-[#163840] hover:text-white"><Share2 className="size-4" /> Compartilhar rota</button></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{planned.stops.map(stop => { const isRecommended = planned.recommendation?.placeId === stop.placeId; return <article key={stop.placeId} className={`flex min-h-60 flex-col border bg-white p-5 ${isRecommended ? "border-[#9EBF1F] ring-1 ring-[#D4E67F]" : "border-[#D4DDD5]"}`}><div className="flex items-start justify-between gap-4"><div className="grid size-11 place-items-center rounded-full bg-[#E8EEE8] text-[#163840]"><Fuel className="size-4" /></div><span className={`text-[0.6rem] font-bold uppercase tracking-[0.14em] ${isRecommended ? "text-[#668400]" : "text-[#748985]"}`}>{isRecommended ? "Melhor para sua prioridade" : "Posto próximo"}</span></div><h3 className="mt-6 text-lg font-bold leading-tight">{stop.name}</h3><p className="mt-2 text-sm leading-relaxed text-[#667A76]">{stop.address}</p><div className="mt-auto pt-5">{stop.priceReference ? <p className="mb-2 text-xs text-[#55736C]">Referência ANP: <strong>{Number(stop.priceReference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · {new Date(stop.priceReference.collectedAt).toLocaleDateString("pt-BR")}</p> : <p className="mb-2 text-xs text-[#788A86]">Preço oficial ainda não vinculado para este posto.</p>}{isRecommended && <p className="mb-4 text-xs leading-relaxed text-[#5D7200]">Desvio {planned.recommendation?.detourSource === "real" ? "real" : "estimado"}: {planned.recommendation?.detourKm.toLocaleString("pt-BR")} km.</p>}<div className="grid grid-cols-2 gap-2"><Button onClick={() => { setSelectedStop(stop); track("station_sheet_opened", destination || origin); }} variant="outline" className="min-h-11 rounded-none border-[#163840] text-[#163840] hover:bg-[#163840] hover:text-white">Ver ficha</Button><Button onClick={() => openNavigation(stop)} variant="outline" className="min-h-11 rounded-none border-[#163840] text-[#163840] hover:bg-[#163840] hover:text-white"><ExternalLink className="mr-2 size-3.5" />Navegar</Button></div></div></article>; })}</div>
        </section>}

        <StationSheet open={Boolean(selectedStop)} onOpenChange={open => !open && setSelectedStop(null)} stop={selectedStop} recommendation={selectedStop && planned?.recommendation?.placeId === selectedStop.placeId ? planned.recommendation : null} favorite={Boolean(selectedStop && favoriteState.data?.includes(selectedStop.placeId))} onFavorite={toggleFavorite} onNavigationConfirmed={() => track("station_navigation_confirmed", destination || origin)} />

        {planned && planned.anpReferences.length > 0 && <section className="mt-8 border border-[#D7DFD8] bg-white p-5 sm:p-6"><p className="eyebrow">Fonte de preço</p><h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.045em]">Referências semanais da ANP</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#607570]">Os preços mostrados nos cartões são referências datadas e só aparecem quando há vínculo com o posto. Esta fonte não representa o preço atual na bomba.</p><div className="mt-4 flex flex-wrap gap-2">{planned.anpReferences.slice(0, 4).map(reference => <span key={reference.id} className="border border-[#CBD8CF] bg-[#F8FAF7] px-3 py-2 text-xs font-bold text-[#45635C]">{reference.product} · {Number(reference.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {new Date(reference.collectedAt).toLocaleDateString("pt-BR")}</span>)}</div></section>}

        {rescueMessage && <div className="mt-8 flex items-center gap-3 border-l-4 border-[#FFC928] bg-[#EAF0E9] p-5 text-sm text-[#42645C]"><CheckCircle2 className="size-5 text-[#163840]" />{rescueMessage}</div>}
        <div className="mt-12 border-t border-[#D8DED5] pt-6 text-xs leading-relaxed text-[#667A76]">Dados geográficos e de rota: Google Maps. Preços, quando exibidos, são referências oficiais periódicas da ANP e não constituem oferta ou garantia de preço no posto.</div>
      </main>
    </div>
  );
}
