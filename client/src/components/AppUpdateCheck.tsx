import { useState } from "react";
import { applyServiceWorkerUpdate, checkForAppUpdate } from "@/lib/pwa";

export default function AppUpdateCheck() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const check = async () => {
    setBusy(true);
    setMessage("Verificando a versão do aplicativo…");
    try {
      const status = await checkForAppUpdate();
      if (status === "available") {
        setMessage("Ativando a nova versão…");
        if (!await applyServiceWorkerUpdate()) setMessage("A nova versão ainda não foi ativada. Tente novamente.");
      } else {
        setMessage({ current: "Você está com a versão mais recente disponível.", offline: "Conecte-se à internet para verificar atualizações.", unsupported: "A atualização do aplicativo não está disponível neste navegador. Abra o site com internet.", pending: "A nova versão ainda está sendo preparada. Tente novamente em alguns instantes." }[status]);
      }
    } catch { setMessage("Não foi possível verificar a atualização. Confira sua conexão e tente novamente."); }
    finally { setBusy(false); }
  };
  return <section className="mt-4 rounded-[1.4rem] border border-[#C7FF3C]/20 bg-[#121B22] p-5" aria-labelledby="app-update-title">
    <h2 id="app-update-title" className="text-base font-black">Atualizar o aplicativo instalado</h2>
    <p className="mt-2 text-sm leading-relaxed text-white/75">Se o aplicativo da tela inicial mostrar uma tela antiga, verifique a atualização com internet. Ao ativar uma nova versão, a tela será recarregada e os campos em edição precisarão ser preenchidos novamente. Favoritos e rotas salvas continuam no aparelho.</p>
    <button type="button" onClick={() => void check()} disabled={busy} className="mt-3 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:opacity-60">{busy ? "Verificando…" : "Verificar e atualizar aplicativo"}</button>
    <p role="status" className="mt-2 text-sm leading-relaxed text-white/75">{message}</p>
  </section>;
}
