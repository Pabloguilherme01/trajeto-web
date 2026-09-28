import React from "react";
import { Accessibility, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { accessibilityPreferenceEvent, getAccessibilityPreferences, resetAccessibilityPreferences, setAccessibilityPreferences, updateAccessibilityPreference, type AccessibilityPreferences } from "@/lib/accessibilityPreferences";
import { setEconomyMode } from "@/lib/mobilePreferences";
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

  useEffect(()=>{
    const openFromApp=()=>setOpen(true);
    window.addEventListener(OPEN_ACCESSIBILITY_EVENT, openFromApp);
    return()=>window.removeEventListener(OPEN_ACCESSIBILITY_EVENT, openFromApp);
  },[]);

  useEffect(()=>{
    const refresh=()=>setPrefs(getAccessibilityPreferences());
    window.addEventListener(accessibilityPreferenceEvent,refresh);
    return()=>window.removeEventListener(accessibilityPreferenceEvent,refresh);
  },[]);

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
      <button type="button" onClick={()=>setOpen(true)} aria-label="Abrir acessibilidade" className="fixed right-3 top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-white/15 bg-[#121B22]/95 p-3 text-[#C7FF3C] shadow-xl backdrop-blur md:grid place-items-center">
        <Accessibility className="size-5"/>
      </button>
      <button type="button" onClick={()=>setOpen(true)} aria-label="Abrir acessibilidade" className="fixed bottom-[calc(5.9rem+env(safe-area-inset-bottom))] right-3 z-50 grid size-11 place-items-center rounded-full border border-white/15 bg-[#121B22]/95 text-[#C7FF3C] shadow-xl backdrop-blur md:hidden">
        <Accessibility className="size-5"/>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="accessibility-title" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
          <section className="mx-auto mt-auto max-h-[90vh] max-w-lg overflow-auto rounded-3xl border border-white/15 bg-[#0F171D] p-4 shadow-2xl sm:mt-10 sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div><p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]">Acesso rápido</p><h2 id="accessibility-title" className="mt-1 text-xl font-extrabold text-white">Acessibilidade e modo de uso</h2><p className="mt-1 text-xs text-[#8FA3AC]">Preferências ficam neste aparelho e podem ser alteradas a qualquer momento.</p></div>
              <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar acessibilidade" className="grid size-11 place-items-center rounded-xl border border-white/10 text-white"><X className="size-5"/></button>
            </header>

            <div className="mt-5">
              <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-[#7F919A]">Modos prontos</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:false,highContrast:false,reduceMotion:true,compactMode:true});setEconomyMode(true);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Economia<span className="mt-0.5 block text-[0.58rem] font-normal text-[#8FA3AC]">menos dados e blocos</span></button>
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:true,highContrast:true,reduceMotion:false,compactMode:false});setEconomyMode(false);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Leitura<span className="mt-0.5 block text-[0.58rem] font-normal text-[#8FA3AC]">texto e contraste</span></button>
                <button type="button" onClick={()=>{setAccessibilityPreferences({largeText:false,highContrast:false,reduceMotion:true,compactMode:false});setEconomyMode(false);setPrefs(getAccessibilityPreferences());}} className="min-h-14 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-left text-xs font-bold text-white">Condução<span className="mt-0.5 block text-[0.58rem] font-normal text-[#8FA3AC]">menos movimento</span></button>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[0.05] px-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#C7FF3C] text-[#0B1014] text-sm font-black">●</span>
                <span><strong className="block text-sm text-white">Modo escuro</strong><span className="text-xs text-[#8FA3AC]">Interface noturna otimizada para leitura e uso no celular.</span></span>
              </div>
              {options.map(item=>(
                <button key={item.key} type="button" aria-pressed={prefs[item.key]} onClick={()=>update(item.key)} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-left">
                  <span><strong className="block text-sm text-white">{item.label}</strong><span className="text-xs text-[#8FA3AC]">{item.detail}</span></span>
                  <span className={prefs[item.key] ? "grid size-7 shrink-0 place-items-center rounded-full bg-[#C7FF3C] text-[#0B1014]" : "grid size-7 shrink-0 place-items-center rounded-full border border-white/20"}>{prefs[item.key] && <Check className="size-4"/>}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={()=>{resetAccessibilityPreferences();setPrefs(getAccessibilityPreferences());}} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-[#B8C7CE]"><RotateCcw className="size-4"/>Restaurar padrão</button>
          </section>
        </div>
      )}
    </>
  );
}
