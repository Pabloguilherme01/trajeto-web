import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import {
  getOfflineReadiness,
  prepareOfflineAccess,
  type OfflinePreparation,
} from "@/lib/pwa";

const preparationMessages: Record<
  NonNullable<OfflinePreparation["reason"]>,
  string
> = {
  unsupported:
    "Este navegador não permitiu preparar o app. Tente abrir no Chrome ou Safari fora do modo privado.",
  preparing:
    "O conteúdo está sendo preparado. Aguarde alguns instantes; a conferência será atualizada automaticamente.",
  connection:
    "Conecte-se à internet e tente preparar novamente. Seus favoritos e rotas continuam guardados.",
  storage:
    "O aparelho está sem espaço para completar o acesso offline. Libere espaço e tente novamente.",
  update:
    "Há arquivos indisponíveis nesta versão. Use Atualizar quando o aviso aparecer e confira novamente.",
};

export default function OfflineReadiness() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const check = async () => {
    setChecking(true);
    try {
      setReady(await getOfflineReadiness());
    } catch {
      setReady(false);
      setFeedback(preparationMessages.unsupported);
    } finally {
      setChecking(false);
    }
  };
  const prepare = async () => {
    setPreparing(true);
    setFeedback("");
    try {
      const result = await prepareOfflineAccess();
      setReady(result.ready);
      if (!result.ready)
        setFeedback(preparationMessages[result.reason ?? "connection"]);
    } catch {
      setFeedback(preparationMessages.connection);
    } finally {
      setPreparing(false);
    }
  };
  useEffect(() => {
    void check();
    const refresh = () => {
      void check();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
  return (
    <section
      className="mt-4 rounded-3xl border border-white/10 bg-[#121B22] p-5"
      aria-labelledby="offline-readiness-title"
    >
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle2 className="size-5 shrink-0 text-[#C7FF3C]" />
        ) : (
          <WifiOff className="size-5 shrink-0 text-[#FFB86B]" />
        )}
        <div className="min-w-0 flex-1">
          <h2 id="offline-readiness-title" className="text-base font-bold">
            Seu Trajeto sem internet
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-sm text-white/80"
          >
            {preparing
              ? "Preparando o conteúdo para usar sem internet…"
              : checking
                ? "Conferindo o conteúdo salvo…"
                : ready
                  ? "Pronto para usar sem internet neste aparelho."
                  : feedback ||
                    "Abra o site com internet ou toque em Preparar acesso offline."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Busca, serviços públicos, contatos, postos, ruas locais e rotas salvas
            ficam disponíveis após a preparação. O novo modo Offline também
            reaproveita automaticamente a rota salva exata e pode gerar estimativas
            locais para pontos já preparados. Mapas externos, trânsito atualizado e
            destinos ainda não preparados continuam dependendo de conexão; ligações
            precisam de rede telefônica.
          </p>
          <button
            type="button"
            disabled={checking || preparing}
            onClick={() => {
              if (ready) void check();
              else void prepare();
            }}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            <RefreshCw
              className={
                "size-4 shrink-0 " +
                (preparing ? "animate-spin motion-reduce:animate-none" : "")
              }
            />
            {preparing
              ? "Preparando…"
              : ready
                ? "Conferir acesso offline"
                : "Preparar acesso offline"}
          </button>
          {ready && (
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Para testar: ative o modo avião e abra a busca ou a central de
              serviços. Volte aqui sempre que quiser conferir.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
