import { Accessibility, Calculator, ChevronRight, CircleHelp, Download, ExternalLink, Navigation, Settings, X } from "lucide-react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";

const OPEN_ACCESSIBILITY_EVENT = "trajeto:open-accessibility";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileMoreSheet({ open, onClose }: Props) {
  const [, setLocation] = useLocation();

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    setLocation(appUrl(href));
  };

  const openAccessibility = () => {
    onClose();
    window.dispatchEvent(new CustomEvent(OPEN_ACCESSIBILITY_EVENT));
  };

  const openInstall = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("trajeto:open-install"));
  };

  return (
    <div className="fixed inset-0 z-[75] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
      <button type="button" aria-label="Fechar menu Mais" className="absolute inset-0 bg-[#02070A]/70 backdrop-blur-[2px]" onClick={onClose} />
      <section className="absolute inset-x-2 bottom-[max(5.4rem,calc(4.9rem + env(safe-area-inset-bottom)))] mx-auto max-w-md overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#10191F] shadow-[0_24px_80px_rgba(0,0,0,.55)]">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5">
          <div>
            <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Mais</p>
            <h2 id="mobile-more-title" className="mt-1 text-base font-black text-white">Configurações e fontes</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-white/8 text-white/50" aria-label="Fechar"><X className="size-4" /></button>
        </div>

        <div className="grid gap-2 p-3">
          <button type="button" onClick={() => go("/planejar")} className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] px-3 text-left">
            <Navigation className="size-4 text-[#C7FF3C]" />
            <span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-black text-white">No caminho</span><span className="mt-0.5 block text-[0.52rem] text-white/35">Planeje uma rota e encontre paradas no corredor</span></span>
            <ChevronRight className="size-4 text-white/20" />
          </button>

          <button type="button" onClick={() => go("/ajuda")} className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] px-3 text-left">
            <CircleHelp className="size-4 text-[#3DE3FF]" />
            <span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-black text-white">Fontes e ajuda</span><span className="mt-0.5 block text-[0.52rem] text-white/35">ANP, Google, limites e funcionamento do Trajeto</span></span>
            <ChevronRight className="size-4 text-white/20" />
          </button>

          <button type="button" onClick={() => go("/ferramentas")} className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] px-3 text-left">
            <Calculator className="size-4 text-[#C7FF3C]" />
            <span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-black text-white">Calculadora</span><span className="mt-0.5 block text-[0.52rem] text-white/35">Custo da viagem e relação gasolina × etanol</span></span>
            <ChevronRight className="size-4 text-white/20" />
          </button>

          <button type="button" onClick={openAccessibility} className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] px-3 text-left">
            <Accessibility className="size-4 text-[#C7FF3C]" />
            <span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-black text-white">Acessibilidade</span><span className="mt-0.5 block text-[0.52rem] text-white/35">Tamanho, contraste, movimento e modo econômico</span></span>
            <Settings className="size-4 text-white/20" />
          </button>

          <button type="button" onClick={openInstall} className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] px-3 text-left">
            <Download className="size-4 text-[#D9FF91]" />
            <span className="min-w-0 flex-1"><span className="block text-[0.65rem] font-black text-white">Instalar o app</span><span className="mt-0.5 block text-[0.52rem] text-white/35">Adicionar o Trajeto à tela inicial</span></span>
            <ExternalLink className="size-3.5 text-white/20" />
          </button>
        </div>
      </section>
    </div>
  );
}
