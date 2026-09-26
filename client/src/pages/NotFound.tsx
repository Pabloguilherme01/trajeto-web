import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-[#0B1014] px-4 py-10 text-[#EAF0F2]">
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-[#121B22] p-7 text-center shadow-2xl sm:p-10" aria-labelledby="not-found-title">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#3DE3FF]">Trajeto</p>
          <p className="mt-5 font-display text-7xl font-semibold tracking-[-0.08em] text-[#C7FF3C]">404</p>
          <h1 id="not-found-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em] text-white">Página não encontrada.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#A5B5BC]">
            A página que você tentou abrir não existe ou foi movida. Volte ao início para continuar sua consulta.
          </p>
          <Button asChild className="mt-7 min-h-11 bg-[#C7FF3C] px-5 text-sm font-extrabold text-[#0B1014] hover:bg-white">
            <Link href="/"><ArrowLeft className="mr-2 size-4" />Voltar ao início</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
