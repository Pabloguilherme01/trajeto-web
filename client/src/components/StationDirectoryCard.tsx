import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Heart, MapPin, Navigation, Phone, Share2 } from "lucide-react";
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
import { stationDataConfidence, stationDataConfidenceBand, freshnessLabel } from "@/lib/stationEntity";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function brandConfig(local?: LocalStationRecord | null, anp?: AnpStation | null) {
  const key = normalize(anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || "");
  if (key.includes("shell")) return { label: "SHELL", className: "bg-[#FFD43B] text-[#8B1E24] border-[#8B1E24]/15" };
  if (key.includes("ipiranga")) return { label: "IP", className: "bg-[#F4A623] text-[#153B80] border-[#153B80]/15" };
  if (key.includes("petrobras") || key.includes("petrobr") || key === "br") return { label: "BR", className: "bg-[#1A8B4D] text-white border-white/10" };
  if (key.includes("ale")) return { label: "ALE", className: "bg-[#6F43B7] text-white border-white/10" };
  if (key.includes("zm")) return { label: "ZM", className: "bg-[#3DE3FF] text-[#12353F] border-[#12353F]/10" };
  if (key.includes("formula")) return { label: "F1", className: "bg-[#F24822] text-white border-white/10" };
  if (key.includes("ponteio")) return { label: "P", className: "bg-[#C7FF3C] text-[#163840] border-[#163840]/10" };
  if (key.includes("premium")) return { label: "PREM", className: "bg-[#D8DDE3] text-[#2E3740] border-black/10" };
  return { label: "POSTO", className: "bg-[#C7FF3C]/10 text-[#D9FF91] border-[#C7FF3C]/15" };
}

