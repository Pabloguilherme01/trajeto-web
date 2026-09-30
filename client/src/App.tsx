/** Trajeto — app shell mobile-first. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, type ReactNode } from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallAppPrompt from "./components/InstallAppPrompt";
import MobileBottomNav from "./components/MobileBottomNav";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import AccessibilityPanel from "./components/AccessibilityPanel";
import SiteNavigation from "./components/SiteNavigation";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Planner = lazy(() => import("./pages/Planner"));
const Operations = lazy(() => import("./pages/Operations"));
const Stations = lazy(() => import("./pages/Stations"));
const Help = lazy(() => import("./pages/Help"));


const routerBase = import.meta.env.BASE_URL === "/"
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, "");

function RouteLoading() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[70dvh] place-items-center bg-[#0B1014] px-5 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#121B22] p-5">
        <div className="size-2 animate-pulse rounded-full bg-[#C7FF3C]" />
        <p className="mt-4 text-sm font-black">Abrindo o Trajeto…</p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">Carregando somente a tela necessária.</p>
      </div>
    </div>
  );
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user || user.role !== "admin") return <NotFound />;
  return <>{children}</>;
}

function Router() {
  return (
    <WouterRouter base={routerBase}>
      <Suspense fallback={<RouteLoading />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/planejar" component={Planner} />
          <Route path="/rota" component={Planner} />
          <Route path="/salvos"><Planner /></Route>
          <Route path="/operacoes"><AdminOnly><Operations /></AdminOnly></Route>
          <Route path="/postos" component={Stations} />
          <Route path="/buscar" component={Stations} />
          <Route path="/ajuda" component={Help} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <InstallAppPrompt />
          <PwaUpdatePrompt />
          <AccessibilityPanel />
          <SiteNavigation />
          <MobileBottomNav />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
