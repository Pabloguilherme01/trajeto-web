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
    <aside className="fixed inset-x-3 bottom-[calc(5.6rem_+_env(safe-area-inset-bottom))] z-[70] md:bottom-4 md:left-auto md:max-w-sm" role="status" aria-live="polite" aria-label="Atualização disponível">
      <div className="rounded-2xl border border-[#B7D86B]/25 bg-[#141E23]/95 p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#B7D86B] text-[#0D1418]">
            <RefreshCw className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug">Nova versão disponível</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">Atualize para receber correções e melhorias do Trajeto.</p>
          </div>
          <button type="button" onClick={() => setAvailable(false)} aria-label="Fechar aviso de atualização" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={update} className="mt-3 min-h-11 w-full rounded-xl bg-[#B7D86B] px-3 text-sm font-bold text-[#0D1418]">
          Atualizar agora
        </button>
      </div>
    </aside>
  );
}
