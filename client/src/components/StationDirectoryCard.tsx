import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, ExternalLink, Fuel, Heart, MapPin, Navigation, Phone, Share2 } from "lucide-react";
import type { AnpStation } from "@shared/anpRevendedores";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildWazeNavigationUrl, shareText, vibration } from "@/lib/mobileTools";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function brandConfig(local?: LocalStationRecord | null, anp?: AnpStation | null) {
  const key = normalize(anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || local?.displayName || anp?.razaoSocial || "");
  if (key.includes("shell")) return { label: "SHELL", className: "bg-[#FFD43B] text-[#8B1E24] border-[#8B1E24]/15" };
  if (key.includes("ipiranga")) return { label: "IP", className: "bg-[#F4A623] text-[#153B80] border-[#153B80]/15" };
  if (key.includes("petrobras") || key.includes("petrobr")) return { label: "BR", className: "bg-[#1A8B4D] text-white border-white/10" };
  if (key === "br" || key.includes("posto br")) return { label: "BR", className: "bg-[#163F8C] text-white border-white/10" };
  if (key.includes("ale")) return { label: "ALE", className: "bg-[#6F43B7] text-white border-white/10" };
  if (key.includes("zm")) return { label: "ZM", className: "bg-[#3DE3FF] text-[#12353F] border-[#12353F]/10" };
  if (key.includes("formula")) return { label: "F1", className: "bg-[#F24822] text-white border-white/10" };
  if (key.includes("ponteio")) return { label: "P", className: "bg-[#C7FF3C] text-[#163840] border-[#163840]/10" };
  if (key.includes("premium")) return { label: "PREM", className: "bg-[#D8DDE3] text-[#2E3740] border-black/10" };
  const name = (local?.displayName || anp?.razaoSocial || "POSTO").replace(/[^A-Za-z0-9À-ÿ ]/g, "").trim();
  return { label: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").slice(0, 3).toUpperCase() || "POSTO", className: "bg-[#C7FF3C]/10 text-[#D9FF91] border-[#C7FF3C]/15" };
}

function BrandMark({ local, anp }: { local?: LocalStationRecord | null; anp?: AnpStation | null }) {
  const config = brandConfig(local, anp);
  return (
    <div aria-label={"Marca " + config.label} title={config.label} className={"grid size-12 shrink-0 place-items-center rounded-2xl border text-[0.56rem] font-black " + config.className}>
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
}: {
  index: number;
  local?: LocalStationRecord | null;
  anp?: AnpStation | null;
  saved?: boolean;
  distanceKm?: number | null;
  onToggleSaved?: () => void;
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
  const products = useMemo(() => {
    const unique = new Map<string, AnpStation["products"][number]>();
    (anp?.products || []).forEach(item => {
      const key = [item.produto, item.classe, item.tancagem, item.quantidadeBicos].join("|");
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()];
  }, [anp]);

  const destination = coords ? coords.lat + "," + coords.lng : address;
  const googleUrl = buildGoogleMapsDestinationUrl(destination, true);
  const wazeUrl = buildWazeNavigationUrl(address, coords || undefined);
  const appleUrl = buildAppleMapsDirectionsUrl(destination);
  const anpUrl = "https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web";
  const shareUrl = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname + "?q=" + encodeURIComponent(stationName)
    : address;
  const phone = local?.mapData?.phone;
  const status = local?.mapData?.operationalStatus;
  const statusLabel = status === "open" ? "Aberto em referência de mapa" : status === "closed" ? "Fechado em referência de mapa" : "Funcionamento não confirmado";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      vibration();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const share = async () => {
    try {
      await shareText(stationName + " · " + address + (cnpj ? " · CNPJ " + formatCnpj(cnpj) : ""), shareUrl, "Trajeto · posto");
    } catch {}
  };

  return (
    <motion.article
      id={"posto-" + (cnpj || "mapa-" + index)}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={reduceMotion ? undefined : { duration: 0.42, delay: Math.min((index - 1) * 0.025, 0.18), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      whileTap={reduceMotion ? undefined : { scale: 0.997 }}
      className="group relative scroll-mt-24 overflow-hidden rounded-[1.45rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,35,43,.96),rgba(11,16,20,.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,.20)] transition-shadow duration-300 hover:border-[#3DE3FF]/20 hover:shadow-[0_26px_75px_rgba(0,0,0,.28)]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full bg-[#3DE3FF]/[.06] blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start gap-3">
        <BrandMark local={local} anp={anp} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Posto {String(index).padStart(2, "0")}</p>
              <h3 className="mt-1 text-base font-black leading-tight text-white">{stationName}</h3>
              <p className="mt-1 text-[0.56rem] leading-relaxed text-white/35">{legalName}</p>
            </div>
            <button type="button" onClick={onToggleSaved} disabled={!onToggleSaved} className={"grid size-10 shrink-0 place-items-center rounded-xl border disabled:opacity-25 " + (saved ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/10 text-[#FFB7A9]" : "border-white/8 text-white/45")} aria-label={saved ? "Remover posto dos salvos" : onToggleSaved ? "Salvar posto neste aparelho" : "Salvar indisponível sem coordenada"}>
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {anp ? <span className="rounded-full border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-2 py-1 text-[0.45rem] font-black text-[#9FEFFF]">ANP</span> : <span className="rounded-full border border-white/8 px-2 py-1 text-[0.45rem] font-black text-white/35">sem cruzamento ANP</span>}
            <span className="rounded-full border border-white/8 px-2 py-1 text-[0.45rem] font-black text-white/45">{distributor}</span>
            {coords && <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-[0.45rem] font-black text-[#D9FF91]">coordenada</span>}
            {Number.isFinite(distanceKm) && <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.45rem] font-black text-white/65">{Number(distanceKm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}
            {status && <span className={"rounded-full border px-2 py-1 text-[0.45rem] font-black " + (status === "closed" ? "border-[#FFB86B]/25 text-[#FFCF96]" : "border-[#C7FF3C]/15 text-[#D9FF91]")}>{statusLabel}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />
          <p className="text-[0.62rem] leading-relaxed text-white/55">{address || "Endereço não consolidado"}</p>
        </div>
        <div className="mt-2 grid gap-2 text-[0.54rem] text-white/35 sm:grid-cols-2">
          <span>CNPJ: {cnpj ? formatCnpj(cnpj) : "não informado"}</span>
          <span>Bairro: {anp?.bairro || local?.neighborhood || "não informado"}</span>
          <span>CEP: {anp?.cep || "não informado"}</span>
          <span>Telefone: {phone || "não informado"}</span>
          <span>Horário: {local?.mapData?.hours || "não informado"}</span>
          <span>Avaliação: {local?.mapData?.rating != null ? local.mapData.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " · " + (local.mapData.reviewCount ?? 0).toLocaleString("pt-BR") + " avaliações" : "não informado"}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => window.open(googleUrl, "_blank", "noopener,noreferrer")} className="col-span-3 min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014] shadow-[0_8px_28px_rgba(199,255,60,.10)] transition-transform duration-200 active:scale-[.98] sm:col-span-1"><Navigation className="mr-1 inline size-3.5" />Ir agora</button>
        <button type="button" onClick={() => window.open(googleUrl, "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] px-2 text-[0.56rem] font-black text-white/75 transition-transform duration-200 active:scale-[.98]">Google Maps</button>
        <button type="button" onClick={() => window.open(wazeUrl, "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-2 text-[0.56rem] font-black text-[#C9F7FF] transition-transform duration-200 active:scale-[.98]">Waze</button>
        <button type="button" onClick={() => window.open(appleUrl, "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl border border-white/10 bg-white/[.04] px-2 text-[0.56rem] font-black text-white/75 transition-transform duration-200 active:scale-[.98]">Apple Maps</button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {phone && <a href={"tel:" + phone.replace(/[^+\d]/g, "")} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/55"><Phone className="size-3.5" />Ligar</a>}
        <button type="button" onClick={() => void copy(cnpj || address)} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/55">{copied ? <Check className="size-3.5 text-[#C7FF3C]" /> : <Copy className="size-3.5" />}{copied ? "Copiado" : cnpj ? "Copiar CNPJ" : "Copiar endereço"}</button>
        <button type="button" onClick={() => void share()} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/55"><Share2 className="size-3.5" />Compartilhar</button>
        <button type="button" onClick={() => window.open(anpUrl, "_blank", "noopener,noreferrer")} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#3DE3FF]/15 text-[0.55rem] font-black text-[#9FEFFF]"><ExternalLink className="size-3.5" />Consulta ANP</button>
      </div>
      <p className="mt-2 text-[0.48rem] leading-relaxed text-white/25">A navegação é aberta no app/site escolhido. O Trajeto não exige conta.</p>

      <details className="mt-3 rounded-2xl border border-white/8 bg-white/[.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[0.58rem] font-black text-white/55">
          <span>Todos os dados disponíveis</span>
          <Fuel className="size-4 text-white/25" />
        </summary>
        <div className="space-y-2 border-t border-white/8 px-3 py-3 text-[0.54rem] leading-relaxed text-white/45">
          <p><strong className="text-white/65">Identidade:</strong> {local?.aliases?.join(" · ") || "sem aliases consolidados"} · CNPJ {cnpj ? formatCnpj(cnpj) : "—"}</p>
          <p><strong className="text-white/65">ANP:</strong> código SIMP {anp?.codigoSimp || "—"} · autorização {anp?.autorizacao || "—"} · publicação {formatDate(anp?.dataPublicacao)} · vinculação {formatDate(anp?.dataVinculacao)}</p>
          <p><strong className="text-white/65">Distribuição:</strong> {anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || "não informada"}</p>
          <p><strong className="text-white/65">Localização:</strong> {anp?.endereco || local?.address || "—"} · complemento {anp?.complemento || "—"} · bairro {anp?.bairro || local?.neighborhood || "—"} · CEP {anp?.cep || "—"}</p>
          <p><strong className="text-white/65">Município/UF:</strong> {anp?.municipio || "Águas Lindas de Goiás"} / {anp?.uf || "GO"}</p>
          <p><strong className="text-white/65">Situação ANP/SIGAF:</strong> {anp?.situacaoConstatada || "não informada"} · {anp?.statusSigaf || "sem ocorrência informada"}</p>
          <p><strong className="text-white/65">Origem:</strong> {anp?.origemInformacao || "não informada"} · obtido em {formatDate(anp?.dataObtencao)}</p>
          <p><strong className="text-white/65">Geografia:</strong> {coords ? coords.lat.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) + ", " + coords.lng.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) : "sem coordenadas consolidadas"} · validação {anp?.validacao || "—"} · acurácia {anp?.estimativaAcuraciaM != null ? anp.estimativaAcuraciaM.toLocaleString("pt-BR") + " m" : "—"} · SRID {anp?.srid || "—"}</p>
          <div className="rounded-xl border border-white/8 bg-black/10 p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-[0.45rem] text-[#87DFF0]">Produtos / tancagem / bicos</p>
            {products.length ? products.map((item, productIndex) => (
              <p key={productIndex} className="mt-1">{item.produto || "produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem || ""} · bicos {item.quantidadeBicos ?? "—"} · classe {item.classe || "—"}</p>
            )) : <p className="mt-1">Nenhum produto ANP materializado nesta consulta.</p>}
          </div>
          <div className="rounded-xl border border-[#C7FF3C]/10 bg-[#C7FF3C]/[.025] p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-[0.45rem] text-[#D9FF91]">Referência secundária de mapas</p>
            <p className="mt-1">Telefone {phone || "—"} · nota {local?.mapData?.rating ?? "—"} · avaliações {local?.mapData?.reviewCount ?? "—"} · horário {local?.mapData?.hours || "—"} · bandeira observada {local?.mapData?.observedBrand || "—"}</p>
            <p className="mt-1">Status observado: {statusLabel} · coletado em {formatDate(local?.mapData?.observedAt)}</p>
          </div>
          <p><strong className="text-white/65">Qualidade:</strong> {local?.dataQuality || (anp ? "ANP" : "catálogo")} · {local?.sourceNote || "Cadastro consolidado de fontes públicas."}</p>
          {anp?.observacao && <p><strong className="text-white/65">Observação ANP:</strong> {anp.observacao}</p>}
          {coords && <p className="text-white/25">A rota é calculada pelo provedor escolhido; o Trajeto não inventa distância ou duração quando não há um motor de roteamento configurado.</p>}
        </div>
      </details>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-3 text-[0.48rem] text-white/25">
        <span>{coords ? "Rota por coordenada disponível" : "Rota por endereço"}</span>
        <span>Sem conta · uso direto</span>
      </div>
    </motion.article>
  );
}
