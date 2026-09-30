import { CheckCircle2, Download, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { downloadOfflinePack, getOfflinePackStatus } from "@/lib/offlinePack";
import { vibration } from "@/lib/mobileTools";

export default function OfflinePackCard() {
  const [status, setStatus] = useState(getOfflinePackStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const prepare = async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const next = await downloadOfflinePack();
      setStatus(next);
      setMessage("Pacote local preparado neste aparelho.");
      vibration(14);
    } catch {
      setMessage("Não foi possível preparar o pacote agora. As referências essenciais já continuam disponíveis quando carregadas pelo app.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-3 rounded-[1.55rem] border border-[#3DE3FF]/15 bg-[#0E171D] p-3.5 sm:p-4" aria-labelledby="offline-pack-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/[.08] text-[#3DE3FF]">
          {status ? <CheckCircle2 className="size-4" /> : <WifiOff className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Preparar para viagem</p>
          <h2 id="offline-pack-title" className="mt-1 text-sm font-black">
            {status ? "Pacote local pronto" : "Baixar pacote local"}
          </h2>
          <p className="mt-1 text-[0.56rem] leading-relaxed text-white/38">
            Guarda a interface principal e os dados locais de postos para consulta sem internet. A malha viária e o trânsito não são baixados como se fossem dados atuais.
          </p>
          {status && (
            <p className="mt-2 text-[0.48rem] font-bold text-white/28">
              {status.resources} recurso(s) preparados · {new Date(status.downloadedAt).toLocaleString("pt-BR")}
            </p>
          )}
          {message && (
            <p className="mt-2 text-[0.55rem] font-bold text-[#C7FF3C]" role="status" aria-live="polite">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void prepare()}
          disabled={loading}
          className="mobile-action-icon shrink-0 border-white/8 bg-white/[.025] text-white/60 disabled:opacity-40"
          aria-label={status ? "Atualizar pacote local" : "Baixar pacote local"}
        >
          {loading ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
        </button>
      </div>
    </section>
  );
}
