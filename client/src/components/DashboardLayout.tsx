import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { CircleUserRound, LayoutDashboard, LogOut, MapPinned, PanelLeft } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { dashboardAccessCopy, type DashboardAccessCopy } from "@/lib/dashboardAccessCopy";

const menuItems = [
  { icon: CircleUserRound, label: "Minha conta", path: "/minha-conta", adminOnly: false },
  { icon: MapPinned, label: "Planejador", path: "/planejar", adminOnly: false },
  { icon: LayoutDashboard, label: "Operações", path: "/operacoes", adminOnly: true },
] as const;

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
  accessCopy = dashboardAccessCopy,
}: {
  children: React.ReactNode;
  accessCopy?: DashboardAccessCopy;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const saved = Number.parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? "", 10);
    return Number.isFinite(saved) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, saved)) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1014] text-[#EAF0F2]">
        <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-3xl border border-white/10 bg-[#121B22] p-8">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {accessCopy.title}
            </h1>
            <p className="max-w-sm text-center text-sm text-[#91A3AD]">
              {accessCopy.description}
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full bg-[#C7FF3C] font-bold text-[#0B1014] shadow-lg transition-all hover:bg-white"
          >
              Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent sidebarWidth={sidebarWidth} setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  sidebarWidth,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-white/8 bg-[#10181F] text-[#EAF0F2]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-white/8">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3DE3FF]"
                aria-label="Abrir ou fechar navegação"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="brand-wordmark truncate text-lg font-semibold tracking-tight text-white">
                    trajeto
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.filter(item => !item.adminOnly || user?.role === "admin").map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => {
                        setLocation(item.path);
                        if (isMobile && state === "expanded") toggleSidebar();
                      }}
                      tooltip={item.label}
                      className={`h-10 rounded-lg font-normal transition-all ${isActive ? "bg-[#C7FF3C]/10 text-[#D9FF91]" : "text-[#A9BAC2] hover:bg-white/7 hover:text-white"}`}
                    >
                      <item.icon
                        className={`size-4 ${isActive ? "text-[#C7FF3C]" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/8 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3DE3FF]">
                  <Avatar className="size-9 shrink-0 border border-[#C7FF3C]/35">
                    <AvatarFallback className="bg-[#C7FF3C] text-xs font-bold text-[#0B1014]">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-[#91A3AD]">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar largura da navegação"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={isCollapsed ? -1 : 0}
          className={`absolute top-0 right-0 w-2 h-full cursor-col-resize transition-colors hover:bg-[#C7FF3C]/15 focus-visible:bg-[#C7FF3C]/20 focus-visible:outline-none ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          onKeyDown={event => {
            if (isCollapsed) return;
            const step = event.shiftKey ? 32 : 16;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSidebarWidth(Math.max(MIN_WIDTH, sidebarWidth - step));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setSidebarWidth(Math.min(MAX_WIDTH, sidebarWidth + step));
            }
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[#0B1014] text-[#EAF0F2]">
        {isMobile && (
          <div className="safe-top sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-white/8 bg-[#0B1014]/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mobile-pressable size-10 rounded-xl bg-white/8 text-white" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#C7FF3C]">trajeto</span><span className="tracking-tight text-white">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
