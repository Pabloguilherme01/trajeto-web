import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { motion, useReducedMotion } from "framer-motion";
import { Fuel, Heart, MapPin, Navigation, Phone, Route } from "lucide-react";
import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import { getPreferredNavigationProvider, setPreferredNavigationProvider, shareText, vibration } from "@/lib/mobileTools";
import { stationDataConfidence, freshnessLabel } from "@/lib/stationEntity";
import { buildDestinationPlannerUrl, buildOriginPlannerUrl } from "@/lib/tripLinks";
import { destinationNavigationValue } from "@/lib/unifiedDestination";
import { stationCoordinatePoint } from "@/lib/stationListControls";
import { buildGoogleMapsDestinationUrl, buildWazeNavigationUrl, buildAppleMapsDirectionsUrl } from "@/lib/mobileTools";

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
  if (key.includes("zm")) return { label: "ZM", className: "bg-accent text-[#12353F] border-[#12353F]/10" };
  if (key.includes("formula")) return { label: "F1", className: "bg-[#F24822] text-white border-white/10" };
  if (key.includes("ponteio")) return { label: "P", className: "bg-primary text-[#163840] border-[#163840]/10" };
  if (key.includes("premium")) return { label: "PREM", className: "bg-[#D8DDE3] text-[#2E3740] border-black/10" };
  if (local?.mapData?.observedBrand) return { label: "MAPA", className: "bg-accent/10 text-[#9FEFFF] border-accent/15" };
  return { label: "POSTO", className: "bg-primary/10 text-[#D9FF91] border-primary/15" };
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
  catalogStatus = "Não conciliado",
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
  const [actionError, setActionError] = useState("");
  const [preferredProvider, setPreferredProviderState] = useState(() => getPreferredNavigationProvider());
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
  const coords = stationCoordinatePoint(anp?.latitude, anp?.longitude)
    ?? stationCoordinatePoint(local?.anp?.latitude, local?.anp?.longitude);
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

  const anpUrl = "https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/consulta-posto-web";
  const anpComVcUrl = "https://anpcomvcpostos.anp.gov.br/";
  const shareUrl = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname + "?q=" + encodeURIComponent(stationName) + (cnpj ? "#posto-" + encodeURIComponent(cnpj) : "")
    : address;
  const phone = local?.mapData?.phone;
  const webSearchUrl = "https://www.google.com/search?q=" + encodeURIComponent(stationName + " " + address);
  const status = local?.mapData?.operationalStatus;
  const statusLabel = status === "open" ? "Aberto em referência de mapa" : status === "closed" ? "Fechado em referência de mapa" : "Funcionamento não confirmado";
  const sharedDestination = {
    id: "station:" + (cnpj || local?.id || stationName),
    kind: "station" as const,
    name: stationName,
    address,
    coordinates: coords,
    source: anp ? "ANP" : "catalog",
  };
  const navigationValue = destinationNavigationValue(sharedDestination);
  const navigationUrl = preferredProvider === "waze"
    ? buildWazeNavigationUrl(address, coords ?? undefined)
    : preferredProvider === "apple"
      ? buildAppleMapsDirectionsUrl(navigationValue)
      : buildGoogleMapsDestinationUrl(navigationValue, true);
  const navigationProviderLabel = preferredProvider === "waze"
    ? "Waze"
    : preferredProvider === "apple"
      ? "Apple Maps"
      : "Google Maps";

  const copy = async (value: string) => {
    setActionError("");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      vibration();
      window.setTimeout(() => setCopied(false), 1400);
    } catch { setActionError("Não foi possível copiar. Confira as permissões do navegador."); }
  };

  const share = async () => {
    setActionError("");
    try {
      await shareText(stationName + " · " + address + (cnpj ? " · CNPJ " + formatCnpj(cnpj) : ""), shareUrl, "Trajeto · posto");
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setActionError("Não foi possível compartilhar este posto. Tente copiar o endereço."); }
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
      className="task-surface group relative scroll-mt-24 overflow-hidden rounded-[1.45rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,35,43,.96),rgba(11,16,20,.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,.20)] transition-shadow duration-300 hover:border-accent/20 hover:shadow-[0_26px_75px_rgba(0,0,0,.28)] [content-visibility:auto] [contain-intrinsic-size:320px]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full bg-accent/[.06] blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start gap-3">
        <BrandMark local={local} anp={anp} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.14em] text-accent">Posto {String(index).padStart(2, "0")}</p>
              <h3 className="mt-1 text-base font-black leading-tight text-white">{stationName}</h3>

            </div>
            {onToggleSaved && <button type="button" onClick={onToggleSaved} aria-pressed={!!saved} className={"flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-2 text-xs font-bold " + (saved ? "border-primary/30 text-[#D9FF91]" : "border-white/10 text-white/75")} aria-label={saved ? "Remover posto dos salvos" : "Salvar posto neste aparelho"}>
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />{saved ? "Salvo" : "Salvar"}
            </button>}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/15 bg-primary/[.04] px-2 py-1 text-xs font-black text-[#D9FF91]">{catalogStatus}</span>

            <span className="rounded-full border border-white/8 px-2 py-1 text-xs font-black text-white/65">{distributor}</span>
            {Number.isFinite(distanceKm) && <span className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-xs font-black text-white/65">{Number(distanceKm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}
            {status && <span className={"rounded-full border px-2 py-1 text-xs font-black " + (status === "closed" ? "border-warning/25 text-warning" : "border-primary/15 text-[#D9FF91]")}>{statusLabel}</span>}
          </div>
        </div>
      </div>

      {primaryPrice ? <>
      <section className="mt-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-3" aria-label="Preço ANP">
        <div className="flex items-end justify-between gap-3">
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
        <p className="mt-2 text-xs leading-relaxed text-white/65">Fonte ANP · {primaryPrice ? freshnessLabel(primaryPrice.collectionDate) : "sem preço individual disponível"}. O preço pode ter mudado — confirme no posto.</p>
      </section>

      </> : <p className="mt-3 text-xs leading-relaxed text-white/65">Preço individual indisponível · confirme no posto.</p>}

      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-white/65">{address || "Endereço não consolidado"}</p>
        </div>
        {local?.mapData?.hours && <p className="mt-2 text-xs text-white/65">Horário informado: {local.mapData.hours} · confirme antes de sair.</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" aria-label={"Ações para " + stationName}>
        <a href={buildDestinationPlannerUrl(destinationNavigationValue(sharedDestination))} className="task-action task-action-primary gap-1.5">
          <Route className="size-4" aria-hidden="true" />Ir até aqui
        </a>
        <a href={navigationUrl} target="_blank" rel="noopener noreferrer" className="task-action task-action-secondary gap-1.5">
          <Navigation className="size-4 text-accent" aria-hidden="true" />Abrir no {navigationProviderLabel}
        </a>
        {phone && <a href={"tel:" + phone.replace(/[^+\d]/g, "")} className="task-action task-action-secondary col-span-2"><Phone className="size-4" aria-hidden="true" />Ligar para o posto</a>}
      </div>
      {actionError && <p role="alert" className="mt-2 text-xs text-[#FFD59B]">{actionError}</p>}
      <details className="mt-3 rounded-xl border border-white/8 bg-white/[.02] px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-white/75">Mais opções do posto</summary>
        <div className="grid grid-cols-2 gap-2 border-t border-white/8 py-3">
          <a href={buildOriginPlannerUrl(address)} className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-2 text-center text-xs font-bold text-white/75">Usar como partida</a>
          <button type="button" onClick={() => void share()} className="min-h-11 rounded-xl border border-white/10 text-xs font-bold text-white/75">Compartilhar</button>
          <button type="button" onClick={() => void copy(cnpj || address)} className="min-h-11 rounded-xl border border-white/10 px-2 text-xs font-bold text-white/75">{copied ? "Copiado" : cnpj ? "Copiar CNPJ" : "Copiar endereço"}</button>
          <a href={webSearchUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-2 text-center text-xs font-bold text-white/75">Pesquisar este posto na web</a>
          {local && <Link href={appUrl("/local/" + encodeURIComponent(local.id))} className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-2 text-center text-xs font-bold text-white/75">Ver detalhes</Link>}
          {local?.mapData?.website && <a href={local.mapData.website} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-white/75">Site informado</a>}
          {local?.mapData?.email && <a href={"mailto:" + local.mapData.email} className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-white/75">Enviar e-mail</a>}
        </div>

      <details className="mt-2 rounded-xl border border-white/8 bg-white/[.02] px-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-black text-white/65">
          <span>Navegação preferida</span>
          <span className="text-[#C9F7FF]">{navigationProviderLabel}</span>
        </summary>
        <div className="grid grid-cols-3 gap-2 border-t border-white/8 py-3">
          {(["google", "waze", "apple"] as const).map(provider => (
            <button
              key={provider}
              type="button"
              aria-pressed={preferredProvider === provider}
              onClick={() => {
                setPreferredNavigationProvider(provider);
                setPreferredProviderState(provider);
              }}
              className={"min-h-11 rounded-xl border px-2 text-xs font-black " + (preferredProvider === provider ? "border-primary/25 bg-primary/10 text-[#D9FF91]" : "border-white/8 text-white/60")}
            >
              {provider === "google" ? "Google" : provider === "waze" ? "Waze" : "Apple"}
            </button>
          ))}
        </div>
      </details>

      </details>
      <details className="mt-3 rounded-2xl border border-white/8 bg-white/[.02]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-black text-white/65">
          <span>Sobre os dados deste posto</span>
          <Fuel className="size-4 text-white/65" />
        </summary>
        <div className="space-y-2 border-t border-white/8 px-3 py-3 text-xs leading-relaxed text-white/65">
      <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-3" aria-label="Confiança e atualização dos dados">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.13em] text-white/65">Confiança dos dados</p>
            <p className="mt-1 text-xs font-black text-white">{confidence >= 90 ? "Alta" : confidence >= 70 ? "Boa" : confidence >= 50 ? "Parcial" : "Baixa"}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-primary">{confidence}%</p>
            <p className="text-xs font-bold text-white/65">qualidade/frescor</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: confidence + "%" }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/65">
          <span>Cadastro: {anp ? "ANP" : "catálogo local"}</span>
          <span>Preço: {primaryPrice ? "ANP" : "não disponível"}</span>
          <span>Localização: {coords ? "coordenada" : "não confirmada"}</span>
        </div>
      </section>

          <p>Razão social: {legalName} · situação do catálogo: {catalogStatus}</p>
          <div className="flex flex-wrap gap-3"><a href={anpUrl} target="_blank" rel="noopener noreferrer" className="underline">Consulta cadastral ANP</a><a href={anpComVcUrl} target="_blank" rel="noopener noreferrer" className="underline">ANP com VC</a></div>

          <p><strong className="text-white/65">Identidade:</strong> {local?.aliases?.join(" · ") || "sem aliases consolidados"} · CNPJ {cnpj ? formatCnpj(cnpj) : "—"}</p>
          <p><strong className="text-white/65">ANP · identificação:</strong> código SIMP {anp?.codigoSimp || "—"} · autorização {anp?.autorizacao || "—"} · CNPJ {cnpj ? formatCnpj(cnpj) : "—"}</p>
          <p><strong className="text-white/65">ANP · datas:</strong> publicação {formatDate(anp?.dataPublicacao)} · vinculação {formatDate(anp?.dataVinculacao)} · obtenção dos dados {formatDate(anp?.dataObtencao)}</p>
          <p><strong className="text-white/65">ANP · distribuição:</strong> {anp?.distribuidora || "não informada"} · situação constatada {anp?.situacaoConstatada || "não informada"} · SIGAF {anp?.statusSigaf || "não informado"}</p>
          <p><strong className="text-white/65">ANP · localização:</strong> {anp?.endereco || local?.address || "—"} · complemento {anp?.complemento || "—"} · bairro {anp?.bairro || local?.neighborhood || "—"} · CEP {anp?.cep || "—"} · município/UF {anp?.municipio || "—"}/{anp?.uf || "—"}</p>
          <p><strong className="text-white/65">ANP · georreferenciamento:</strong> {anp?.latitude != null && anp?.longitude != null ? anp.latitude + ", " + anp.longitude : "coordenada principal não informada"} · ANP 4C {anp?.latitudeAnp4c != null && anp?.longitudeAnp4c != null ? anp.latitudeAnp4c + ", " + anp.longitudeAnp4c : "não informado"} · validação {anp?.validacao || "não informada"} · acurácia estimada {anp?.estimativaAcuraciaM != null ? anp.estimativaAcuraciaM + " m" : "não informada"} · SRID {anp?.srid || "não informado"} · sistema {anp?.sistemaReferenciaCoordenadas || "não informado"}</p>
          <p><strong className="text-white/65">ANP · origem:</strong> {anp?.origemInformacao || "não informada"}{anp?.observacao ? " · observação: " + anp.observacao : ""}</p>
          <p><strong className="text-white/65">Origem cadastral API:</strong> {anp?.src || "não informada"}</p>
          <p><strong className="text-white/65">PMQC retornado pela API:</strong> {anp?.inadimplenciaPMQC?.length ? JSON.stringify(anp.inadimplenciaPMQC) : "nenhum registro adicional retornado"}</p>
          <div className="rounded-xl border border-white/8 bg-black/10 p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-xs text-[#87DFF0]">Produtos / tancagem / bicos</p>
            {products.length ? products.map((item, productIndex) => (
              <p key={productIndex} className="mt-1">{item.produto || "produto não informado"} · tancagem {item.tancagem != null ? item.tancagem.toLocaleString("pt-BR") : "—"} {item.unidadeMedidaTancagem || ""} · bicos {item.quantidadeBicos ?? "—"} · classe {item.classe || "—"}</p>
            )) : <p className="mt-1">Nenhum produto ANP materializado nesta consulta.</p>}
          </div>
          <div className="rounded-xl border border-primary/10 bg-primary/[.025] p-2.5">
            <p className="font-black uppercase tracking-[.11em] text-xs text-[#D9FF91]">Referência secundária de mapas</p>
            <p className="mt-1">Telefone {phone || "—"} · nota {local?.mapData?.rating ?? "—"} · avaliações {local?.mapData?.reviewCount ?? "—"} · horário {local?.mapData?.hours || "—"} · bandeira observada {local?.mapData?.observedBrand || "—"}</p>
            <p className="mt-1">Status observado: {statusLabel} · coletado em {formatDate(local?.mapData?.observedAt)}</p>
          </div>
          <p><strong className="text-white/65">Qualidade:</strong> {local?.dataQuality || (anp ? "ANP" : "catálogo")} · {local?.sourceNote || "Cadastro consolidado de fontes públicas."}</p>
          {anp?.observacao && <p><strong className="text-white/65">Observação ANP:</strong> {anp.observacao}</p>}
          {coords && <p className="text-white/65">Abra a rota no aplicativo escolhido para ver o caminho e o trânsito atual.</p>}
        </div>
      </details>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-3 text-xs text-white/65">
        <span>{coords ? "Rota por coordenada disponível" : "Rota por endereço"}</span>
        <span>Sem conta · uso direto</span>
      </div>
    </motion.article>
  );
}
