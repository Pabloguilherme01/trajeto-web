import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { applyServiceWorkerUpdate, hasWaitingAppUpdate, pwaUpdateEvent } from "@/lib/pwa";

export default function PwaUpdatePrompt() {
  const [available, setAvailable] = useState(hasWaitingAppUpdate);
  const [updating, setUpdating] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const show = () => setAvailable(true);
    window.addEventListener(pwaUpdateEvent, show);
    if (hasWaitingAppUpdate()) show();
    return () => window.removeEventListener(pwaUpdateEvent, show);
  }, []);

  if (!available) return null;

  const update = async () => {
    setUpdating(true);
    setFailed(false);
    try { if (!await applyServiceWorkerUpdate()) setFailed(true); }
    catch { setFailed(true); }
    finally { setUpdating(false); }
  };

  return (
    <aside className="fixed inset-x-3 bottom-[calc(11.75rem+env(safe-area-inset-bottom))] z-[70] md:bottom-4 md:left-auto md:max-w-sm" role="status" aria-live="polite" aria-label="Atualização disponível">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 text-card-foreground shadow-[0_18px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <RefreshCw className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">Nova versão disponível</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{failed ? "A atualização não foi ativada. Tente novamente ou abra Ajuda." : "Atualize para receber correções e melhorias do Trajeto."}</p>
        </div>
        <button type="button" onClick={() => void update()} disabled={updating} className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60">
          {updating ? "Atualizando…" : "Atualizar"}
        </button>
        <button type="button" onClick={() => setAvailable(false)} aria-label="Fechar aviso de atualização" className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-muted-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
