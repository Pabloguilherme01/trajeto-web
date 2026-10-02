import { useMemo, useState } from "react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Fuel, Heart, MapPin, Navigation, Phone, Share2 } from "lucide-react";
import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildWazeNavigationUrl, getPreferredNavigationProvider, setPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import { stationDataConfidence, freshnessLabel } from "@/lib/stationEntity";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function brandConfig(local?: LocalStationRecord | null, anp?: AnpStation | null) {
  const key = normalize(anp?.distribuidora || local?.brand || "");
  if (key.includes("shell")) return { label: "SHELL", className: "bg-[#FFD43B] text-[#8B1E24] border-[#8B1E24]/15" };
  if (key.includes("ipiranga")) return { label: "IP", className: "bg-[#F4A623] text-[#153B80] border-[#153B80]/15" };
  if (key.includes("petrobras") || key.includes("petrobr")) return { label: "BR", className: "bg-[#1A8B4D] text-white border-white/10" };
  if (key === "br" || key.includes("posto br")) return { label: "BR", className: "bg-[#163F8C] text-white border-white/10" };
  if (key.includes("ale")) return { label: "ALE", className: "bg-[#6F43B7] text-white border-white/10" };
  if (key.includes("zm")) return { label: "ZM", className: "bg-[#3DE3FF] text-[#12353F] border-[#12353F]/10" };
  if (key.includes("formula")) return { label: "F1", className: "bg-[#F24822] text-white border-white/10" };
  if (key.includes("ponteio")) return { label: "P", className: "bg-[#C7FF3C] text-[#163840] border-[#163840]/10" };
  if (key.includes("premium")) return { label: "PREM", className: "bg-[#D8DDE3] text-[#2E3740] border-black/10" };
  if (local?.mapData?.observedBrand) return { label: "MAPA", className: "bg-[#3DE3FF]/10 text-[#9FEFFF] border-[#3DE3FF]/15" };
  return { label: "POSTO", className: "bg-[#C7FF3C]/10 text-[#D9FF91] border-[#C7FF3C]/15" };
}

