import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import { getOfflineReadiness } from "@/lib/pwa";

export default function OfflineReadiness() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const check = async () => {
    setChecking(true);
    setReady(await getOfflineReadiness());
    setChecking(false);
  };
  useEffect(() => {
    void check();
    const refresh = () => { void check(); };
    navigator.serviceWorker?.addEventListener("controllerchange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
  return <section className="mt-4 rounded-3xl border border-white/10 bg-[#121B22] p-5" aria-labelledby="offline-readiness-title">
    <div className="flex items-start gap-3">
      {ready ? <CheckCircle2 className="size-5 shrink-0 text-[#C7FF3C]" /> : <WifiOff className="size-5 shrink-0 text-[#FFB86B]" />}
      <div className="min-w-0 flex-1">
        <h2 id="offline-readiness-title" className="text-base font-bold">Seu Trajeto sem internet</h2>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-white/80">{checking ? "Conferindo o conteúdo salvo…" : ready ? "Pronto para usar sem internet neste aparelho." : "Abra o site com internet e aguarde a preparação automática."}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">Busca, serviços públicos, contatos, postos e rotas já salvas ficam disponíveis após a preparação. Mapas externos, novos cálculos e agendamentos precisam de internet; ligações precisam de rede telefônica.</p>
        <button type="button" disabled={checking} onClick={() => { void check(); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw className="size-4" />Conferir acesso offline</button>
      </div>
    </div>
  </section>;
}
