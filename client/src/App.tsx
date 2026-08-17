/** Design reminder: Trajeto uses a light mineral canvas with dark-petrol navigation for clear wayfinding. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { consumeStationReturn } from "@/lib/authReturn";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Planner = lazy(() => import("./pages/Planner"));
const Operations = lazy(() => import("./pages/Operations"));
const Stations = lazy(() => import("./pages/Stations"));
const Personal = lazy(() => import("./pages/Personal"));

function RouteLoading() {
  return <div className="grid min-h-[65vh] place-items-center bg-[#F7F2E8] text-[#163840]"><div className="border-l-4 border-[#FFC928] bg-white px-5 py-4 text-sm font-bold shadow-sm">Preparando sua rota…</div></div>;
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
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/planejar" component={Planner} />
        <Route path="/operacoes" component={Operations} />
        <Route path="/postos" component={Stations} />
        <Route path="/minha-conta" component={Personal} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthReturnHandler />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
