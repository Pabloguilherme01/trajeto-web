import { Check, Navigation, Save, Share2, Fuel, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { vibration } from "@/lib/mobileTools";
import { getOfflineRoute } from "@/lib/offlineStore";

type Props = {
  distance: string;
  duration: string;
  routeId?: string;
  snapshot?: boolean;
  onShare: () => void;
  onNavigate: () => void;
  onSave: () => void | Promise<void>;
  onStations: () => void;
};

export default function MobileRouteDock({ distance, duration, routeId, snapshot = false, onShare, onNavigate, onSave, onStations }: Props) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!routeId) {
      setSaved(false);
      return () => { active = false; };
    }
    void getOfflineRoute(routeId)
      .then(route => { if (active) setSaved(Boolean(route)); })
      .catch(() => { if (active) setSaved(false); });
    return () => { active = false; };
  }, [routeId]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const handleSave = () => {
    vibration();
    if (busy || saved) return;
    setBusy(true);
    setSaveError(false);
    setActionMessage(null);
    Promise.resolve(onSave())
      .then(() => { setSaved(true); setActionMessage("Rota salva neste aparelho."); vibration(18); })
      .catch(() => { setSaveError(true); setActionMessage("Não foi possível salvar a rota."); })
      .finally(() => setBusy(false));
  };

  return (
    <section aria-label="Ações rápidas da rota" className="mt-4 md:hidden">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#C7D2C9] bg-[#163840] text-white shadow-[0_16px_38px_rgba(22,56,64,.16)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">{snapshot ? "Rota salva" : "Rota pronta"}</p>
            <p className="mt-1 truncate text-xs font-bold text-white/75">{snapshot ? (online ? "Snapshot local aberto. Recalcule para buscar dados atuais." : "Snapshot local aberto e disponível sem internet.") : saved ? "Salva neste aparelho e disponível offline." : "Sua viagem está calculada e pode ser salva neste aparelho."}</p>
          </div>
          <div className={`flex shrink-0 items-center gap-3 rounded-xl border px-2 py-1.5 text-right ${saved ? "border-[#C7FF3C]/25 bg-[#C7FF3C]/10" : "border-white/8 bg-white/[0.04]"}`}>
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Distância</p><p className="text-sm font-black">{distance}</p></div>
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Tempo</p><p className="text-sm font-black">{duration}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2">
          <button type="button" aria-label={snapshot && online ? "Recalcular a rota com dados atuais" : "Abrir navegação para o destino"} onClick={() => { vibration(); onNavigate(); }} disabled={!online} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-[#C7FF3C] px-1 text-[0.56rem] font-extrabold text-[#0B1014] shadow-[0_8px_18px_rgba(199,255,60,.14)] active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40"><Navigation className="size-4" />Navegar</button>
          <button type="button" aria-live="polite" aria-label={saved ? "Rota salva neste aparelho" : "Salvar rota para usar offline"} onClick={handleSave} disabled={busy || saved} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97] disabled:cursor-default disabled:opacity-80">
            <span className="grid size-4 place-items-center">{saved ? <Check className="size-4 text-[#C7FF3C]" /> : <Save className="size-4" />}</span>{busy ? "Salvando…" : saved ? "Salva" : "Salvar"}
          </button>
          <button type="button" aria-label="Ver postos encontrados na rota" onClick={() => { vibration(); onStations(); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Fuel className="size-4" />Postos</button>
          <button type="button" aria-label="Compartilhar esta rota" onClick={() => { vibration(); onShare(); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Share2 className="size-4" />Enviar</button>
        </div>
        {actionMessage && <p role="status" aria-live="polite" className="border-t border-white/10 px-3 py-2 text-center text-[0.58rem] font-bold text-white/75">{actionMessage}</p>}
        {!online && !saved && <p role="status" className="border-t border-[#FFB86B]/20 bg-[#FFB86B]/[0.05] px-3 py-2 text-center text-[0.56rem] font-bold text-[#FFD49C]">Salve esta rota agora para continuar mesmo sem internet.</p>}
        {saveError && <p role="alert" className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-2 text-[0.58rem] font-bold text-[#FFD49C]"><AlertCircle className="size-3.5" /> Não foi possível salvar. Tente novamente.</p>}
        <p className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-2 text-[0.52rem] font-semibold text-white/45"><span className={`size-1.5 rounded-full ${online ? "bg-[#C7FF3C]" : "bg-[#FFB86B]"}`} /> {online ? (snapshot ? "Online · esta rota é um snapshot. Recalcule antes de sair." : "Online · dados externos e navegação disponíveis.") : saved ? "Offline · esta rota continua disponível neste aparelho." : "Offline · salve a rota antes de sair."}</p>
      </div>
    </section>
  );
}
