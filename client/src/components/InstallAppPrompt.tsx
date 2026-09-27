import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (value: Event) => {
      value.preventDefault?.();
      setEvent(value as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const dismissedUntil = Number(localStorage.getItem("trajeto-install-dismissed-until") || "0");
    if (dismissedUntil > Date.now()) return () => window.removeEventListener("beforeinstallprompt", handler);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) setVisible(true);
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (isStandalone || (!event && !isIOS) || !visible) return null;

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const result = await event.userChoice;
    setEvent(null);
    setVisible(result.outcome !== "accepted");
  };

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/15 bg-[#121B22]/95 p-4 text-white shadow-2xl backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]" aria-label="Instalar Trajeto">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Baixe o Trajeto no celular</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A9BAC2]">
            Instale como aplicativo para abrir mais rápido e continuar acessando o que já foi salvo mesmo sem conexão.
          </p>
          {isIOS && !event && <p className="mt-2 text-xs font-semibold text-[#DFFF9D]">No iPhone: Compartilhar → Adicionar à Tela de Início.</p>}
          {event && <button type="button" onClick={install} className="mt-3 min-h-11 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014]">Instalar app</button>}
        </div>
        <button type="button" onClick={() => { setVisible(false); try { localStorage.setItem("trajeto-install-dismissed-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch {} }} className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-[#9FB0B8]" aria-label="Fechar aviso de instalação">
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
