import { ExternalLink, Navigation, Save, Share2, Fuel } from "lucide-react";

type Props = {
  distance: string;
  duration: string;
  onShare: () => void;
  onNavigate: () => void;
  onSave: () => void;
  onStations: () => void;
};

export default function MobileRouteDock({ distance, duration, onShare, onNavigate, onSave, onStations }: Props) {
  return (
    <section aria-label="Ações rápidas da rota" className="mt-4 md:hidden">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#C7D2C9] bg-[#163840] text-white shadow-[0_16px_38px_rgba(22,56,64,.16)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Rota pronta</p>
            <p className="mt-1 truncate text-xs font-bold text-white/75">Sua viagem está calculada e pode ser salva neste aparelho.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-right">
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Distância</p><p className="text-sm font-black">{distance}</p></div>
            <div><p className="text-[0.52rem] uppercase tracking-[0.1em] text-white/45">Tempo</p><p className="text-sm font-black">{duration}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2">
          <button type="button" onClick={onNavigate} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-[#C7FF3C] px-1 text-[0.56rem] font-extrabold text-[#0B1014] active:scale-[.97]"><Navigation className="size-4" />Navegar</button>
          <button type="button" onClick={onSave} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Save className="size-4" />Salvar</button>
          <button type="button" onClick={onStations} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Fuel className="size-4" />Postos</button>
          <button type="button" onClick={onShare} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/10 px-1 text-[0.56rem] font-extrabold text-white active:scale-[.97]"><Share2 className="size-4" />Enviar</button>
        </div>
        <p className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-2 text-[0.52rem] font-semibold text-white/45"><ExternalLink className="size-3" /> Navegação abre o serviço de mapas escolhido pelo navegador.</p>
      </div>
    </section>
  );
}
