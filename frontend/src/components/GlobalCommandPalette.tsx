import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, LayoutDashboard, Users, FileText, Share2, HeadphonesIcon,
  Target, Workflow, BarChart3, Settings, Globe, Megaphone, Calendar,
  MessageSquare, Phone, CreditCard, Database, Palette, BookOpen,
  Bot, Layers, Rocket, Zap, ShieldAlert, Handshake, Heart,
  ArrowRight, Command, Hash, Clock, Star, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { hexToRgba } from "@/lib/theme-engine";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  path: string;
  category: string;
  keywords: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Core
  { id: "home", label: "Inicio", description: "Resumen claro del workspace", icon: LayoutDashboard, path: "/saas/home", category: "Principal", keywords: ["inicio", "home", "resumen", "workspace"] },
  { id: "dashboard", label: "Métricas", description: "Gráficos y KPIs detallados", icon: BarChart3, path: "/saas/dashboard", category: "Principal", keywords: ["dashboard", "panel", "métricas", "gráficos"] },
  { id: "global-dash", label: "Resumen ejecutivo", description: "Vista agregada del workspace actual", icon: Globe, path: "/saas/global-dashboard", category: "Principal", keywords: ["global", "revenue", "kpi", "ejecutivo"] },
  { id: "onboarding", label: "Onboarding", description: "Configuración inicial", icon: Rocket, path: "/saas/onboarding", category: "Principal", keywords: ["setup", "wizard", "inicio"] },
  { id: "autopilot", label: "Piloto Automático", description: "IA automatizada", icon: Zap, path: "/saas/autopilot", category: "Principal", keywords: ["auto", "ia", "ai"] },
  // Marketing
  { id: "crm", label: "CRM & Contactos", description: "Gestión de clientes", icon: Users, path: "/saas/crm", category: "Marketing & Ventas", keywords: ["contactos", "clientes", "leads"] },
  { id: "pipelines", label: "Pipelines & Deals", description: "Embudo de ventas", icon: Target, path: "/saas/pipelines", category: "Marketing & Ventas", keywords: ["deals", "ventas", "embudo", "pipeline"] },
  { id: "campaigns", label: "Campañas", description: "Campañas de marketing", icon: Megaphone, path: "/saas/campaigns", category: "Marketing & Ventas", keywords: ["marketing", "email", "campaña"] },
  { id: "funnels", label: "Funnels & Landing", description: "Páginas de captura", icon: Layers, path: "/saas/funnels", category: "Marketing & Ventas", keywords: ["funnel", "landing", "captura"] },
  { id: "social", label: "Social Media", description: "Redes sociales", icon: Share2, path: "/saas/social", category: "Marketing & Ventas", keywords: ["social", "instagram", "facebook", "twitter", "redes"] },
  // Communication
  { id: "helpdesk", label: "Helpdesk", description: "Soporte y tickets", icon: HeadphonesIcon, path: "/saas/helpdesk", category: "Comunicación", keywords: ["soporte", "ticket", "ayuda", "support"] },
  { id: "conversations", label: "Conversaciones", description: "Chat en vivo", icon: MessageSquare, path: "/saas/conversations", category: "Comunicación", keywords: ["chat", "mensajes", "conversación"] },
  { id: "calls", label: "Llamadas & VoIP", description: "Telefonía", icon: Phone, path: "/saas/calls", category: "Comunicación", keywords: ["llamada", "teléfono", "voip"] },
  // Automation
  { id: "workflows", label: "Workflows", description: "Automatizaciones", icon: Workflow, path: "/saas/workflows", category: "Automatización", keywords: ["workflow", "automatización", "flujo"] },
  { id: "bots", label: "Bots & Chatbots", description: "Asistentes IA", icon: Bot, path: "/saas/bots", category: "Automatización", keywords: ["bot", "chatbot", "asistente"] },
  { id: "calendar", label: "Calendario", description: "Eventos y citas", icon: Calendar, path: "/saas/calendar", category: "Automatización", keywords: ["calendario", "evento", "cita"] },
  // Documents
  { id: "contracts", label: "Contratos Élite", description: "Gestión de contratos", icon: FileText, path: "/saas/contracts", category: "Documentos", keywords: ["contrato", "documento", "firma"] },
  { id: "segmentation", label: "Segmentación", description: "Segmentos de datos", icon: Database, path: "/saas/segmentation", category: "Documentos", keywords: ["segmento", "datos", "filtro"] },
  // Content
  { id: "websites", label: "Websites & Builder", description: "Constructor web", icon: Globe, path: "/saas/websites", category: "Contenido", keywords: ["web", "sitio", "página", "builder"] },
  { id: "templates", label: "Templates", description: "Plantillas", icon: Palette, path: "/saas/templates", category: "Contenido", keywords: ["plantilla", "template", "diseño"] },
  { id: "blog", label: "Blog & CMS", description: "Contenido editorial", icon: BookOpen, path: "/saas/blog", category: "Contenido", keywords: ["blog", "artículo", "cms"] },
  // Business
  { id: "analytics", label: "Analytics Pro", description: "Análisis avanzado", icon: BarChart3, path: "/saas/analytics", category: "Negocio", keywords: ["analytics", "análisis", "métricas"] },
  { id: "payments", label: "Pagos & Facturas", description: "Facturación", icon: CreditCard, path: "/saas/payments", category: "Negocio", keywords: ["pago", "factura", "billing"] },
  { id: "partners", label: "Partners", description: "Programa de socios", icon: Handshake, path: "/saas/partners", category: "Negocio", keywords: ["partner", "socio", "afiliado"] },
  // System
  { id: "integrations", label: "Integraciones", description: "Conectores externos", icon: Database, path: "/saas/integrations", category: "Sistema", keywords: ["integración", "api", "conector"] },
  { id: "cybersecurity", label: "Ciberseguridad", description: "Seguridad avanzada", icon: ShieldAlert, path: "/saas/cybersecurity", category: "Sistema", keywords: ["seguridad", "cyber", "firewall"] },
  { id: "settings", label: "Configuración", description: "Ajustes de cuenta", icon: Settings, path: "/saas/settings", category: "Sistema", keywords: ["config", "ajustes", "preferencias"] },
  { id: "platform-health", label: "Platform Health", description: "Estado del sistema", icon: Heart, path: "/saas/platform-health", category: "Sistema", keywords: ["salud", "health", "status", "sistema"] },
];

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  // Load recent from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nelvyon_recent_nav");
      if (stored) setRecentPaths(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveRecent = useCallback((path: string) => {
    setRecentPaths(prev => {
      const next = [path, ...prev.filter(p => p !== path)].slice(0, 5);
      localStorage.setItem("nelvyon_recent_nav", JSON.stringify(next));
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent items first, then popular
      const recentItems = recentPaths
        .map(p => COMMAND_ITEMS.find(i => i.path === p))
        .filter(Boolean) as CommandItem[];
      const rest = COMMAND_ITEMS.filter(i => !recentPaths.includes(i.path)).slice(0, 8);
      return [...recentItems, ...rest];
    }
    const q = query.toLowerCase();
    return COMMAND_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q)) ||
      item.keywords.some(k => k.includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }, [query, recentPaths]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cmd-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback((item: CommandItem) => {
    saveRecent(item.path);
    navigate(item.path);
    onOpenChange(false);
  }, [navigate, onOpenChange, saveRecent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }, [filtered, selectedIndex, handleSelect, onOpenChange]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => onOpenChange(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${hexToRgba(colors.secondary, 0.15)}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <Search className="w-5 h-5 shrink-0" style={{ color: colors.textMuted }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar módulos, acciones, páginas..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
            style={{ color: colors.textPrimary }}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.06), color: colors.textMuted }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Hash className="w-8 h-8 mx-auto mb-2" style={{ color: colors.textMuted }} />
              <p className="text-sm" style={{ color: colors.textMuted }}>No se encontraron resultados</p>
              <p className="text-xs mt-1" style={{ color: hexToRgba(colors.textMuted, 0.6) }}>Intenta con otro término</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    {!query.trim() && recentPaths.length > 0 && items.some(i => recentPaths.includes(i.path))
                      ? "Recientes"
                      : category}
                  </span>
                </div>
                {items.map(item => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  const isRecent = recentPaths.includes(item.path);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-cmd-item
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-100",
                      )}
                      style={{
                        backgroundColor: isSelected ? hexToRgba(colors.secondary, 0.1) : "transparent",
                        color: isSelected ? colors.secondary : colors.textPrimary,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? hexToRgba(colors.secondary, 0.15)
                            : hexToRgba(colors.textPrimary, 0.04),
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {isRecent && !query.trim() && (
                            <Clock className="w-3 h-3 shrink-0" style={{ color: colors.textMuted }} />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] truncate" style={{ color: colors.textMuted }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 shrink-0" style={{ color: colors.secondary }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.06), color: colors.textMuted }}>↑↓</kbd>
              <span className="text-[10px]" style={{ color: colors.textMuted }}>Navegar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: hexToRgba(colors.textPrimary, 0.06), color: colors.textMuted }}>↵</kbd>
              <span className="text-[10px]" style={{ color: colors.textMuted }}>Abrir</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" style={{ color: colors.textMuted }} />
            <span className="text-[10px]" style={{ color: colors.textMuted }}>NELVYON Command</span>
          </div>
        </div>
      </div>
    </div>
  );
}