/**
 * LEGACY — Shell NELVYON OS en Vite (interino). Oficial: Next apps/web /os/* (Fase 2A).
 * @see docs/PHASE_2A_OS_SHELL.md
 */
import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD}d`;
}

import {
  LayoutDashboard, Users, FolderKanban, Hammer,
  ShieldCheck, ShieldAlert, HardDrive, Settings, Menu, X, LogOut, Zap, Gauge,
  Crown, Bell, Server, Database, Cpu, Wifi, ChevronRight, Bot, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/theme-engine";

interface DashboardLayoutProps {
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

const navItems: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { divider: true, label: "Producción" },
  { path: "/clients", icon: Users, label: "Clientes" },
  { path: "/projects", icon: FolderKanban, label: "Proyectos" },
  { path: "/generator", icon: Hammer, label: "Generador N", badge: "N" },
  { path: "/automation", icon: Zap, label: "Automatización", badge: "NEW" },
  { path: "/agents", icon: Bot, label: "Agentes Internos", badge: "ELITE" },
  { divider: true, label: "Web & Hosting" },
  { path: "/web-agent", icon: Globe, label: "Web Agent ATLAS", badge: "🌐" },
  { path: "/hosting-agent", icon: Globe, label: "Hosting Agent", badge: "AUTO" },
  { divider: true, label: "Calidad" },
  { path: "/qa", icon: ShieldCheck, label: "QA Engine" },
  { path: "/quality", icon: Gauge, label: "Calidad Servicios" },
  { divider: true, label: "Seguridad" },
  { path: "/saas/cybersecurity", icon: ShieldAlert, label: "Ciberseguridad", badge: "🛡️" },
  { divider: true, label: "Sistema" },
  { path: "/assets", icon: HardDrive, label: "Assets & Media" },
  { path: "/settings", icon: Settings, label: "Configuración" },
];

export default function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isDemo, user } = useAuth();
  const { colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; time: string; type: string }>>([]);

  // Load real notifications from recent activities
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@metagptx/web-sdk");
        const c = createClient();
        const res = await c.entities.activities.query({ sort: "-created_at", limit: 5 });
        if (cancelled) return;
        const raw = res?.data as unknown as { items?: Array<{ id: number; description?: string; activity_type?: string; created_at?: string }> };
        const items = raw?.items || [];
        if (items.length > 0) {
          setNotifications(items.map((a, i) => ({
            id: a.id || i,
            text: a.description || a.activity_type || "Actividad reciente",
            time: a.created_at ? formatTimeAgo(new Date(a.created_at)) : "",
            type: "info",
          })));
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[Dashboard] Failed to load notifications:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: colors.background }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: colors.sidebarBg,
          borderRight: `1px solid ${colors.sidebarBorder}`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg relative"
            style={{ background: `linear-gradient(135deg, ${colors.logoGradientStart}, ${colors.logoGradientEnd})` }}
          >
            <span className="text-white font-black text-lg tracking-tighter relative z-10">N</span>
            <div
              className="absolute -inset-0.5 rounded-xl opacity-20 blur-sm"
              style={{ background: `linear-gradient(135deg, ${colors.logoGradientStart}, ${colors.logoGradientEnd})` }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: colors.textPrimary }}>NELVYON OS</h1>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>
              {isDemo ? "Modo Demo" : "Sistema Privado v3.0"}
            </p>
          </div>
        </div>

        {/* Demo badge */}
        {isDemo && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium text-amber-300">Modo Demo Activo</span>
            </div>
            <p className="text-[10px] text-amber-400/60 mt-0.5">{user?.email}</p>
          </div>
        )}

        {/* System Health */}
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg shrink-0" style={{ backgroundColor: hexToRgba(colors.success, 0.05), border: `1px solid ${hexToRgba(colors.success, 0.1)}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.success }} />
              <span className="text-[9px] font-medium" style={{ color: colors.success }}>SISTEMA ONLINE</span>
            </div>
            <div className="flex items-center gap-1">
              {[Server, Database, Cpu, Wifi].map((Icon, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <Icon className="w-2 h-2" style={{ color: colors.textMuted }} />
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.success }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item, i) => {
            if (item.divider) {
              return (
                <div key={i} className="pt-4 pb-1.5 px-3">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>{item.label}</span>
                </div>
              );
            }
            const isActive = location.pathname === item.path;
            const Icon = item.icon!;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path!); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border"
                style={{
                  backgroundColor: isActive ? colors.sidebarActiveBg : "transparent",
                  color: isActive ? colors.sidebarTextActive : colors.sidebarText,
                  borderColor: isActive ? hexToRgba(colors.primary, 0.2) : "transparent",
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
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto text-[8px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: item.badge === "AUTO" ? hexToRgba(colors.success, 0.2) :
                        item.badge === "N" ? hexToRgba(colors.primary, 0.2) :
                        item.badge === "NEW" ? hexToRgba(colors.success, 0.2) :
                        hexToRgba(colors.info, 0.2),
                      color: item.badge === "AUTO" ? colors.success :
                        item.badge === "N" ? colors.primary :
                        item.badge === "NEW" ? colors.success :
                        colors.info,
                    }}
                  >{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1 shrink-0" style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={() => navigate("/saas")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border border-transparent"
            style={{ color: colors.info }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(colors.info, 0.1); }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black" style={{ backgroundColor: hexToRgba(colors.info, 0.2), color: colors.info }}>N</span>
            <span>Ir a NELVYON SaaS</span>
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{ color: colors.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.error; e.currentTarget.style.backgroundColor = hexToRgba(colors.error, 0.1); }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDemo ? "Salir del Demo" : "Cerrar Sesión"}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 backdrop-blur-xl"
          style={{
            backgroundColor: colors.headerBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
          }}
        >
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
              {sidebarOpen ? <X className="w-5 h-5" style={{ color: colors.textSecondary }} /> : <Menu className="w-5 h-5" style={{ color: colors.textSecondary }} />}
            </button>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>{title}</h2>
              {subtitle && <p className="text-xs" style={{ color: colors.textMuted }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono hidden md:block" style={{ color: colors.textMuted }}>
              {currentTime.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <div className="hidden md:flex items-center gap-1">
              {[{ icon: Server, label: "API" }, { icon: Database, label: "DB" }, { icon: Cpu, label: "N" }].map(s => (
                <div key={s.label} className="flex items-center gap-0.5" title={s.label}>
                  <s.icon className="w-2.5 h-2.5" style={{ color: colors.textMuted }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.success }} />
                </div>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
                <Bell className="w-4 h-4" style={{ color: colors.textMuted }} />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[6px] text-white font-bold flex items-center justify-center" style={{ backgroundColor: colors.primary }}>{notifications.length}</div>
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: colors.card, border: `1px solid ${colors.borderHover}` }}>
                  <div className="p-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <span className="text-xs font-semibold" style={{ color: colors.textPrimary }}>Notificaciones</span>
                    <span className="text-[9px]" style={{ color: colors.primary }}>{notifications.length} nuevas</span>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${hexToRgba(colors.textPrimary, 0.02)}` }}>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: n.type === "success" ? colors.success : colors.info }} />
                        <div>
                          <p className="text-[11px]" style={{ color: colors.textPrimary }}>{n.text}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: colors.textMuted }}>{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isDemo && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">DEMO</span>
            )}
            <span
              className="text-[10px] px-2 py-1 rounded-md"
              style={{
                color: colors.textMuted,
                backgroundColor: hexToRgba(colors.primary, 0.1),
                border: `1px solid ${hexToRgba(colors.primary, 0.2)}`,
              }}
            >OS v3.0</span>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}