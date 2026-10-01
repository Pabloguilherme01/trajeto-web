import { ArrowLeft, Copy, ExternalLink, Fuel, Heart, Navigation, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { searchAguasLindasStations, stationMapsSearchUrl } from "@/lib/aguasLindasStations";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildWazeNavigationUrl, shareText, vibration } from "@/lib/mobileTools";
import { listMobileStationFavorites, toggleMobileStationFavorite } from "@/lib/mobileStationStore";
import { buildLocationEntity } from "@/lib/stationEntity";
import { getOfflineAnpSnapshot } from "@/lib/stationMapOffline";
import { groupAnpFuelRows, normalizeAnpFuelRow, type AnpFuelRow } from "@shared/anpRevendedores";
import { indexAnpPricesByCnpj, loadAguasLindasAnpPrices, type AnpPriceSnapshot } from "@/lib/anpPrices";
import { toast } from "sonner";

export default function Local() {
  const [, params] = useRoute("/local/:id");
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const local = useMemo(
    () => searchAguasLindasStations("postos").find(item => item.id === id) ?? null,
    [id],
  );
  const [saved, setSaved] = useState(() => listMobileStationFavorites());
  const [priceSnapshot, setPriceSnapshot] = useState<AnpPriceSnapshot | null>(null);
  const [anpRows, setAnpRows] = useState<AnpFuelRow[]>(() => getOfflineAnpSnapshot().rows);

  useEffect(() => {
    if (!local) return;
    const controller = new AbortController();
    void loadAguasLindasAnpPrices(controller.signal).then(snapshot => {
      if (snapshot) setPriceSnapshot(snapshot);
    });
    return () => controller.abort();
  }, [local]);

  useEffect(() => {
    if (!local || anpRows.length > 0) return;
    let active = true;
    fetch(appUrl("/data/aguas-lindas-anp.json"), { cache: "default" })
      .then(response => response.ok ? response.json() as Promise<{ data?: unknown[] }> : Promise.reject(new Error("snapshot unavailable")))
      .then(payload => {
        if (!active) return;
        const rows = (payload.data ?? [])
          .map(item => item && typeof item === "object" ? normalizeAnpFuelRow(item as Record<string, unknown>) : null)
          .filter((row): row is AnpFuelRow => Boolean(row));
        if (rows.length) setAnpRows(rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [local, anpRows.length]);

  const anp = useMemo(() => {
    if (!local) return null;
    return groupAnpFuelRows(anpRows).find(item => item.cnpj === local.cnpj) ?? null;
  }, [local, anpRows]);

  const price = useMemo(
    () => indexAnpPricesByCnpj(priceSnapshot?.data ?? []).get(local?.cnpj ?? "")?.[0] ?? null,
    [local?.cnpj, priceSnapshot],
  );

  const entity = local ? buildLocationEntity(local, anp, price) : null;
  const isSaved = local ? saved.some(item => item.placeId === "aguas-lindas:" + local.cnpj) : false;

  if (!local || !entity) {
    return (
      <main className="min-h-[100dvh] bg-[#0B1014] p-5 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#121B22] p-6">
          <p className="text-[0.58rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Local</p>
          <h1 className="mt-2 text-2xl font-black">Ficha não encontrada.</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">Este endereço não está materializado no catálogo público deste dispositivo.</p>
          <Link href={appUrl("/mapa")} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014]">
            <ArrowLeft className="size-4" /> Voltar ao mapa
          </Link>
        </div>
      </main>
    );
  }

  const destination = entity.coordinates
    ? entity.coordinates.lat + "," + entity.coordinates.lng
    : entity.address;
  const googleUrl = buildGoogleMapsDestinationUrl(destination, true);
  const wazeUrl = buildWazeNavigationUrl(entity.address, entity.coordinates ?? undefined);
  const appleUrl = buildAppleMapsDirectionsUrl(destination);

  const toggleSaved = () => {
    if (!entity.coordinates) return;
    const result = toggleMobileStationFavorite({
      placeId: "aguas-lindas:" + local.cnpj,
      name: entity.name,
      address: entity.address,
      lat: entity.coordinates.lat,
      lng: entity.coordinates.lng,
      phone: entity.phone,
      website: entity.website,
      openingHours: local.mapData?.hours ? [local.mapData.hours] : [],
      isOpen: local.mapData?.operationalStatus === "open"
        ? true
        : local.mapData?.operationalStatus === "closed"
          ? false
          : null,
    });
    if (result.error) { toast.message("Não foi possível guardar o favorito. Confira o espaço e as permissões do navegador."); return; }
    setSaved(result.stations);
    vibration();
  };

  const share = async () => {
    try {
      await shareText(entity.name + " · " + entity.address, window.location.href, "Trajeto · local");
    } catch {}
  };

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-3xl pt-5 sm:pt-8">
        <Link href={appUrl("/mapa")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/8 px-3 text-xs font-black text-white/65">
          <ArrowLeft className="size-4" /> Mapa
        </Link>

        <header className="mt-4 rounded-[1.7rem] border border-white/10 bg-[#121B22] p-5 shadow-[0_22px_60px_rgba(0,0,0,.22)]">
          <div className="flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
              <Fuel className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.55rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Ficha completa</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-.04em]">{entity.name}</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{entity.address}</p>
            </div>
            <button
              type="button"
              onClick={toggleSaved}
              disabled={!entity.coordinates}
              className={"grid min-h-11 min-w-11 place-items-center rounded-xl border " + (isSaved ? "border-[#FF7D6A]/30 text-[#FFB7A9]" : "border-white/8 text-white/55")}
              aria-label={isSaved ? "Remover local dos salvos" : "Salvar local neste aparelho"}
            >
              <Heart className="size-4" fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[.035] p-3">
              <p className="text-[0.5rem] text-white/35">Fonte</p>
              <p className="mt-1 text-sm font-black">{entity.source}</p>
            </div>
            <div className="rounded-xl bg-white/[.035] p-3">
              <p className="text-[0.5rem] text-white/35">Confiança</p>
              <p className="mt-1 text-sm font-black text-[#C7FF3C]">{entity.confidence}%</p>
            </div>
          </div>
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2">
          <article className="rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4">
            <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Identificação</p>
            <dl className="mt-3 space-y-2 text-xs text-white/55">
              <div className="flex justify-between gap-3"><dt>CNPJ</dt><dd className="font-black text-white">{local.cnpj}</dd></div>
              <div className="flex justify-between gap-3"><dt>Bairro</dt><dd className="text-right font-bold text-white">{entity.neighborhood || "não informado"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Nome jurídico</dt><dd className="text-right font-bold text-white">{local.legalName}</dd></div>
              <div className="flex justify-between gap-3"><dt>Atualização</dt><dd className="text-right font-bold text-white">{entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString("pt-BR") : "não informada"}</dd></div>
            </dl>
          </article>

          <article className="rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4">
            <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Contato e serviços</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entity.services.map(item => (
                <span key={item} className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1.5 text-[0.52rem] font-black text-white/65">{item}</span>
              ))}
              {!entity.services.length && <span className="text-xs text-white/45">Sem serviços complementares consolidados.</span>}
            </div>
            <p className="mt-3 text-xs text-white/55">Telefone: {entity.phone || "não informado"}</p>
            <p className="mt-1 text-xs text-white/55">Horário: {local.mapData?.hours || "não informado"}</p>
          </article>
        </section>

        <section className="mt-3 rounded-[1.35rem] border border-[#C7FF3C]/15 bg-[#121B22] p-4">
          <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Como chegar</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => window.open(googleUrl, "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl bg-[#C7FF3C] text-xs font-black text-[#0B1014]">
              <Navigation className="mr-1 inline size-3.5" /> Google Maps
            </button>
            <button type="button" onClick={() => window.open(wazeUrl, "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-[#3DE3FF]/20 text-xs font-black text-[#C9F7FF]">Waze</button>
            <button type="button" onClick={() => window.open(appleUrl, "_blank", "noopener,noreferrer")} className="min-h-12 rounded-xl border border-white/8 text-xs font-black text-white/70">Apple Maps</button>
          </div>
          <p className="mt-3 text-[0.52rem] text-white/30">
            {entity.coordinates ? entity.coordinates.lat.toFixed(5) + ", " + entity.coordinates.lng.toFixed(5) : "Rota por endereço; coordenada não consolidada."}
          </p>
        </section>

        <section className="mt-3 rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4">
          <p className="text-[0.52rem] font-black uppercase tracking-[.14em] text-white/35">Dados e confiança</p>
          <p className="mt-2 text-xs leading-relaxed text-white/50">{local.sourceNote}</p>
          <p className="mt-2 text-xs text-white/45">Cadastro: {local.dataOrigin === "ANP" ? "ANP" : local.dataOrigin === "cross-check" ? "dados cruzados" : "catálogo local"}.</p>
          <p className="mt-1 text-xs text-white/45">
            Preço individual: {price ? price.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/" + price.unit : "não disponível"}.
          </p>
          {local.mapData && <p className="mt-1 text-xs text-white/45">Referência de mapas observada em {local.mapData.observedAt || "data não informada"}; não substitui cadastro ANP.</p>}
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void share()} className="min-h-12 rounded-xl border border-white/8 text-xs font-black text-white/70">
            <Share2 className="mr-1 inline size-3.5" /> Compartilhar
          </button>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(entity.address); vibration(); } catch {} }} className="min-h-12 rounded-xl border border-white/8 text-xs font-black text-white/70">
            <Copy className="mr-1 inline size-3.5" /> Copiar endereço
          </button>
        </div>

        <a href={stationMapsSearchUrl(local)} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center gap-2 text-[0.58rem] font-black text-white/35">
          <ExternalLink className="size-3.5" /> Abrir referência completa no Google Maps
        </a>
      </div>
    </main>
  );
}
