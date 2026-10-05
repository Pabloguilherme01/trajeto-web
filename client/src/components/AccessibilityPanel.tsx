import React from "react";
import { Accessibility, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { accessibilityPreferenceEvent, getAccessibilityPreferences, resetAccessibilityPreferences, setAccessibilityPreferences, updateAccessibilityPreference, type AccessibilityPreferences } from "@/lib/accessibilityPreferences";
import { setEconomyMode } from "@/lib/mobilePreferences";
import { clearLocalAppData, countLocalAppData, exportLocalAppData, localDataEvent } from "@/lib/localData";
import { OPEN_ACCESSIBILITY_EVENT } from "@/components/DailyCommandCenter";

const options: Array<{key:keyof AccessibilityPreferences; label:string; detail:string}> = [
  { key:"largeText", label:"Texto maior", detail:"Aumenta a leitura sem alterar os dados." },
  { key:"highContrast", label:"Alto contraste", detail:"Reforça bordas, foco e separação visual." },
  { key:"reduceMotion", label:"Menos movimento", detail:"Reduz transições e animações." },
  { key:"compactMode", label:"Modo compacto", detail:"Reduz blocos repetidos para priorizar ações." },
];

export default function AccessibilityPanel() {
  const [open,setOpen]=useState(false);
  const [prefs,setPrefs]=useState<AccessibilityPreferences>(()=>getAccessibilityPreferences());
  const [localDataCount,setLocalDataCount]=useState(0);
  const [clearingData,setClearingData]=useState(false);
  const [clearStep,setClearStep]=useState<"idle"|"confirm"|"done"|"error">("idle");
  const [backupStatus,setBackupStatus]=useState<"idle"|"done"|"error">("idle");
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const openPanel = () => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setOpen(true); };
  const closePanel = () => setOpen(false);

  useEffect(()=>{
    const openFromApp=()=>openPanel();
    window.addEventListener(OPEN_ACCESSIBILITY_EVENT, openFromApp);
    return()=>window.removeEventListener(OPEN_ACCESSIBILITY_EVENT, openFromApp);
  },[]);

  useEffect(()=>{
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      document.getElementById("accessibility-close")?.focus();
    }, 0);
    const onKeyDown=(event: KeyboardEvent)=>{
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter(element => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return()=>{
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  },[open]);

  useEffect(()=>{
    let active = true;
    const refresh=()=>setPrefs(getAccessibilityPreferences());
    const refreshLocalData=()=>{
      void countLocalAppData().then(count=>{ if (active) setLocalDataCount(count); });
    };
    refreshLocalData();
    window.addEventListener(accessibilityPreferenceEvent,refresh);
    window.addEventListener(localDataEvent,refreshLocalData);
    window.addEventListener("focus",refreshLocalData);
    return()=>{
      active = false;
      window.removeEventListener(accessibilityPreferenceEvent,refresh);
      window.removeEventListener(localDataEvent,refreshLocalData);
      window.removeEventListener("focus",refreshLocalData);
    };
  },[]);

  useEffect(()=>{
    if (!open) return;
    void countLocalAppData().then(setLocalDataCount);
  },[open]);

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle("a11y-large",prefs.largeText);
    root.classList.toggle("a11y-contrast",prefs.highContrast);
    root.classList.toggle("a11y-reduced-motion",prefs.reduceMotion);
    root.classList.toggle("a11y-compact",prefs.compactMode);
  },[prefs]);

  const update=(key:keyof AccessibilityPreferences)=>{
    updateAccessibilityPreference(key,!prefs[key]);
    setPrefs(prev=>({...prev,[key]:!prev[key]}));
  };

  return (
    <>
      <button type="button" onClick={openPanel} aria-label="Abrir acessibilidade" className="fixed right-3 top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-white/15 bg-card/95 p-3 text-primary shadow-xl backdrop-blur md:grid place-items-center">
        <Accessibility className="size-5"/>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="accessibility-title" onMouseDown={e=>{if(e.target===e.currentTarget)closePanel()}}>
          <section ref={panelRef} className="mx-auto mt-auto max-h-[90vh] max-w-lg overflow-auto rounded-3xl border border-white/15 bg-card p-4 shadow-2xl sm:mt-10 sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div><p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-primary">Acesso rápido</p><h2 id="accessibility-title" className="mt-1 text-xl font-extrabold text-white">Acessibilidade e modo de uso</h2><p className="mt-1 text-xs text-muted-foreground">Preferências ficam neste aparelho e podem ser alteradas a qualquer momento.</p></div>
              <button type="button" id="accessibility-close" onClick={closePanel} aria-label="Fechar acessibilidade" className="grid size-11 place-items-center rounded-xl border border-white/10 text-white"><X className="size-5"/></button>
            </header>

            <div className="mt-5">
              <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Modos prontos</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:false,highContrast:false,reduceMotion:true,compactMode:true});setEconomyMode(true);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Economia<span className="mt-0.5 block text-[0.58rem] font-normal text-muted-foreground">menos dados e blocos</span></button>
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:true,highContrast:true,reduceMotion:false,compactMode:false});setEconomyMode(false);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Leitura<span className="mt-0.5 block text-[0.58rem] font-normal text-muted-foreground">texto e contraste</span></button>
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:false,highContrast:false,reduceMotion:true,compactMode:false});setEconomyMode(false);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Condução<span className="mt-0.5 block text-[0.58rem] font-normal text-muted-foreground">menos movimento</span></button>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.05] px-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-black">●</span>
                <span><strong className="block text-sm text-white">Modo escuro</strong><span className="text-xs text-muted-foreground">Interface noturna otimizada para leitura e uso no celular.</span></span>
              </div>
              {options.map(item=>(
                <button key={item.key} type="button" aria-pressed={prefs[item.key]} onClick={()=>update(item.key)} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-left">
                  <span><strong className="block text-sm text-white">{item.label}</strong><span className="text-xs text-muted-foreground">{item.detail}</span></span>
                  <span className={prefs[item.key] ? "grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" : "grid size-7 shrink-0 place-items-center rounded-full border border-white/20"}>{prefs[item.key] && <Check className="size-4"/>}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={()=>{resetAccessibilityPreferences();setPrefs(getAccessibilityPreferences());}} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-muted-foreground"><RotateCcw className="size-4"/>Restaurar padrão</button>
              <div className="mt-3">
                <button type="button" onClick={()=>setBackupStatus(exportLocalAppData() ? "done" : "error")} className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-extrabold text-white">Exportar backup local</button>
                {backupStatus === "done" && <p role="status" className="mt-2 text-[0.68rem] font-bold text-primary">Backup criado no aparelho. Ele inclui preferências e atalhos do armazenamento local; rotas offline ficam fora deste arquivo.</p>}
                {backupStatus === "error" && <p role="alert" className="mt-2 text-[0.68rem] font-bold text-destructive">Não foi possível criar o backup neste navegador.</p>}
              </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-white">Dados deste aparelho</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{localDataCount ? `${localDataCount} registro${localDataCount === 1 ? "" : "s"} local${localDataCount === 1 ? "" : "is"} do Trajeto. Nada disso é enviado por esta ação.` : "Nenhum dado local do Trajeto está salvo neste aparelho."}</p>
                </div>
              </div>
              {(clearStep === "idle" || clearStep === "error") && <button type="button" onClick={()=>setClearStep("confirm")} className="mt-3 min-h-11 w-full rounded-xl border border-destructive/25 bg-destructive/[.05] px-4 text-xs font-extrabold text-destructive">Limpar dados do Trajeto neste aparelho</button>}
              {clearStep === "confirm" && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={clearingData} onClick={()=>{void (async()=>{setClearingData(true);try {await clearLocalAppData();resetAccessibilityPreferences();setLocalDataCount(await countLocalAppData());setPrefs(getAccessibilityPreferences());setClearStep("done");} catch {setClearStep("error");} finally {setClearingData(false);}})()}} className="min-h-11 rounded-xl bg-destructive px-4 text-xs font-extrabold text-destructive-foreground disabled:opacity-50">{clearingData ? "Limpando…" : "Confirmar limpeza"}</button>
                <button type="button" onClick={()=>setClearStep("idle")} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-bold text-white">Cancelar</button>
              </div>}
              {clearStep === "error" && <p role="alert" className="mt-3 text-xs text-destructive">Não foi possível apagar todos os dados. O navegador bloqueou parte da limpeza. Tente novamente.</p>}
              {clearStep === "done" && <div role="status" className="mt-3 rounded-xl border border-primary/20 bg-primary/[.05] px-3 py-2 text-xs font-bold text-primary">Dados locais removidos. O Trajeto voltou ao estado inicial neste aparelho.</div>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
