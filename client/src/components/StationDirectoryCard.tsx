import { ExternalLink, Heart, MapPin, Navigation, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDestinationUrl,
  buildWazeNavigationUrl,
  getPreferredNavigationProvider,
  setPreferredNavigationProvider,
  shareText,
  vibration,
} from "@/lib/mobileTools";
import { appUrl } from "@/lib/appUrl";
import { freshnessLabel } from "@/lib/stationEntity";
import StationIntegrityPanel from "@/components/StationIntegrityPanel";

type Props = {
  index: number;
  local?: LocalStationRecord | null;
  anp?: AnpStation | null;
  saved?: boolean;
  distanceKm?: number | null;
  onToggleSaved?: () => void;
  prices?: AnpPriceRecord[];
  compared?: boolean;
  onToggleCompare?: () => void;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function brandLabel(local?: LocalStationRecord | null, anp?: AnpStation | null) {
  const value = normalize(anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || "");
  if (value.includes("shell")) return "SHELL";
  if (value.includes("ipiranga")) return "IP";
  if (value.includes("petrobras") || value.includes("petrobr")) return "BR";
  if (value.includes("ale")) return "ALE";
  if (value.includes("formula")) return "F1";
  if (value.includes("ponteio")) return "P";
  return "POSTO";
}

function formatDate(value?: string | null) {
  if (!value) return "sem data";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

export function StationDirectoryCard({
  index,
  local,
  anp,
  saved = false,
  distanceKm = null,
  onToggleSaved,
  prices = [],
  compared = false,
  onToggleCompare,
}: Props) {
  const [copied, setCopied] = useState(false);
  const stationName = local?.displayName || anp?.razaoSocial || ("Posto " + (anp?.cnpj || index));
  const cnpj = anp?.cnpj || local?.cnpj || "";
  const address = [
    anp?.endereco || local?.address,
    anp?.complemento,
    anp?.bairro || local?.neighborhood,
    anp?.municipio || "Águas Lindas de Goiás",
    anp?.uf || "GO",
  ].filter(Boolean).join(", ");

  const coords = Number.isFinite(anp?.latitude) && Number.isFinite(anp?.longitude)
    ? { lat: Number(anp?.latitude), lng: Number(anp?.longitude) }
    : Number.isFinite(local?.anp?.latitude) && Number.isFinite(local?.anp?.longitude)
      ? { lat: Number(local?.anp?.latitude), lng: Number(local?.anp?.longitude) }
      : null;

  const price = prices.find(item => item.productKey === "gasolina-comum") ?? prices[0] ?? null;
  const status = local?.mapData?.operationalStatus;
  const fuelLabels = useMemo(() => {
    const seen = new Set<string>();
    for (const item of anp?.products || []) {
      const text = (item.produto || "").toLocaleLowerCase("pt-BR");
      if (text.includes("gasolina") && !text.includes("aditivada")) seen.add("Gasolina");
      else if (text.includes("gasolina")) seen.add("Gasolina aditivada");
      else if (text.includes("etanol")) seen.add("Etanol");
      else if (text.includes("s10")) seen.add("Diesel S10");
      else if (text.includes("s500")) seen.add("Diesel S500");
      else if (text.includes("glp") || text.includes("p13")) seen.add("GLP P13");
      else if (text.includes("gnv")) seen.add("GNV");
    }
    return Array.from(seen).slice(0, 4);
  }, [anp]);

  const destination = coords ? coords.lat + "," + coords.lng : address;
  const googleUrl = buildGoogleMapsDestinationUrl(destination, true);
  const wazeUrl = buildWazeNavigationUrl(address, coords || undefined);
  const appleUrl = buildAppleMapsDirectionsUrl(destination);
  const provider = getPreferredNavigationProvider();
  const preferredUrl = provider === "waze" ? wazeUrl : provider === "apple" ? appleUrl : googleUrl;

  const navigate = () => {
    if (!coords && !address) return;
    window.open(preferredUrl, "_blank", "noopener,noreferrer");
  };

  const share = async () => {
    const shareUrl = typeof window !== "undefined"
      ? window.location.origin + appUrl("/postos") + "?q=postos&busca=" + encodeURIComponent(stationName) + (cnpj ? "#posto-" + encodeURIComponent(cnpj) : "")
      : address;
    try {
      await shareText(
        stationName + " · " + (price ? price.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " · " : "") + address,
        shareUrl,
        "Trajeto · posto",
      );
    } catch {}
  };

  const copyAddress = async () => {
    if (!navigator.clipboard || !address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      vibration();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <article
      id={"posto-" + (cnpj ? encodeURIComponent(cnpj) : "mapa-" + index)}
      className={"overflow-hidden rounded-[1.2rem] border bg-[#121B22] p-3.5 shadow-[0_12px_35px_rgba(0,0,0,.16)] " + (compared ? "border-[#3DE3FF]/45" : "border-white/8")}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.05] text-[0.54rem] font-black text-[#D9FF91]" aria-label={"Marca " + brandLabel(local, anp)}>
          {brandLabel(local, anp)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[1rem] font-black leading-tight text-white">{stationName}</h3>
              <p className="mt-1 text-[0.5rem] font-bold uppercase tracking-[.12em] text-white/60">{anp ? "Cadastro ANP" : "Catálogo local"}</p>
            </div>
            <button
              type="button"
              onClick={onToggleSaved}
              disabled={!onToggleSaved}
              className={"grid size-10 shrink-0 place-items-center rounded-xl border disabled:opacity-25 " + (saved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/10 text-[#FFB7A9]" : "border-white/8 text-white/50")}
              aria-label={saved ? "Remover posto dos salvos" : "Salvar posto"}
            >
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] p-3">
        <p className="text-[0.48rem] font-black uppercase tracking-[.13em] text-[#D9FF91]">{price?.produto || "Preço ANP"}</p>
        <p className="mt-1 text-[1.8rem] font-black tracking-[-.055em] text-white">
          {price ? price.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Indisponível"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.5rem] text-white/60">
          <span>{price ? "coleta " + formatDate(price.collectionDate) : "nesta coleta não há preço individual"}</span>
          {price && <span>· {freshnessLabel(price.collectionDate)}</span>}
          {price && <span>· ANP</span>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.56rem]">
        <span className="font-black text-white/75">{distanceKm == null ? "distância indisponível" : distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"}</span>
        {coords && <span className="text-white/60">coordenada disponível</span>}
        {status === "open" && <span className="text-white/60">horário: referência externa</span>}
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.02] p-3">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />
        <p className="min-w-0 flex-1 text-[0.58rem] leading-relaxed text-white/55">{address || "Endereço não consolidado"}</p>
        <button type="button" onClick={() => void copyAddress()} className="shrink-0 text-[0.48rem] font-black text-white/60">{copied ? "Copiado" : "Copiar"}</button>
      </div>

      {fuelLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fuelLabels.map(label => <span key={label} className="rounded-full border border-white/8 px-2 py-1 text-[0.43rem] font-bold text-white/60">{label}</span>)}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={navigate} className="col-span-2 min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]">
          <Navigation className="mr-1 inline size-3.5" /> Ir agora
        </button>
        <button type="button" onClick={() => void share()} className="min-h-11 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/65"><Share2 className="mr-1 inline size-3.5" /> Compartilhar</button>
        {onToggleCompare ? (
          <button type="button" onClick={onToggleCompare} className={"min-h-11 rounded-xl border text-[0.55rem] font-black " + (compared ? "border-[#3DE3FF]/35 bg-[#3DE3FF]/10 text-[#C9F7FF]" : "border-white/8 text-white/55")}>
            {compared ? "Na comparação" : "Comparar"}
          </button>
        ) : (
          <a href={appUrl("/planejar") + "?destino=" + encodeURIComponent(address)} className="flex min-h-11 items-center justify-center rounded-xl border border-white/8 text-[0.55rem] font-black text-white/55">
            Planejar
          </a>
        )}
      </div>

      <details className="mt-2 rounded-xl border border-white/8 bg-white/[.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[0.54rem] font-black text-white/60">
          <span>Dados completos e fontes</span>
          <span className="text-[0.45rem] text-white/60">técnico</span>
        </summary>
        <div className="space-y-2 border-t border-white/8 p-3">
          <StationIntegrityPanel anp={anp} local={local} price={price} />
          {cnpj && <p className="text-[0.52rem] text-white/60">CNPJ: <span className="font-black text-white/55">{cnpj}</span></p>}
          {anp?.dataObtencao && <p className="text-[0.52rem] text-white/60">Cadastro ANP: <span className="text-white/55">{formatDate(anp.dataObtencao)}</span></p>}
          {price?.collectionDate && <p className="text-[0.52rem] text-white/60">Preço individual: <span className="text-white/55">{formatDate(price.collectionDate)} · ANP</span></p>}
          {status && <p className="text-[0.52rem] text-white/60">Status externo: <span className="text-white/55">{status === "open" ? "aberto" : status === "closed" ? "fechado" : "não confirmado"} · {formatDate(local?.mapData?.observedAt)}</span></p>}
          {coords && <p className="text-[0.52rem] text-white/60">Coordenadas: <span className="text-white/55">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span></p>}
          <div className="flex flex-wrap gap-2">
            <a href={"https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web"} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/8 px-2.5 text-[0.48rem] font-black text-white/55">ANP <ExternalLink className="size-3" /></a>
            {onToggleCompare && (
              <button type="button" onClick={() => { onToggleCompare(); }} className="min-h-9 rounded-lg border border-white/8 px-2.5 text-[0.48rem] font-black text-white/55">{compared ? "Remover comparação" : "Adicionar à comparação"}</button>
            )}
          </div>
          <details className="rounded-xl border border-white/8">
            <summary className="cursor-pointer px-3 py-2 text-[0.5rem] font-black text-white/60">Escolher provedor de navegação</summary>
            <div className="grid grid-cols-3 gap-2 border-t border-white/8 p-2">
              <button type="button" onClick={() => { setPreferredNavigationProvider("google"); window.open(googleUrl, "_blank", "noopener,noreferrer"); }} className="min-h-10 rounded-lg border border-white/8 text-[0.5rem] font-black text-white/60">Google</button>
              <button type="button" onClick={() => { setPreferredNavigationProvider("waze"); window.open(wazeUrl, "_blank", "noopener,noreferrer"); }} className="min-h-10 rounded-lg border border-white/8 text-[0.5rem] font-black text-white/60">Waze</button>
              <button type="button" onClick={() => { setPreferredNavigationProvider("apple"); window.open(appleUrl, "_blank", "noopener,noreferrer"); }} className="min-h-10 rounded-lg border border-white/8 text-[0.5rem] font-black text-white/60">Apple</button>
            </div>
          </details>
        </div>
      </details>
    </article>
  );
}

export { StationDirectoryCard as default };