function BrandMark({ local, anp }: { local?: LocalStationRecord | null; anp?: AnpStation | null }) {
  const config = brandConfig(local, anp);
  return (
    <div
      aria-label={"Marca " + config.label}
      title={config.label}
      className={"grid size-11 shrink-0 place-items-center rounded-xl border text-[0.52rem] font-black " + config.className}
    >
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
  if (!value) return "data não informada";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("pt-BR") : value;
}

type Props = {
  index: number;
  local?: LocalStationRecord | null;
  anp?: AnpStation | null;
  saved?: boolean;
  distanceKm?: number | null;
  onToggleSaved?: () => void;
  prices?: AnpPriceRecord[];
  catalogStatus?: string;
};

export function StationDirectoryCard({
  index,
  local,
  anp,
  saved,
  distanceKm = null,
  onToggleSaved,
  prices = [],
  catalogStatus = "unreconciled",
}: Props) {
  const [copied, setCopied] = useState(false);
  const stationName = local?.displayName || anp?.razaoSocial || ("Posto " + (anp?.cnpj || index));
  const legalName = anp?.razaoSocial || local?.legalName || "Razão social não informada";
  const cnpj = anp?.cnpj || local?.cnpj || "";
  const address =
    [
      anp?.endereco,
      anp?.complemento,
      anp?.bairro,
      anp?.municipio,
      anp?.uf,
    ].filter(Boolean).join(", ") ||
    [
      local?.address,
      local?.neighborhood,
      "Águas Lindas de Goiás",
      "GO",
    ].filter(Boolean).join(", ");

  const coords =
    Number.isFinite(anp?.latitude) && Number.isFinite(anp?.longitude)
      ? { lat: Number(anp?.latitude), lng: Number(anp?.longitude) }
      : Number.isFinite(local?.anp?.latitude) && Number.isFinite(local?.anp?.longitude)
        ? { lat: Number(local?.anp?.latitude), lng: Number(local?.anp?.longitude) }
        : null;

  const primaryPrice = prices.find(item => item.productKey === "gasolina-comum") ?? prices[0] ?? null;
  const confidence = stationDataConfidence({ anp, local, price: primaryPrice });
  const status = local?.mapData?.operationalStatus;
  const statusLabel =
    status === "open"
      ? "Aberto · referência de mapa"
      : status === "closed"
        ? "Fechado · referência de mapa"
        : "Funcionamento não confirmado";

  const products = useMemo(() => {
    const unique = new Map<string, AnpStation["products"][number]>();
    (anp?.products || []).forEach(item => {
      const key = [item.produto, item.classe, item.tancagem, item.quantidadeBicos].join("|");
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }, [anp]);

  const destination = coords ? coords.lat + "," + coords.lng : address;
  const googleUrl = buildGoogleMapsDestinationUrl(destination, true);
  const wazeUrl = buildWazeNavigationUrl(address, coords || undefined);
  const appleUrl = buildAppleMapsDirectionsUrl(destination);
  const preferredProvider = getPreferredNavigationProvider();
  const preferredUrl =
    preferredProvider === "waze" ? wazeUrl :
    preferredProvider === "apple" ? appleUrl :
    googleUrl;
  const plannerUrl = appUrl("/planejar") + "?destino=" + encodeURIComponent(address);
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname + "?q=" + encodeURIComponent(stationName) + (cnpj ? "#posto-" + encodeURIComponent(cnpj) : "")
      : address;
  const anpUrl = "https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web";
  const anpComVcUrl = "https://anpcomvcpostos.anp.gov.br/";
  const phone = local?.mapData?.phone;

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
      await shareText(
        stationName + " · " + address + (cnpj ? " · CNPJ " + formatCnpj(cnpj) : ""),
        shareUrl,
        "Trajeto · posto",
      );
    } catch {}
  };

  return (
    <article
      id={"posto-" + (cnpj ? encodeURIComponent(cnpj) : "mapa-" + index)}
      className="relative scroll-mt-24 overflow-hidden rounded-[1.3rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,35,43,.96),rgba(11,16,20,.98))] p-3.5 shadow-[0_14px_40px_rgba(0,0,0,.18)]"
    >
      <div className="flex items-start gap-3">
        <BrandMark local={local} anp={anp} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[0.46rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">
                Posto {String(index).padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-[0.98rem] font-black leading-tight text-white">{stationName}</h3>
              <p className="mt-1 line-clamp-1 text-[0.54rem] leading-relaxed text-white/35">{legalName}</p>
            </div>
            <button
              type="button"
              onClick={onToggleSaved}
              disabled={!onToggleSaved}
              className={"grid size-10 shrink-0 place-items-center rounded-xl border disabled:opacity-25 " + (
                saved
                  ? "border-[#FF7D6A]/30 bg-[#FF7D6A]/10 text-[#FFB7A9]"
                  : "border-white/8 text-white/45"
              )}
              aria-label={saved ? "Remover posto dos salvos" : onToggleSaved ? "Salvar posto neste aparelho" : "Salvar indisponível sem coordenada"}
            >
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] px-2 py-1 text-[0.43rem] font-black text-[#9FEFFF]">
              {catalogStatus}
            </span>
            {anp && (
              <span className="rounded-full border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-2 py-1 text-[0.43rem] font-black text-[#D9FF91]">
                ANP
              </span>
            )}
            {Number.isFinite(distanceKm) && (
              <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[0.43rem] font-black text-white/65">
                {Number(distanceKm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
              </span>
            )}
            {status && (
              <span className={"rounded-full border px-2 py-1 text-[0.43rem] font-black " + (
                status === "closed"
                  ? "border-[#FFB86B]/25 text-[#FFCF96]"
                  : "border-[#C7FF3C]/15 text-[#D9FF91]"
              )}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] p-3">
        <div className="min-w-0">
          <p className="text-[0.46rem] font-black uppercase tracking-[.13em] text-[#D9FF91]">
            {primaryPrice ? primaryPrice.produto : "Preço ANP"}
          </p>
          <p className="mt-1 text-[1.65rem] font-black tracking-[-.05em] text-white">
            {primaryPrice
              ? primaryPrice.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "—"}
            {primaryPrice && <span className="ml-1 text-[0.55rem] font-bold text-white/40">/{primaryPrice.unit}</span>}
          </p>
          <p className="mt-1 text-[0.46rem] text-white/30">
            {primaryPrice
              ? "ANP · coleta " + formatDate(primaryPrice.collectionDate)
              : "Sem preço individual ANP nesta amostra"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.46rem] font-black uppercase tracking-[.12em] text-white/30">Confiança</p>
          <p className="mt-1 text-lg font-black text-[#C7FF3C]">{confidence}%</p>
          <p className="text-[0.44rem] font-bold text-white/25">{stationDataConfidenceBand(confidence)}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[0.45rem] text-white/30">
        <span>Cadastro: {anp ? "ANP" : "catálogo local"}{anp ? " · " + formatDate(anp.dataObtencao ?? anp.dataVinculacao ?? anp.dataPublicacao) : ""}</span>
        <span>Localização: {coords ? (anp?.latitude != null && anp?.longitude != null ? "ANP" : "mapa") : "não confirmada"}</span>
        {primaryPrice && <span>Frescor: {freshnessLabel(primaryPrice.collectionDate)}</span>}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.02] p-3">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />
        <p className="min-w-0 text-[0.6rem] leading-relaxed text-white/55">{address || "Endereço não consolidado"}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => window.open(preferredUrl, "_blank", "noopener,noreferrer")}
          className="col-span-2 min-h-12 rounded-2xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014] active:scale-[.98]"
        >
          <Navigation className="mr-1 inline size-3.5" />
          Ir agora · {preferredProvider === "waze" ? "Waze" : preferredProvider === "apple" ? "Apple Maps" : "Google Maps"}
        </button>
        <button
          type="button"
          onClick={() => { setPreferredNavigationProvider("google"); window.open(googleUrl, "_blank", "noopener,noreferrer"); }}
          className="min-h-11 rounded-xl border border-white/8 bg-white/[.03] text-[0.55rem] font-black text-white/75 active:scale-[.98]"
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => { setPreferredNavigationProvider("waze"); window.open(wazeUrl, "_blank", "noopener,noreferrer"); }}
          className="min-h-11 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] text-[0.55rem] font-black text-[#C9F7FF] active:scale-[.98]"
        >
          Waze
        </button>
        <button
          type="button"
          onClick={() => { setPreferredNavigationProvider("apple"); window.open(appleUrl, "_blank", "noopener,noreferrer"); }}
          className="min-h-11 rounded-xl border border-white/10 bg-white/[.04] text-[0.55rem] font-black text-white/75 active:scale-[.98]"
        >
          Apple
        </button>
        <a
          href={plannerUrl}
          className="flex min-h-11 items-center justify-center rounded-xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.04] text-[0.55rem] font-black text-[#D9FF91] active:scale-[.98]"
        >
          Planejar
        </a>
        <button
          type="button"
          onClick={() => void share()}
          className="col-span-2 min-h-11 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/65 active:scale-[.98]"
        >
          <Share2 className="mr-1 inline size-3.5" /> Compartilhar
        </button>
      </div>

      <details className="mt-3 overflow-hidden rounded-2xl border border-white/8 bg-white/[.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[0.58rem] font-black text-white/70">
          <span>Detalhes e fontes</span>
          <span className="text-[0.46rem] font-bold text-white/30">CNPJ · ANP · produtos</span>
        </summary>

        <div className="space-y-3 border-t border-white/8 px-3 pb-3 pt-3">
          <section aria-label="Identificação do posto">
            <p className="text-[0.46rem] font-black uppercase tracking-[.12em] text-[#87DFF0]">Identificação</p>
            <div className="mt-2 grid gap-1.5 text-[0.54rem] leading-relaxed text-white/45">
              <p><strong className="text-white/65">CNPJ:</strong> {cnpj ? formatCnpj(cnpj) : "não informado"}</p>
              <p><strong className="text-white/65">Bairro:</strong> {anp?.bairro || local?.neighborhood || "não informado"}</p>
              <p><strong className="text-white/65">CEP:</strong> {anp?.cep || "não informado"}</p>
              <p><strong className="text-white/65">Bandeira:</strong> {anp?.distribuidora || local?.brand || local?.mapData?.observedBrand || "não consolidada"}</p>
              <p><strong className="text-white/65">Telefone:</strong> {phone || "não informado"}</p>
              {local?.mapData?.website && (
                <a href={local.mapData.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 font-bold text-[#C9F7FF] underline underline-offset-2">
                  Site informado no mapa <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </section>

          <section aria-label="Ações de contato">
            <div className="grid grid-cols-2 gap-2">
              {phone && (
                <a href={"tel:" + phone.replace(/[^+\d]/g, "")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/65">
                  <Phone className="size-3.5" /> Ligar
                </a>
              )}
              <button
                type="button"
                onClick={() => void copy(cnpj || address)}
                className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/8 text-[0.55rem] font-black text-white/65"
              >
                {copied ? <Check className="size-3.5 text-[#C7FF3C]" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado" : cnpj ? "Copiar CNPJ" : "Copiar endereço"}
              </button>
              <button
                type="button"
                onClick={() => window.open(anpUrl, "_blank", "noopener,noreferrer")}
                className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#3DE3FF]/15 text-[0.55rem] font-black text-[#9FEFFF]"
              >
                Consulta oficial ANP <ExternalLink className="size-3.5" />
              </button>
            </div>
          </section>

          <section aria-label="Dados técnicos ANP">
            <p className="text-[0.46rem] font-black uppercase tracking-[.12em] text-[#D9FF91]">Dados técnicos</p>
            <div className="mt-2 space-y-1.5 text-[0.54rem] leading-relaxed text-white/45">
              <p><strong className="text-white/65">SIMP:</strong> {anp?.codigoSimp || "não informado"} · <strong className="text-white/65">autorização:</strong> {anp?.autorizacao || "não informada"}</p>
              <p><strong className="text-white/65">Situação:</strong> {anp?.situacaoConstatada || "não informada"} · <strong className="text-white/65">SIGAF:</strong> {anp?.statusSigaf || "não informado"}</p>
              <p><strong className="text-white/65">Origem:</strong> {anp?.origemInformacao || "não informada"} · <strong className="text-white/65">obtenção:</strong> {formatDate(anp?.dataObtencao)}</p>
              <p><strong className="text-white/65">Localização:</strong> {coords ? coords.lat.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) + ", " + coords.lng.toLocaleString("pt-BR", { maximumFractionDigits: 7 }) : "sem coordenadas consolidadas"}</p>
              {anp?.validacao && <p><strong className="text-white/65">Validação:</strong> {anp.validacao}{anp.estimativaAcuraciaM != null ? " · acurácia " + anp.estimativaAcuraciaM.toLocaleString("pt-BR") + " m" : ""}</p>}
              {anp?.observacao && <p><strong className="text-white/65">Observação:</strong> {anp.observacao}</p>}
            </div>
          </section>

          <section aria-label="Produtos ANP">
            <p className="text-[0.46rem] font-black uppercase tracking-[.12em] text-[#D9FF91]">Produtos, tancagem e bicos</p>
            {products.length ? (
              <div className="mt-2 space-y-1.5 text-[0.54rem] leading-relaxed text-white/45">
                {products.map((item, itemIndex) => (
                  <p key={item.produto + "-" + itemIndex}>
                    {item.produto || "Produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem || ""} · bicos {item.quantidadeBicos ?? "—"}{item.classe ? " · " + item.classe : ""}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[0.54rem] text-white/35">Nenhum produto ANP materializado nesta consulta.</p>
            )}
          </section>

          <section aria-label="Dados secundários">
            <p className="text-[0.46rem] font-black uppercase tracking-[.12em] text-white/30">Referência de mapa</p>
            <div className="mt-2 space-y-1.5 text-[0.54rem] leading-relaxed text-white/35">
              <p>Telefone {phone || "—"} · nota {local?.mapData?.rating ?? "—"} · avaliações {local?.mapData?.reviewCount ?? "—"}</p>
              <p>Horário {local?.mapData?.hours || "—"} · status {statusLabel}</p>
              <p>Observado em {formatDate(local?.mapData?.observedAt)}. Não substitui o cadastro ANP.</p>
            </div>
          </section>

          <section aria-label="ANP complementar">
            <a
              href={anpComVcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.04] text-[0.55rem] font-black text-[#C9F7FF]"
            >
              ANP com VC · consulta complementar <ExternalLink className="size-3.5" />
            </a>
            <p className="mt-1 text-[0.45rem] leading-relaxed text-white/25">
              Consulta externa da ANP; o relatório individual depende da interface da própria ANP.
            </p>
          </section>
        </div>
      </details>
    </article>
  );
}