function BrandMark({ local, anp }: { local?: LocalStationRecord | null; anp?: AnpStation | null }) {
  const config = brandConfig(local, anp);
  return (
    <div aria-label={"Marca " + config.label} title={config.label} className={"grid size-12 shrink-0 place-items-center rounded-2xl border text-xs font-black " + config.className}>
      {config.label}
    </div>
  );
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatDate(value?: string | null) {
  if (!value) return "não informado";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("pt-BR") : value;
}

export function StationDirectoryCard({
  index,
  local,
  anp,
  saved,
  distanceKm = null,
  onToggleSaved,
  prices = [],
  catalogStatus = "unreconciled",
}: {
  index: number;
  local?: LocalStationRecord | null;
  anp?: AnpStation | null;
  saved?: boolean;
  distanceKm?: number | null;
  onToggleSaved?: () => void;
  prices?: AnpPriceRecord[];
  catalogStatus?: string;
}) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const stationName = local?.displayName || anp?.razaoSocial || ("Posto " + (anp?.cnpj || index));
  const legalName = anp?.razaoSocial || local?.legalName || "não informada";
  const cnpj = anp?.cnpj || local?.cnpj || "";
  const address = [
    anp?.endereco,
    anp?.complemento,
    anp?.bairro,
    anp?.municipio,
    anp?.uf,
  ].filter(Boolean).join(", ") || [
    local?.address,
    local?.neighborhood,
    "Águas Lindas de Goiás",
    "GO",
  ].filter(Boolean).join(", ");
  const coords = Number.isFinite(anp?.latitude) && Number.isFinite(anp?.longitude)
    ? { lat: Number(anp?.latitude), lng: Number(anp?.longitude) }
    : Number.isFinite(local?.anp?.latitude) && Number.isFinite(local?.anp?.longitude)
      ? { lat: Number(local?.anp?.latitude), lng: Number(local?.anp?.longitude) }
      : null;
  const distributor = anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || "Bandeira não consolidada";
  const primaryPrice = prices.find(item => item.productKey === "gasolina-comum") ?? prices[0] ?? null;
  const confidence = stationDataConfidence({ anp, local, price: primaryPrice });
  const priceDate = primaryPrice?.collectionDate ? new Date(primaryPrice.collectionDate).toLocaleDateString("pt-BR") : null;
  const products = useMemo(() => {
    const unique = new Map<string, AnpStation["products"][number]>();
    (anp?.products || []).forEach(item => {
      const key = [item.produto, item.classe, item.tancagem, item.quantidadeBicos].join("|");
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }, [anp]);

  const fallbackDestination = [stationName, local?.neighborhood || anp?.bairro, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(", ");
  const destination = coords ? coords.lat + "," + coords.lng : (address || fallbackDestination);
  const googleUrl = buildGoogleMapsDestinationUrl(destination, true);
  const wazeUrl = buildWazeNavigationUrl(address, coords || undefined);
  const appleUrl = buildAppleMapsDirectionsUrl(destination);
  const preferredProvider = getPreferredNavigationProvider();
  const preferredUrl = preferredProvider === "waze" ? wazeUrl : preferredProvider === "apple" ? appleUrl : googleUrl;
  const anpUrl = "https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web";
  const anpComVcUrl = "https://anpcomvcpostos.anp.gov.br/";
  const shareUrl = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname + "?q=" + encodeURIComponent(stationName) + (cnpj ? "#posto-" + encodeURIComponent(cnpj) : "")
    : address;
  const phone = local?.mapData?.phone;
  const phoneDigits = (phone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits && !phoneDigits.startsWith("0800") && (phoneDigits.length === 10 || phoneDigits.length === 11)
    ? "https://wa.me/55" + phoneDigits
    : null;
  const socialQuery = encodeURIComponent([stationName, address, "Águas Lindas de Goiás"].filter(Boolean).join(" "));
  const instagramSearchUrl = "https://www.google.com/search?q=" + encodeURIComponent("site:instagram.com " + decodeURIComponent(socialQuery));
  const facebookSearchUrl = "https://www.google.com/search?q=" + encodeURIComponent("site:facebook.com " + decodeURIComponent(socialQuery));
  const webSearchUrl = "https://www.google.com/search?q=" + socialQuery;
  const status = local?.mapData?.operationalStatus;
  const statusLabel = status === "open" ? "Aberto em referência de mapa" : status === "closed" ? "Fechado em referência de mapa" : "Funcionamento não confirmado";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      vibration();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Não foi possível copiar neste navegador.");
    }
  };

  const share = async () => {
    try {
      await shareText(stationName + " · " + address + (cnpj ? " · CNPJ " + formatCnpj(cnpj) : ""), shareUrl, "Trajeto · posto");
    } catch {
      toast.error("Não foi possível compartilhar agora.");
    }
  };

  const openExternal = (url: string, label: string) => {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) toast.message(`O navegador bloqueou a abertura de ${label}. Permita pop-ups para continuar.`);
  };

  return (
    <motion.article
      id={"posto-" + (cnpj ? encodeURIComponent(cnpj) : "mapa-" + index)}
      tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={reduceMotion ? undefined : { duration: 0.42, delay: Math.min((index - 1) * 0.025, 0.18), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      whileTap={reduceMotion ? undefined : { scale: 0.997 }}
      className="trajeto-card trajeto-card-interactive group relative min-w-0 max-w-full scroll-mt-24 overflow-hidden rounded-[1.45rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,35,43,.96),rgba(11,16,20,.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,.20)] transition-shadow duration-300 hover:border-[#3DE3FF]/20 hover:shadow-[0_26px_75px_rgba(0,0,0,.28)] [content-visibility:auto] [contain-intrinsic-size:520px]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full bg-[#3DE3FF]/[.06] blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start gap-3">
        <BrandMark local={local} anp={anp} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.14em] text-[#3DE3FF]">Posto {String(index).padStart(2, "0")}</p>
              <h3 className="mt-1 text-base font-black leading-tight text-white">{stationName}</h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-white/65 [overflow-wrap:anywhere]">{legalName}</p>
            </div>
            <button type="button" onClick={onToggleSaved} disabled={!onToggleSaved} className={"grid size-11 shrink-0 place-items-center rounded-xl border disabled:opacity-25 " + (saved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/10 text-[#FFB7A9]" : "border-white/8 text-white/65")} aria-label={saved ? "Remover posto dos salvos" : onToggleSaved ? "Salvar posto neste aparelho" : "Salvar indisponível sem coordenada"}>
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-xs font-black text-[#D9FF91]">{catalogStatus}</span>
            {anp ? <span className="rounded-full border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-2 py-1 text-xs font-black text-[#9FEFFF]">ANP</span> : <span className="rounded-full border border-white/8 px-2 py-1 text-xs font-black text-white/65">sem cruzamento ANP</span>}
            <span className="rounded-full border border-white/8 px-2 py-1 text-xs font-black text-white/65">{distributor}</span>
            {anp?.products?.length ? <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-xs font-black text-[#D9FF91]">ANP enriquecida</span> : null}
            {coords && <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-xs font-black text-[#D9FF91]">coordenada</span>}
            {Number.isFinite(distanceKm) && <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-xs font-black text-white/65">{Number(distanceKm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}
            {status && <span className={"rounded-full border px-2 py-1 text-xs font-black " + (status === "closed" ? "border-[#FFB86B]/25 text-[#FFCF96]" : "border-[#C7FF3C]/15 text-[#D9FF91]")}>{statusLabel}</span>}
          </div>
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-3" aria-label="Confiança e atualização dos dados">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.13em] text-white/65">Confiança dos dados</p>
            <p className="mt-1 text-xs font-black text-white">{confidence >= 90 ? "Alta" : confidence >= 70 ? "Boa" : confidence >= 50 ? "Parcial" : "Baixa"}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-[#C7FF3C]">{confidence}%</p>
            <p className="text-xs font-bold text-white/65">qualidade/frescor</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-[#C7FF3C] transition-all duration-500" style={{ width: confidence + "%" }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/65">
          <span>Cadastro: {anp ? "ANP" : "catálogo local"}</span>
          <span>Preço: {primaryPrice ? "ANP" : "não disponível"}</span>
          <span>Localização: {coords ? "coordenada" : "não confirmada"}</span>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] p-3" aria-label="Preço ANP">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.13em] text-[#D9FF91]">Preço pesquisado pela ANP</p>
            {primaryPrice ? (
              <p className="mt-1 text-2xl font-black tracking-[-.04em] text-white">{primaryPrice.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<span className="ml-1 text-xs font-bold text-white/65">/{primaryPrice.unit}</span></p>
            ) : (
              <p className="mt-1 text-sm font-black text-white/70">Sem preço ANP nesta amostra</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-white/65">{primaryPrice ? primaryPrice.produto : "gasolina comum"}</p>
            <p className="mt-1 text-xs font-bold text-white/65">{priceDate ? "coleta " + priceDate : "sem coleta individual"}</p>
          </div>
        </div>
        {prices.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5">{prices.slice(0, 5).map(price => <span key={price.productKey + price.salePrice} className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-xs font-black text-white/65">{price.produto}: {price.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/{price.unit}</span>)}</div>}
        <p className="mt-2 text-xs leading-relaxed text-white/65">Fonte ANP · {primaryPrice ? freshnessLabel(primaryPrice.collectionDate) : "sem preço individual disponível"}. Não representa preço em tempo real.</p>
      </section>

      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />
          <p className="break-words text-sm leading-relaxed text-white/65 [overflow-wrap:anywhere]">{address || "Endereço não consolidado"}</p>
        </div>
        <div className="mt-2 grid gap-2 text-xs text-white/65 sm:grid-cols-2">
          <span>CNPJ: {cnpj ? formatCnpj(cnpj) : "não informado"}</span>
          <span>Bairro: {anp?.bairro || local?.neighborhood || "não informado"}</span>
          <span>CEP: {anp?.cep || "não informado"}</span>
          <span>Telefone: {phone || "não informado"}</span>
          <span>Horário: {local?.mapData?.hours || "não informado"}</span>
          <span>Avaliação: {local?.mapData?.rating != null ? local.mapData.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " · " + (local.mapData.reviewCount ?? 0).toLocaleString("pt-BR") + " avaliações" : "não informado"}</span>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
        {local && <Link href={appUrl("/local/" + encodeURIComponent(local.id))} className="col-span-2 sm:col-span-3 min-h-11 flex items-center justify-center rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] text-xs font-black text-[#C9F7FF]">Abrir ficha completa</Link>}
        <button type="button" onClick={() => openExternal(preferredUrl, "navegação")} className="min-h-12 min-w-0 min-[360px]:col-span-2 rounded-2xl bg-[#C7FF3C] px-3 text-sm font-black text-[#0B1014] shadow-[0_8px_28px_rgba(199,255,60,.10)] transition-transform duration-200 active:scale-[.98] sm:col-span-1"><Navigation className="mr-1 inline size-3.5" />Ir agora · {preferredProvider === "waze" ? "Waze" : preferredProvider === "apple" ? "Apple Maps" : "Google Maps"}</button>
        <button type="button" onClick={() => { setPreferredNavigationProvider("google"); openExternal(googleUrl, "Google Maps"); }} className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-xs font-black text-white/75 transition-transform duration-200 active:scale-[.98]">Google Maps</button>
        <button type="button" onClick={() => { setPreferredNavigationProvider("waze"); openExternal(wazeUrl, "Waze"); }} className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-2 text-xs font-black text-[#C9F7FF] transition-transform duration-200 active:scale-[.98]">Waze</button>
        <button type="button" onClick={() => { setPreferredNavigationProvider("apple"); openExternal(appleUrl, "Apple Maps"); }} className="min-h-11 rounded-xl border border-white/10 bg-white/[.04] px-2 text-xs font-black text-white/75 transition-transform duration-200 active:scale-[.98]">Apple Maps</button>
      </div>

      <Link href={appUrl("/planejar") + "?destino=" + encodeURIComponent(destination) + "&auto=1"} className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-sm font-bold text-white/80">Planejar viagem e comparar transporte</Link>

      <div className="mt-3 rounded-2xl border border-white/8 bg-[#0B1014] p-3" aria-label="Contato e redes sociais">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[.12em] text-white/65">Contato e redes</p>
          <span className="text-xs font-bold text-white/65">sem login</span>
        </div>
        <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
          <button type="button" onClick={() => window.open(instagramSearchUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center rounded-xl border border-[#E1306C]/20 bg-[#E1306C]/[.05] text-xs font-black text-white/70">Instagram</button>
          <button type="button" onClick={() => window.open(facebookSearchUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center rounded-xl border border-[#1877F2]/20 bg-[#1877F2]/[.05] text-xs font-black text-white/70">Facebook</button>
          {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-[#25D366]/20 bg-[#25D366]/[.05] text-xs font-black text-white/70">WhatsApp</a> : <button type="button" onClick={() => window.open(webSearchUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center rounded-xl border border-white/8 text-xs font-black text-white/65">Buscar contato</button>}
          <button type="button" onClick={() => window.open(webSearchUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center rounded-xl border border-white/8 text-xs font-black text-white/65">Mais na web</button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/65">Instagram e Facebook usam busca pública pelo nome/endereço para evitar links inventados. WhatsApp aparece quando existe telefone público compatível.</p>
        <div className="mt-2 grid gap-2 rounded-xl border border-white/8 bg-white/[.02] p-2.5">
          <p className="text-xs font-black uppercase tracking-[.12em] text-white/65">Fontes oficiais complementares</p>
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/acoes-de-fiscalizacao", "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 text-xs font-black text-white/65">Fiscalização ANP</button>
            <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/pmqc-programa-de-monitoramento-da-qualidade-dos-combustiveis", "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 text-xs font-black text-white/65">PMQC</button>
            <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/multas-aplicadas-com-vencimento-a-partir-de-2016", "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 text-xs font-black text-white/65">Multas ANP</button>
            <button type="button" onClick={() => window.open("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos", "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 text-xs font-black text-white/65">Base cadastral</button>
          </div>
        </div><div className="mt-2 grid gap-2 text-xs text-white/65 sm:grid-cols-2">{local?.mapData?.email && <a href={"mailto:" + local.mapData.email} className="truncate underline decoration-white/10 underline-offset-2">{local.mapData.email}</a>}{local?.mapData?.website && <a href={local.mapData.website} target="_blank" rel="noopener noreferrer" className="truncate underline decoration-white/10 underline-offset-2">Site oficial</a>}</div>
      </div>

      <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
        {phone && <a href={"tel:" + phone.replace(/[^+\d]/g, "")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/8 text-xs font-black text-white/65"><Phone className="size-3.5" />Ligar</a>}
        <button type="button" onClick={() => void copy(cnpj || address)} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/8 text-xs font-black text-white/65">{copied ? <Check className="size-3.5 text-[#C7FF3C]" /> : <Copy className="size-3.5" />}{copied ? "Copiado" : cnpj ? "Copiar CNPJ" : "Copiar endereço"}</button>
        <button type="button" onClick={() => void share()} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/8 text-xs font-black text-white/65"><Share2 className="size-3.5" />Compartilhar</button>
        <button type="button" onClick={() => window.open(anpComVcUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-xs font-black text-[#D9FF91]"><ExternalLink className="size-3.5" />ANP com VC</button>
        <button type="button" onClick={() => window.open(anpUrl, "_blank", "noopener,noreferrer")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#3DE3FF]/15 text-xs font-black text-[#9FEFFF]"><ExternalLink className="size-3.5" />Consulta ANP</button>
      </div>
      <div className="mt-2 rounded-xl border border-[#3DE3FF]/12 bg-[#3DE3FF]/[.025] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[.12em] text-[#87DFF0]">ANP com VC · consulta complementar</p>
          <span className="text-xs font-bold text-white/65">oficial</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/38">A ANP informa que esta aplicação complementar mostra histórico de fiscalização dos últimos cinco anos, análises do PMQC, origem do combustível e classificação do posto. O acesso direto ao relatório individual depende da interface da própria ANP.</p>
        <button type="button" onClick={async () => { if (cnpj) { try { await navigator.clipboard.writeText(cnpj); } catch {} } window.open("https://anpcomvcpostos.anp.gov.br/", "_blank", "noopener,noreferrer"); }} className="mt-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-3 text-xs font-black text-[#C9F7FF]"><ExternalLink className="size-3.5" />Abrir ANP com VC · CNPJ copiado</button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/65">A navegação é aberta no app/site escolhido. O Trajeto não exige conta.</p>

      <details className="mt-3 rounded-2xl border border-white/8 bg-white/[.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-black text-white/65">
          <span>Todos os dados disponíveis</span>
          <Fuel className="size-4 text-white/65" />
        </summary>
        <div className="space-y-2 border-t border-white/8 px-3 py-3 text-xs leading-relaxed text-white/65">
          <p><strong className="text-white/65">Identidade:</strong> {local?.aliases?.join(" · ") || "sem aliases consolidados"} · CNPJ {cnpj ? formatCnpj(cnpj) : "—"}</p>
          <p><strong className="text-white/65">ANP · identificação:</strong> código SIMP {anp?.codigoSimp || "—"} · autorização {anp?.autorizacao || "—"} · CNPJ {cnpj ? formatCnpj(cnpj) : "—"}</p>
          <p><strong className="text-white/65">ANP · datas:</strong> publicação {formatDate(anp?.dataPublicacao)} · vinculação {formatDate(anp?.dataVinculacao)} · obtenção dos dados {formatDate(anp?.dataObtencao)}</p>
          <p><strong className="text-white/65">ANP · distribuição:</strong> {anp?.distribuidora || "não informada"} · situação constatada {anp?.situacaoConstatada || "não informada"} · SIGAF {anp?.statusSigaf || "não informado"}</p>
          <p><strong className="text-white/65">Produtos ANP:</strong> {products.length ? products.map(item => [item.produto || "produto não informado", item.classe || null, item.tancagem != null ? "tancagem " + item.tancagem.toLocaleString("pt-BR") + " " + (item.unidadeMedidaTancagem || "") : null, item.quantidadeBicos != null ? "bicos " + item.quantidadeBicos : null].filter(Boolean).join(" · ")).join(" | ") : "nenhum registro de produto disponível no snapshot atual"}</p>
          <p><strong className="text-white/65">ANP · localização:</strong> {anp?.endereco || local?.address || "—"} · complemento {anp?.complemento || "—"} · bairro {anp?.bairro || local?.neighborhood || "—"} · CEP {anp?.cep || "—"} · município/UF {anp?.municipio || "—"}/{anp?.uf || "—"}</p>
          <p><strong className="text-white/65">ANP · georreferenciamento:</strong> {anp?.latitude != null && anp?.longitude != null ? anp.latitude + ", " + anp.longitude : "coordenada principal não informada"} · ANP 4C {anp?.latitudeAnp4c != null && anp?.longitudeAnp4c != null ? anp.latitudeAnp4c + ", " + anp.longitudeAnp4c : "não informado"} · validação {anp?.validacao || "não informada"} · acurácia estimada {anp?.estimativaAcuraciaM != null ? anp.estimativaAcuraciaM + " m" : "não informada"} · SRID {anp?.srid || "não informado"} · sistema {anp?.sistemaReferenciaCoordenadas || "não informado"}</p>
          <p><strong className="text-white/65">ANP · origem:</strong> {anp?.origemInformacao || "não informada"}{anp?.observacao ? " · observação: " + anp.observacao : ""}</p>
          <p><strong className="text-white/65">Município/UF:</strong> {anp?.municipio || "Águas Lindas de Goiás"} / {anp?.uf || "GO"}</p>
          <p><strong className="text-white/65">Situação ANP/SIGAF:</strong> {anp?.situacaoConstatada || "não informada"} · {anp?.statusSigaf || "sem ocorrência informada"}</p>
          <p><strong className="text-white/65">Origem cadastral API:</strong> {anp?.src || "não informada"}</p>
          <p><strong className="text-white/65">PMQC retornado pela API:</strong> {anp?.inadimplenciaPMQC?.length ? JSON.stringify(anp.inadimplenciaPMQC) : "nenhum registro adicional retornado"}</p>
          <p><strong className="text-white/65">Origem:</strong> {anp?.origemInformacao || "não informada"} · obtido em {formatDate(anp?.dataObtencao)}</p>
          <p><strong className="text-white/65">Geografia:</strong> {coords ? coords.lat.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) + ", " + coords.lng.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) : "sem coordenadas consolidadas"} · validação {anp?.validacao || "—"} · acurácia {anp?.estimativaAcuraciaM != null ? anp.estimativaAcuraciaM.toLocaleString("pt-BR") + " m" : "—"} · SRID {anp?.srid || "—"}</p>
          <div className="rounded-xl border border-white/8 bg-black/10 p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-xs text-[#87DFF0]">Produtos / tancagem / bicos</p>
            {products.length ? products.map((item, productIndex) => (
              <p key={productIndex} className="mt-1">{item.produto || "produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem || ""} · bicos {item.quantidadeBicos ?? "—"} · classe {item.classe || "—"}</p>
            )) : <p className="mt-1">Nenhum produto ANP materializado nesta consulta.</p>}
          </div>
          <div className="rounded-xl border border-[#C7FF3C]/10 bg-[#C7FF3C]/[.025] p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-xs text-[#D9FF91]">Referência secundária de mapas</p>
            <p className="mt-1">Telefone {phone || "—"} · nota {local?.mapData?.rating ?? "—"} · avaliações {local?.mapData?.reviewCount ?? "—"} · horário {local?.mapData?.hours || "—"} · bandeira observada {local?.mapData?.observedBrand || "—"}</p>
            <p className="mt-1">Status observado: {statusLabel} · coletado em {formatDate(local?.mapData?.observedAt)}</p>
          </div>
          <p><strong className="text-white/65">Qualidade:</strong> {local?.dataQuality || (anp ? "ANP" : "catálogo")} · {local?.sourceNote || "Cadastro consolidado de fontes públicas."}</p>
          {anp?.observacao && <p><strong className="text-white/65">Observação ANP:</strong> {anp.observacao}</p>}
          {coords && <p className="text-white/65">A rota é calculada pelo provedor escolhido; o Trajeto não inventa distância ou duração quando não há um motor de roteamento configurado.</p>}
        </div>
      </details>
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-3 text-xs text-white/65">
        <span>{coords ? "Rota por coordenada disponível" : "Rota por endereço"}</span>
        <span>Sem conta · uso direto</span>
      </div>
    </motion.article>
  );
}
