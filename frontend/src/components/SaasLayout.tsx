import { ReactNode, useState, useEffect, useCallback, Suspense, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { hexToRgba } from "@/lib/theme-engine";
import { PLANS } from "@/lib/plans";
import PageTransition from "@/components/PageTransition";
import { SkeletonDashboard } from "@/components/SkeletonCards";
import {
  LayoutDashboard, Users, BarChart3, HeadphonesIcon,
  ShoppingCart, Trophy, Swords, Menu, X, LogOut,
  Crown, Mail, Calendar, Megaphone, Globe,
  FileText, Workflow, Phone, MessageSquare, Palette,
  Database, Share2, CreditCard, Target, Layers, Settings, ShieldAlert,
  PieChart, Rocket, BookOpen, Server, Cpu,
  Handshake, Bot, Clapperboard, Zap, Lock, UserCog, Activity, Heart,
  Search, WifiOff, QrCode, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SaasAgentChat from "@/components/saas/SaasAgentChat";
import NotificationCenter from "@/components/NotificationCenter";
import WorkspaceSelector from "@/components/WorkspaceSelector";
import HealthBadge from "@/components/HealthBadge";
import GlobalCommandPalette from "@/components/GlobalCommandPalette";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useDocumentTitle } from "@/hooks/use-document-title";

interface SaasLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

interface NavItem {
  path?: string;
  icon?: React.ElementType;
  label: string;
  divider?: boolean;
  badge?: string;
}

const allNavItems: NavItem[] = [
  { path: "/saas/home", icon: LayoutDashboard, label: "Inicio" },
  { path: "/saas/dashboard", icon: BarChart3, label: "Métricas" },
  { path: "/saas/global-dashboard", icon: Globe, label: "Resumen ejecutivo", badge: "NEW" },
  { path: "/saas/onboarding", icon: Rocket, label: "Onboarding", badge: "NEW" },
  { path: "/saas/autopilot", icon: Zap, label: "Piloto Automático", badge: "IA" },
  { divider: true, label: "Marketing & Ventas" },
  { path: "/saas/crm", icon: Users, label: "CRM & Contactos" },
  { path: "/saas/pipelines", icon: Target, label: "Pipelines & Deals" },
  { path: "/saas/email-marketing", icon: Mail, label: "Email Marketing" },
  { path: "/saas/campaigns", icon: Megaphone, label: "Campañas" },
  { path: "/saas/funnels", icon: Layers, label: "Funnels & Landing" },
  { path: "/saas/social", icon: Share2, label: "Social Media" },
  { path: "/saas/video-ads", icon: Clapperboard, label: "Video Ads Studio" },
  { divider: true, label: "Comunicación" },
  { path: "/saas/helpdesk", icon: HeadphonesIcon, label: "Helpdesk" },
  { path: "/saas/conversations", icon: MessageSquare, label: "Conversaciones" },
  { path: "/saas/calls", icon: Phone, label: "Llamadas & VoIP" },
  { divider: true, label: "Automatización" },
  { path: "/saas/workflows", icon: Workflow, label: "Workflows" },
  { path: "/saas/bots", icon: Bot, label: "Bots & Chatbots" },
  { path: "/saas/agents-marketplace", icon: Bot, label: "Agentes SaaS", badge: "16" },
  { path: "/saas/calendar", icon: Calendar, label: "Calendario" },
  { divider: true, label: "Documentos & Datos" },
  { path: "/saas/contracts", icon: FileText, label: "Contratos Élite" },
  { path: "/saas/pdf-generator", icon: FileText, label: "PDF Generator" },
  { path: "/saas/presentations", icon: Layers, label: "Presentaciones" },
  { path: "/saas/segmentation", icon: Database, label: "Segmentación" },
  { divider: true, label: "Contenido & Web" },
  { path: "/saas/websites", icon: Globe, label: "Websites & Builder" },
  { path: "/saas/templates", icon: Palette, label: "Templates", badge: "∞" },
  { path: "/saas/forms", icon: FileText, label: "Forms & Surveys" },
  { path: "/saas/blog", icon: BookOpen, label: "Blog & CMS" },
  { divider: true, label: "Negocio" },
  { path: "/saas/pricing", icon: CreditCard, label: "Planes & Precios", badge: "💳" },
  { path: "/saas/sales", icon: ShoppingCart, label: "Ventas & Pricing" },
  { path: "/saas/payments", icon: CreditCard, label: "Pagos & Facturas" },
  { path: "/saas/analytics", icon: BarChart3, label: "Analytics Pro" },
  { path: "/saas/reports", icon: PieChart, label: "Reportes" },
  { divider: true, label: "Partners" },
  { path: "/saas/partners", icon: Handshake, label: "Programa Partners" },
  { divider: true, label: "Creación" },
  { path: "/saas/qr-studio", icon: QrCode, label: "QR Studio Pro", badge: "NEW" },
  { path: "/saas/app-creator", icon: Smartphone, label: "App Creator", badge: "NEW" },
  { divider: true, label: "Herramientas" },
  { path: "/saas/benchmark", icon: Trophy, label: "Benchmark" },
  { path: "/saas/comparison", icon: BarChart3, label: "Comparativa" },
  { path: "/saas/vs-ghl", icon: Swords, label: "vs GHL" },
  { path: "/saas/integrations", icon: Database, label: "Integraciones" },
  { divider: true, label: "Seguridad" },
  { path: "/saas/cybersecurity", icon: ShieldAlert, label: "Ciberseguridad" },
  { divider: true, label: "Cuenta" },
  { path: "/saas/tenant-settings", icon: Lock, label: "Tenant & Multi-tenant", badge: "NEW" },
  { path: "/saas/billing", icon: CreditCard, label: "Mi Plan & Facturación" },
  { path: "/saas/settings", icon: Settings, label: "Configuración" },
];

/** Hook: efficient clock that only updates every 30s (not 1s) */
function useClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/** Memoized status indicators to avoid re-renders */
const StatusDots = memo(function StatusDots({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="hidden md:flex items-center gap-1">
      {[{ icon: Server, label: "API" }, { icon: Database, label: "DB" }, { icon: Cpu, label: "Engine" }].map(s => (
        <div key={s.label} className="flex items-center gap-0.5" title={s.label}>
          <s.icon className="w-2.5 h-2.5" style={{ color: colors.textMuted }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
        </div>
      ))}
    </div>
  );
});

export default function SaasLayout({ title, subtitle, children }: SaasLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isSuperAdmin, canAccessRoute, currentPlan } = useAuth();
  const {
    needsWorkspaceSelection,
    error: workspaceError,
    loading: workspaceLoading,
  } = useWorkspace();
  const { colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const currentTime = useClock();
  const isOnline = useNetworkStatus();
  useDocumentTitle(title);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate("/saas");
  }, [logout, navigate]);

  // Filter nav items based on user's plan
  const filteredNavItems = (() => {
    if (isSuperAdmin) return allNavItems;

    const allowed: NavItem[] = [];
    let lastWasDivider = false;

    for (const item of allNavItems) {
      if (item.divider) {
        if (!lastWasDivider) {
          allowed.push(item);
          lastWasDivider = true;
        }
        continue;
      }
      if (item.path && canAccessRoute(item.path)) {
        lastWasDivider = false;
        allowed.push(item);
      }
    }

    while (allowed.length > 0 && allowed[allowed.length - 1].divider) allowed.pop();
    while (allowed.length > 0 && allowed[0].divider) allowed.shift();
    return allowed.filter((item, i) => {
      if (item.divider && i > 0 && allowed[i - 1].divider) return false;
      return true;
    });
  })();

  const plan = PLANS[currentPlan];

  const workspaceGatePaths = ["/saas/global-dashboard", "/saas/onboarding", "/saas/tenant-settings"];
  const allowWithoutWorkspace = workspaceGatePaths.some((p) =>
    location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  const blockChildrenForWorkspace =
    Boolean(user) &&
    needsWorkspaceSelection &&
    !workspaceLoading &&
    !allowWithoutWorkspace;

  // Notifications are now handled by the NotificationCenter component

  // Keyboard shortcut: Cmd+K / Ctrl+K for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      // Escape closes sidebar on mobile
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: colors.background }}>
      {/* Skip to main content — Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-purple-600 focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        Ir al contenido principal
      </a>

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: colors.sidebarBg,
          borderRight: `1px solid ${hexToRgba(colors.secondary, 0.06)}`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg relative"
            style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}
          >
            <span className="text-white font-black text-lg tracking-tighter relative z-10">N</span>
            <div
              className="absolute -inset-0.5 rounded-xl opacity-20 blur-sm"
              style={{ background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})` }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: colors.textPrimary }}>NELVYON SaaS</h1>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>
              {isSuperAdmin ? "Super Admin" : `Plan ${plan.name}`}
            </p>
          </div>
        </div>

        {/* Plan Badge */}
        <div className="mx-3 mt-3 shrink-0">
          {isSuperAdmin ? (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium text-amber-300">Super Admin — Control Total</span>
              </div>
              <p className="text-[10px] text-amber-400/60 mt-0.5">{user?.email}</p>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg border" style={{ backgroundColor: `${plan.color}08`, borderColor: `${plan.color}20` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{plan.icon}</span>
                <span className="text-[11px] font-medium" style={{ color: plan.color }}>Plan {plan.name}</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>{user?.email}</p>
            </div>
          )}
        </div>

        {/* Workspace Selector */}
        <WorkspaceSelector />

        {/* System Health — Live Badge */}
        <div className="mx-3 mt-2 shrink-0">
          <HealthBadge />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin" aria-label="Menú de módulos">
          {filteredNavItems.map((item, i) => {
            if (item.divider) {
              return (
                <div key={`div-${i}`} className="pt-4 pb-1.5 px-3" role="separator">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>{item.label}</span>
                </div>
              );
            }
            const isActive = location.pathname === item.path;
            const Icon = item.icon!;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path!)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                style={{
                  backgroundColor: isActive ? hexToRgba(colors.secondary, 0.1) : "transparent",
                  color: isActive ? colors.secondary : colors.sidebarText,
                  borderColor: isActive ? hexToRgba(colors.secondary, 0.2) : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = colors.textSecondary;
                    e.currentTarget.style.backgroundColor = hexToRgba(colors.textPrimary, 0.02);
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = colors.sidebarText;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold"
                    aria-label={`Badge: ${item.badge}`}
                    style={{
                      backgroundColor: item.badge === "PRONTO"
                        ? hexToRgba(colors.warning, 0.15)
                        : item.badge === "NEW"
                          ? hexToRgba(colors.success, 0.2)
                          : hexToRgba(colors.info, 0.2),
                      color: item.badge === "PRONTO"
                        ? colors.warning
                        : item.badge === "NEW"
                          ? colors.success
                          : colors.info,
                    }}
                  >{item.badge}</span>
                )}
              </button>
            );
          })}

          {/* Admin Panel — Only for Super Admin */}
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Administración</span>
              </div>
              {[
                { path: "/saas/admin", label: "Gestión Usuarios", icon: UserCog },
                { path: "/saas/agents-internal", label: "Agentes Internos", icon: Bot },
                { path: "/saas/system-logs", label: "System Logs", icon: Activity },
                { path: "/saas/platform-health", label: "Platform Health", icon: Heart },
              ].map(adminItem => (
                <button
                  key={adminItem.path}
                  onClick={() => navigate(adminItem.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border"
                  style={{
                    backgroundColor: location.pathname === adminItem.path ? hexToRgba(colors.warning, 0.1) : "transparent",
                    color: location.pathname === adminItem.path ? colors.warning : colors.sidebarText,
                    borderColor: location.pathname === adminItem.path ? hexToRgba(colors.warning, 0.2) : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (location.pathname !== adminItem.path) {
                      e.currentTarget.style.color = colors.warning;
                      e.currentTarget.style.backgroundColor = hexToRgba(colors.warning, 0.05);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== adminItem.path) {
                      e.currentTarget.style.color = colors.sidebarText;
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <adminItem.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{adminItem.label}</span>
                  <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: hexToRgba(colors.warning, 0.2), color: colors.warning }}>ADMIN</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1 shrink-0" style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            aria-label="Cerrar sesión"
            style={{ color: colors.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.error; e.currentTarget.style.backgroundColor = hexToRgba(colors.error, 0.1); }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-64" id="main-content" role="main">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 backdrop-blur-xl"
          role="banner"
          aria-label="Barra superior"
          style={{
            backgroundColor: colors.headerBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label={sidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-5 h-5" style={{ color: colors.textSecondary }} aria-hidden="true" /> : <Menu className="w-5 h-5" style={{ color: colors.textSecondary }} aria-hidden="true" />}
            </button>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>{title}</h2>
              {subtitle && <p className="text-xs" style={{ color: colors.textMuted }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all hover:ring-1"
              style={{
                backgroundColor: hexToRgba(colors.textPrimary, 0.04),
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Buscar...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono ml-2" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.08) }}>
                ⌘K
              </kbd>
            </button>
            <span className="text-[10px] font-mono hidden md:block" style={{ color: colors.textMuted }}>
              {currentTime}
            </span>
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                <WifiOff className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400 font-medium">Offline</span>
              </div>
            )}
            <StatusDots colors={colors} />
            <NotificationCenter />
            {isSuperAdmin && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">ADMIN</span>
            )}
            {!isSuperAdmin && (
              <span
                className="text-[10px] px-2 py-1 rounded-md border font-bold"
                style={{ color: plan.color, backgroundColor: `${plan.color}15`, borderColor: `${plan.color}30` }}
              >{plan.icon} {plan.name}</span>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 pb-20 lg:pb-6">
          <Suspense fallback={<SkeletonDashboard />}>
            <PageTransition>
              {blockChildrenForWorkspace ? (
                <div
                  className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-8 text-center max-w-lg mx-auto"
                  role="alert"
                >
                  <p className="text-amber-100 font-semibold">Selecciona o crea un workspace</p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Los datos del CRM, pipeline y helpdesk están aislados por cuenta. Elige un workspace arriba o crea uno nuevo para continuar.
                  </p>
                  {workspaceError && (
                    <p className="text-xs text-red-400 mt-3">{workspaceError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/saas/onboarding")}
                    className="mt-6 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium"
                  >
                    Ir a onboarding
                  </button>
                </div>
              ) : (
                children
              )}
            </PageTransition>
          </Suspense>
        </div>
      </main>

      {/* Global Nelvyon Agent Assistant */}
      <SaasAgentChat />

      {/* Global Command Palette (Cmd+K) */}
      <GlobalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuToggle={() => setSidebarOpen(prev => !prev)} />
    </div>
  );
}