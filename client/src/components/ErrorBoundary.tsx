import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Link } from "wouter";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#0B1014] px-4 py-10 text-white">
          <section role="alert" aria-labelledby="app-error-title" className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#121B22] p-7 text-center shadow-2xl sm:p-10">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#FF7D6A]/10 text-[#FFAA9C]">
              <AlertTriangle size={26} aria-hidden="true" />
            </div>
            <p className="mt-5 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-[#3DE3FF]">Trajeto</p>
            <h1 id="app-error-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em]">Algo saiu do esperado.</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#A5B5BC]">
              Esta tela encontrou um erro inesperado. Tente recarregar ou volte ao início para continuar sua consulta.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-5 py-2.5 font-bold text-[#0B1014] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DE3FF]">
                <RotateCcw size={16} aria-hidden="true" /> Recarregar
              </button>
              <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 font-bold text-white transition hover:border-[#3DE3FF] hover:text-[#3DE3FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DE3FF]">
                <Home size={16} aria-hidden="true" /> Voltar ao início
              </Link>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
