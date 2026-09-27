import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Heart, MapPin, Navigation, Star, Phone, Share2, Copy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { shareText, vibration } from "@/lib/mobileTools";
import { rememberStation } from "@/lib/mobilePreferences";

export type StationSheetStop = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  phone?: string | null;
  isOpen?: boolean;
  priceReference?: { price: string | number; collectedAt: Date | string } | null;
  anpMatch?: { status: "probable" | "unresolved"; confidence: number; legalName: string | null; brand: string | null; authorization: string | null };
};

type Recommendation = { placeId: string; score: number; detourKm: number; detourSource: "real" | "estimated"; rationale: string; netSavings?: { value: number } | null } | null;

function maskAuthorization(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? `${digits.slice(0, 2)}.***.***-${digits.slice(-4)}` : null;
}

function navigationUrl(stop: StationSheetStop, provider: "google" | "waze") {
  if (provider === "waze") return `https://waze.com/ul?ll=${stop.lat},${stop.lng}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
}

export function StationSheet({ open, onOpenChange, stop, recommendation, favorite, onFavorite, onNavigationConfirmed }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: StationSheetStop | null;
  recommendation: Recommendation;
  favorite: boolean;
  onFavorite: () => void;
  onNavigationConfirmed?: (provider: "google" | "waze") => void;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [provider, setProvider] = useState<"google" | "waze">("google");
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    if (!stop || !open) return;
    rememberStation({ placeId: stop.placeId, name: stop.name, address: stop.address, query: stop.name });
  }, [open, stop]);
  if (!stop) return null;
  const anp = stop.anpMatch?.status === "probable" ? stop.anpMatch : null;
  const price = stop.priceReference ? Number(stop.priceReference.price) : null;
  const copyAddress = async () => { try { await navigator.clipboard.writeText(stop.address); vibration(); setFeedback("Endereço copiado."); } catch { setFeedback("Não foi possível copiar o endereço."); } };
  const shareStation = async () => { try { await shareText(`${stop.name}
${stop.address}`, navigationUrl(stop, "google"), "Posto no Trajeto"); setFeedback("Posto preparado para compartilhar."); } catch { setFeedback("Não foi possível compartilhar agora."); } };

  return <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="max-h-[88vh] overflow-y-auto rounded-t-[1.5rem] border-[#C7D2C9] bg-[#F7F4EC] text-[#163840]">
      <DrawerHeader className="px-5 pb-3 pt-5 text-left">
        <div className="flex items-start justify-between gap-4"><div><DrawerTitle className="font-display text-2xl tracking-[-0.05em]">{stop.name}</DrawerTitle><DrawerDescription className="mt-2 flex items-start gap-2 text-left leading-relaxed text-[#607570]"><MapPin className="mt-0.5 size-4 shrink-0 text-[#BA5B45]" />{stop.address}</DrawerDescription></div>{stop.rating != null && <span className="inline-flex shrink-0 items-center gap-1 border border-[#E4C35A] bg-[#FFF9D9] px-2 py-1 text-xs font-bold text-[#685600]"><Star className="size-3.5 fill-current" />{stop.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>}</div>
        {stop.userRatingsTotal != null && <p className="mt-2 text-xs text-[#6E817D]">{stop.userRatingsTotal.toLocaleString("pt-BR")} avaliação(ões) no Google.</p>}
      </DrawerHeader>
      <div className="space-y-4 px-5 pb-2">{feedback && <p role="status" aria-live="polite" className="sticky top-0 z-10 rounded-xl border border-[#326575]/20 bg-[#EAF4EC] px-3 py-2 text-[0.65rem] font-bold text-[#326575]">{feedback}</p>}
        <section className={`border p-4 ${price != null ? "border-[#9BC9B4] bg-[#EAF4EC]" : "border-[#D5DED6] bg-white"}`}><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#55736C]">Referência oficial de preço</p>{price != null ? <><p className="font-display mt-2 text-3xl tracking-[-0.055em]">{price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-1 text-xs text-[#55736C]">ANP · coleta em {new Date(stop.priceReference!.collectedAt).toLocaleDateString("pt-BR")}. Não é oferta nem preço em tempo real.</p></> : <p className="mt-2 text-sm font-semibold text-[#657873]">Preço oficial ainda não vinculado.</p>}</section>
        {anp && <section className="border border-[#C9D9CF] bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#55736C]">Cadastro ANP</p><p className="mt-2 text-sm font-bold">{anp.legalName}</p><p className="mt-1 text-xs leading-relaxed text-[#5E746E]">{[anp.brand && `Bandeira ${anp.brand}`, maskAuthorization(anp.authorization) && `CNPJ ${maskAuthorization(anp.authorization)}`].filter(Boolean).join(" · ")}</p><p className="mt-2 text-xs text-[#5E746E]">Correspondência provável com cadastro ANP — confiança {Math.round(anp.confidence * 100)}%.</p></section>}
        {recommendation && <section className="border border-[#C6DA65] bg-[#F4F8D9] p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#567100]">Recomendação nesta rota</p><p className="mt-2 text-sm leading-relaxed text-[#52644A]">Score {recommendation.score.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} · desvio {recommendation.detourSource === "real" ? "real" : "estimado"} de {recommendation.detourKm.toLocaleString("pt-BR")} km.</p>{recommendation.netSavings && <p className="mt-2 text-xs font-bold text-[#486800]">Economia líquida estimada: {recommendation.netSavings.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}<p className="mt-1 text-xs leading-relaxed text-[#5B6C4B]">{recommendation.rationale}</p></section>}
        <section className="border border-[#D5DED6] bg-white p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#55736C]">Ações rápidas</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={copyAddress} className="min-h-11 rounded-xl border border-[#C7D2C9] text-xs font-bold text-[#36564E] active:scale-[.98]"><Copy className="mr-2 inline size-3.5" />Copiar endereço</button>{stop.phone ? <a href={`tel:${stop.phone}`} className="flex min-h-11 items-center justify-center rounded-xl border border-[#C7D2C9] text-xs font-bold text-[#36564E] active:scale-[.98]"><Phone className="mr-2 size-3.5" />Ligar</a> : <span className="flex min-h-11 items-center justify-center rounded-xl border border-[#E2E6E1] text-xs font-bold text-[#9AA8A3]">Telefone indisponível</span>}</div><button type="button" onClick={() => void shareStation()} className="mt-2 min-h-11 w-full rounded-xl border border-[#BDA5FF]/35 text-xs font-bold text-[#6045A4] active:scale-[.98]"><Share2 className="mr-2 inline size-3.5" />Compartilhar posto</button><button type="button" onClick={() => void shareDecision()} className="mt-2 min-h-11 w-full rounded-xl border border-[#326575]/30 bg-[#EAF4EC] text-xs font-extrabold text-[#326575] active:scale-[.98]"><Share2 className="mr-2 inline size-3.5" />Compartilhar decisão</button><p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#55736C]">Como chegar</p><div className="mt-3 flex gap-2" role="radiogroup" aria-label="Provedor de navegação"><button type="button" aria-checked={provider === "google"} role="radio" onClick={() => setProvider("google")} className={`min-h-11 flex-1 border px-3 text-xs font-bold transition ${provider === "google" ? "border-[#163840] bg-[#163840] text-white" : "border-[#C7D2C9] bg-white text-[#36564E]"}`}>Google Maps</button><button type="button" aria-checked={provider === "waze"} role="radio" onClick={() => setProvider("waze")} className={`min-h-11 flex-1 border px-3 text-xs font-bold transition ${provider === "waze" ? "border-[#163840] bg-[#163840] text-white" : "border-[#C7D2C9] bg-white text-[#36564E]"}`}>Waze</button></div></section>
      </div>
      <DrawerFooter className="sticky bottom-0 z-10 border-t border-[#D8DED5] bg-[#F7F4EC]/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:flex-row"><Button type="button" variant="outline" onClick={() => { onFavorite(); setFeedback(favorite ? "Posto removido dos salvos." : "Posto salvo neste aparelho ou conta."); }} className="min-h-12 flex-1 rounded-none border-[#163840] text-[#163840]"><Heart className={`mr-2 size-4 ${favorite ? "fill-[#BA5B45] text-[#BA5B45]" : ""}`} />{favorite ? "Nos favoritos" : "Favoritar"}</Button><Button type="button" onClick={() => setConfirmationOpen(true)} className="min-h-12 flex-1 rounded-xl bg-[#C7FF3C] text-[#0B1014] shadow-[0_10px_25px_rgba(199,255,60,.15)] hover:bg-white"><Navigation className="mr-2 size-4" />Como chegar</Button></DrawerFooter>
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><AlertDialogContent className="border-[#C7D2C9] bg-[#F7F4EC] text-[#163840]"><AlertDialogHeader><AlertDialogTitle>Continuar para {provider === "google" ? "Google Maps" : "Waze"}?</AlertDialogTitle><AlertDialogDescription className="leading-relaxed text-[#5A706D]">Você abrirá a navegação para <strong>{stop.name}</strong>. {price != null ? `A referência ANP exibida é ${price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} e não representa uma oferta.` : "Não há preço oficial vinculado a este posto."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11 rounded-none">Voltar</AlertDialogCancel><AlertDialogAction className="min-h-11 rounded-none bg-[#163840] text-white hover:bg-[#28545B]" onClick={() => { onNavigationConfirmed?.(provider); window.open(navigationUrl(stop, provider), "_blank", "noopener,noreferrer"); }}>Abrir navegação</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </DrawerContent>
  </Drawer>;
}
