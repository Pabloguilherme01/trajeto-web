import { Check, ExternalLink, Navigation, Save, Share2, Fuel, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getOfflineRoute } from "@/lib/offlineStore";

type Props = {
  distance: string;
  duration: string;
  routeId?: string;
  onShare: () => void;
  onNavigate: () => void;
  onSave: () => void | Promise<void>;
  onStations: () => void;
};

export default function MobileRouteDock({ distance, duration, routeId, onShare, onNavigate, onSave, onStations }: Props) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  const handleSave = () => {
    if (busy || saved) return;
    setBusy(true);
    setSaveError(false);
    Promise.resolve(onSave())
      .then(() => setSaved(true))
      .catch(() => setSaveError(true))
      .finally(() => setBusy(false));
  };

  return (
    <section aria-label="Ações rápidas da rota" className="mt-4 md:hidden">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#C7D2C9] bg-[#163840] text-white shadow-[0_16px_38px_rgba(22,56,64,.16)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Rota pronta</p>
            <p className="mt-1 truncate text-xs font-bold text-white/75">{saved ? "Salva neste aparelho e disponível offline." : "Sua viagem está calculada e pode ser salva neste aparelho."}</p>
          </div>
          <div className={`flex shrink-0 items-center gap-3 rounded-xl px-2 py-1.5 text-right ${saved ? "bg-[#C7FF3C]/10" : "bg-white/[0.04]"}`}>
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Distância</p><p className="text-sm font-black">{distance}</p></div>
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Tempo</p><p className="text-sm font-black">{duration}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2">
          <button type="button" aria-label="Abrir navegação para o destino" onClick={onNavigate} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-[#C7FF3C] px-1 text-[0.56rem] font-extrabold text-[#0B1014] active:scale-[.97]"><Navigation className="size-4" />Navegar</button>
          <button type="button" aria-live="polite" aria-label={saved ? "Rota salva neste aparelho" : "Salvar rota para usar offline"} onClick={handleSave} disabled={busy || saved} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97] disabled:cursor-default disabled:opacity-80">
            <span className="grid size-4 place-items-center">{saved ? <Check className="size-4 text-[#C7FF3C]" /> : <Save className="size-4" />}</span>{busy ? "Salvando…" : saved ? "Salva" : "Salvar"}
          </button>
          <button type="button" aria-label="Ver postos encontrados na rota" onClick={onStations} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Fuel className="size-4" />Postos</button>
          <button type="button" aria-label="Compartilhar esta rota" onClick={onShare} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Share2 className="size-4" />Enviar</button>
        </div>
        {saveError && <p role="alert" className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-2 text-[0.58rem] font-bold text-[#FFD49C]"><AlertCircle className="size-3.5" /> Não foi possível salvar. Tente novamente.</p>}
        <p className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-2 text-[0.52rem] font-semibold text-white/45"><ExternalLink className="size-3" /> Navegação abre o serviço de mapas escolhido pelo navegador.</p>
      </div>
    </section>
  );
}
