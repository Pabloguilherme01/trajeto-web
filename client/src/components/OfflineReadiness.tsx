import { useEffect, useState } from "react";
import { CheckCircle2, HardDrive, RefreshCw, WifiOff } from "lucide-react";
import { formatStorageBytes, getOfflineStorageStatus, requestOfflineStoragePersistence, type OfflineStorageStatus } from "@/lib/offlineStorageStatus";
import {
  getOfflineReadiness,
  offlinePackageReadyEvent,
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
  const [storageStatus, setStorageStatus] = useState<OfflineStorageStatus | null>(null);
  const [requestingPersistence, setRequestingPersistence] = useState(false);
  const check = async () => {
    setChecking(true);
    try {
      setReady(await getOfflineReadiness());
      setStorageStatus(await getOfflineStorageStatus());
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
  const keepOfflineData = async () => {
    setRequestingPersistence(true);
    try {
      const granted = await requestOfflineStoragePersistence();
      setFeedback(granted
        ? "O navegador aceitou manter os dados offline com proteção reforçada contra limpeza automática."
        : "O navegador não garantiu armazenamento persistente. As rotas continuam salvas normalmente.");
      setStorageStatus(await getOfflineStorageStatus());
    } finally {
      setRequestingPersistence(false);
    }
  };
  useEffect(() => {
    void check();
    const refresh = () => {
      void check();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener(offlinePackageReadyEvent, refresh);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener(offlinePackageReadyEvent, refresh);
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
                    "O app já abre com o essencial. Em conexão adequada, o restante é preparado em segundo plano; em rede lenta ou economia de dados, use Preparar acesso offline."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            A instalação inicial fica leve para abrir e atualizar rápido no celular.
            Em uma conexão adequada, o Trajeto completa o pacote offline depois que
            a tela já está utilizável, com downloads limitados para reduzir picos. Em
            rede lenta ou economia de dados, a preparação completa fica sob seu
            controle. Busca, serviços públicos, contatos, postos, ruas locais e rotas
            salvas ficam disponíveis quando o pacote termina. Mapas externos, trânsito
            atualizado e destinos ainda não preparados continuam dependendo de
            conexão; ligações precisam de rede telefônica.
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
          {storageStatus && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
              <div className="flex items-center gap-2 font-bold text-white"><HardDrive className="size-4" /> Armazenamento offline</div>
              <p className="mt-2">{storageStatus.routeCount} rota(s) preparada(s) · {formatStorageBytes(storageStatus.usageBytes)} usados{storageStatus.quotaBytes !== null ? " de " + formatStorageBytes(storageStatus.quotaBytes) : ""}.</p>
              {storageStatus.storageRisk === "high" && <p className="mt-1 text-[#FFB86B]">Pouco espaço disponível. Remova rotas antigas antes de preparar novas viagens.</p>}
              {storageStatus.persisted === false && (
                <button type="button" disabled={requestingPersistence} onClick={() => void keepOfflineData()} className="mt-3 min-h-11 rounded-xl border border-white/20 px-3 py-2 font-bold text-white disabled:opacity-60">
                  {requestingPersistence ? "Solicitando…" : "Manter dados offline neste aparelho"}
                </button>
              )}
            </div>
          )}
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
