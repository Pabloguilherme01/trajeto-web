import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Trajeto</p>
            <h2 className="mb-3 mt-3 text-xl font-bold">Algo saiu do esperado.</h2>
            <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              A tela encontrou um erro inesperado. Seus dados salvos no servidor não foram apagados.
              Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
