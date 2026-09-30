import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import FuelTools from "@/components/FuelTools";

export default function Tools() {
  const [, setLocation] = useLocation();
  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
      <div className="container max-w-2xl pt-4 sm:pt-8">
        <button type="button" onClick={() => setLocation(appUrl("/"))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/8 px-3 text-[0.58rem] font-black text-white/60">
          <ArrowLeft className="size-4" /> Início
        </button>
        <header className="mt-5">
          <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Ferramentas</p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-[-.05em]">Calculadora de abastecimento</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/40">Cálculos locais para combustível e custo estimado da viagem.</p>
        </header>
        <div className="mt-5"><FuelTools /></div>
      </div>
    </main>
  );
}
