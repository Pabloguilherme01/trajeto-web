import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { pwaUpdateEvent } from "@/lib/pwa";

export function isAppleMobileDevice() {
  const ua = navigator.userAgent || "";
  const classicIOS = /iphone|ipad|ipod/i.test(ua);
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIOS || iPadDesktopMode;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const handler = (value: Event) => {
      value.preventDefault?.();
      setEvent(value as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const hideForUpdate = () => setVisible(false);
    window.addEventListener(pwaUpdateEvent, hideForUpdate);

    let dismissedUntil = 0;
    try { dismissedUntil = Number(localStorage.getItem("trajeto-install-dismissed-until") || "0"); } catch {}
    if (dismissedUntil > Date.now()) return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener(pwaUpdateEvent, hideForUpdate);
    };
    if (isAppleMobileDevice()) setVisible(true);
    window.addEventListener("beforeinstallprompt", handler);
    const installed = () => { setVisible(false); setEvent(null); };
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener(pwaUpdateEvent, hideForUpdate);
    };
  }, []);

  const isIOS = isAppleMobileDevice();
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (isStandalone || (!event && !isIOS) || !visible) return null;

  const install = async () => {
    if (!event || installing) return;
    setInstalling(true);
    setFeedback("");
    try {
      await event.prompt();
      await event.userChoice;
      setEvent(null);
      setVisible(false);
    } catch {
      setFeedback("A instalação não abriu. Use o menu do navegador para adicionar o Trajeto à tela inicial.");
    } finally { setInstalling(false); }
  };

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5.6rem_+_env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-[1.35rem] border border-[#C7FF3C]/20 bg-[#0D151A]/96 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,.5)] backdrop-blur-2xl md:bottom-4" aria-label="Instalar Trajeto">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#C7FF3C] text-[#0B1014]">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Baixe o Trajeto no celular</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A9BAC2]">
            Instale como aplicativo para abrir mais rápido e continuar acessando o que já foi salvo mesmo sem conexão.
          </p>
          {isIOS && !event && <p className="mt-2 text-xs font-semibold text-[#DFFF9D]">No iPhone: Compartilhar → Adicionar à Tela de Início.</p>}
          {event && <button type="button" onClick={install} disabled={installing} className="mt-3 min-h-11 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014] disabled:opacity-60 active:scale-[.98]">{installing ? "Abrindo instalação…" : "Instalar app"}</button>}
          {feedback && <p role="status" className="mt-2 text-xs leading-relaxed text-[#DFFF9D]">{feedback}</p>}
        </div>
        <button type="button" onClick={() => { setVisible(false); try { localStorage.setItem("trajeto-install-dismissed-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch {} }} className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 text-[#9FB0B8]" aria-label="Fechar aviso de instalação">
          <X className="size-4" />
        </button>
      </div>
    </aside>
  );
}
