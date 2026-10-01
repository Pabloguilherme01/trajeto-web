import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { applyServiceWorkerUpdate, pwaUpdateEvent } from "@/lib/pwa";

export default function PwaUpdatePrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const show = () => setAvailable(true);
    window.addEventListener(pwaUpdateEvent, show);
    return () => window.removeEventListener(pwaUpdateEvent, show);
  }, []);

  if (!available) return null;

  const update = () => {
    setAvailable(false);
    void applyServiceWorkerUpdate();
  };

  return (
    <aside className="fixed inset-x-3 bottom-[max(5.6rem,calc(5rem+env(safe-area-inset-bottom)))] z-[70] md:bottom-4 md:left-auto md:max-w-sm" role="status" aria-live="polite" aria-label="Atualização disponível">
      <div className="flex items-center gap-3 rounded-2xl border border-[#C7FF3C]/25 bg-[#121B22]/95 p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]">
          <RefreshCw className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">Nova versão disponível</p>
          <p className="mt-0.5 text-xs leading-5 text-white/70">Atualize para receber correções e melhorias do Trajeto.</p>
        </div>
        <button type="button" onClick={update} className="min-h-11 shrink-0 rounded-xl bg-[#C7FF3C] px-3 text-xs font-black text-[#0B1014]">
          Atualizar
        </button>
        <button type="button" onClick={() => setAvailable(false)} aria-label="Fechar aviso de atualização" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
