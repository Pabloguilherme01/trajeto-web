/** Trajeto prioritizes dark, high-contrast navigation and fast route decisions. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { consumeStationReturn } from "@/lib/authReturn";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallAppPrompt from "./components/InstallAppPrompt";
import MobileQuickActions from "./components/MobileQuickActions";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccessibilityPanel from "./components/AccessibilityPanel";\nimport SiteNavigation from "./components/SiteNavigation";
import Home from "./pages/Home";

const Planner = lazy(() => import("./pages/Planner"));
const Operations = lazy(() => import("./pages/Operations"));
const Stations = lazy(() => import("./pages/Stations"));
const Help = lazy(() => import("./pages/Help"));
const Personal = lazy(() => import("./pages/Personal"));

const routerBase = import.meta.env.BASE_URL === "/"
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, "");

function RouteLoading() {
  return <div role="status" aria-live="polite" className="grid min-h-[65vh] place-items-center bg-[#0B1014] text-white"><div className="border-l-4 border-[#C7FF3C] bg-[#121B22] px-5 py-4 text-sm font-bold shadow-sm">Preparando sua rota…</div></div>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user || user.role !== "admin") return <NotFound />;
  return <>{children}</>;
}

function AuthReturnHandler() {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    const returnPath = consumeStationReturn(sessionStorage, location);
    if (returnPath) setLocation(returnPath);
  }, [isAuthenticated, loading, location, setLocation]);

  return null;
}

function Router() {
  return (
    <WouterRouter base={routerBase}>
      <Suspense fallback={<RouteLoading />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/planejar" component={Planner} />\n          <Route path="/rota" component={Planner} />\n          <Route path="/salvos"><Planner /></Route>
          <Route path="/operacoes"><AdminOnly><Operations /></AdminOnly></Route>
          <Route path="/postos" component={Stations} />\n          <Route path="/buscar" component={Stations} />
          <Route path="/ajuda" component={Help} />
          <Route path="/minha-conta" component={Personal} />
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
          <MobileQuickActions />
          <AccessibilityPanel />
          <AuthReturnHandler />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
