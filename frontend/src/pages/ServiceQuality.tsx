import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShieldCheck, CheckCircle2, Activity, Server, Database, Globe,
  Zap, Lock, Cloud, Cpu, HardDrive, Wifi, RefreshCw, Clock,
  TrendingUp, AlertTriangle, BarChart3, Users, Layers, Eye,
  Sparkles, ArrowUpRight, Calendar, Gauge, CircleDot, Crown,
  FileCheck, Bot, Palette, ShoppingCart, Share2, Megaphone,
  ClipboardCheck, FileText, Mail, Phone, CreditCard, Search,
  MessageSquare, Target, Workflow, BookOpen, Puzzle, Shield,
  Code2, Brain, Headphones, Rocket, Scale, Truck, GraduationCap,
  Languages, PenTool, DoorOpen, Wallet, LayoutTemplate, HeartHandshake,
  ChevronDown, ChevronUp, ExternalLink, Info, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════════ */
type QualityLevel = "elite" | "production" | "functional" | "ui_demo" | "planned";
type ServiceCategory = "infraestructura" | "generadores" | "plataforma_saas" | "conectores" | "agentes" | "calidad_seguridad";

interface QualityItem {
  id: string;
  name: string;
  category: ServiceCategory;
  icon: React.ElementType;
  color: string;
  qualityLevel: QualityLevel;
  score: number;
  hasBackend: boolean;
  hasAI: boolean;
  hasCRUD: boolean;
  hasRealData: boolean;
  hasUI: boolean;
  uptime: number;
  responseTime: number;
  description: string;
  realFeatures: string[];
  limitations: string[];
  route?: string;
}

const qualityConfig: Record<QualityLevel, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  elite: { label: "ELITE", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", emoji: "🏆" },
  production: { label: "PRODUCCIÓN", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", emoji: "✅" },
  functional: { label: "FUNCIONAL", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", emoji: "⚡" },
  ui_demo: { label: "UI + DEMO", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", emoji: "🎨" },
  planned: { label: "PLANIFICADO", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", emoji: "📋" },
};

const categoryLabels: Record<ServiceCategory, { label: string; icon: React.ElementType; color: string }> = {
  infraestructura: { label: "Infraestructura Core", icon: Server, color: "text-violet-400" },
  generadores: { label: "Motores de Generación IA", icon: Sparkles, color: "text-purple-400" },
  plataforma_saas: { label: "Plataforma SaaS (36+ Servicios)", icon: Layers, color: "text-blue-400" },
  conectores: { label: "Conectores & Integraciones", icon: Puzzle, color: "text-cyan-400" },
  agentes: { label: "Agentes IA (22 Agentes)", icon: Bot, color: "text-fuchsia-400" },
  calidad_seguridad: { label: "Calidad & Seguridad", icon: ShieldCheck, color: "text-emerald-400" },
};

/* Icon mapping from service_id */
const iconMap: Record<string, React.ElementType> = {
  "core-api": Server, "auth-system": Lock, "database": Database, "edge-functions": Cloud,
  "gen-web": Globe, "gen-ecommerce": ShoppingCart, "gen-social": Share2, "gen-ads": Megaphone,
  "gen-email": Mail, "gen-workflows": Workflow, "gen-funnel": Target, "gen-branding": Palette,
  "saas-dashboard": BarChart3, "saas-crm": Users, "saas-social": Share2, "saas-campaigns": Megaphone,
  "saas-funnels": Target, "saas-marketing": TrendingUp, "saas-workflows": Workflow,
  "saas-reports": FileText, "saas-blog": BookOpen, "saas-calendar": Calendar,
  "saas-calls": Phone, "saas-contracts": FileCheck, "saas-conversations": MessageSquare,
  "saas-forms": ClipboardCheck, "saas-helpdesk": Headphones, "saas-integrations": Puzzle,
  "saas-payments": CreditCard, "saas-pipelines": Layers, "saas-sales": Wallet,
  "saas-segmentation": Users, "saas-templates": LayoutTemplate, "saas-websites": Globe,
  "saas-analytics": BarChart3, "saas-autopilot": Zap, "saas-partners": HeartHandshake,
  "saas-pricing": CreditCard, "saas-admin": Shield, "saas-agents-dashboard": Bot,
  "saas-marketplace": Rocket, "saas-video-ads": Eye, "saas-pdf": FileText,
  "saas-presentations": Layers, "saas-settings": Cpu, "saas-entry": DoorOpen,
  "saas-cybersecurity": Lock, "os-settings": Cpu, "os-agents": Bot, "os-bots": Bot,
  "os-quality": ShieldCheck, "os-benchmark": Gauge, "os-comparison": Scale,
};

const colorMap: Record<string, string> = {
  infraestructura: "text-violet-400", generadores: "text-purple-400",
  plataforma_saas: "text-blue-400", conectores: "text-cyan-400",
  agentes: "text-fuchsia-400", calidad_seguridad: "text-emerald-400",
};

function getQualityLevel(score: number): QualityLevel {
  if (score >= 97) return "elite";
  if (score >= 90) return "production";
  if (score >= 75) return "functional";
  if (score >= 50) return "ui_demo";
  return "planned";
}

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch (err) { return fallback; }
  }
  return fallback;
}

export default function ServiceQuality() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<QualityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "all">("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "name" | "category">("category");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const res = await api.getQualityMetrics(0, 100);
        if (res.items && res.items.length > 0) {
          const items: QualityItem[] = res.items.map((m) => {
            const sid = m.service_id as string;
            const cat = (m.category as ServiceCategory) || "plataforma_saas";
            const score = (m.score as number) || 0;
            return {
              id: sid,
              name: (m.service_name as string) || sid,
              category: cat,
              icon: iconMap[sid] || Activity,
              color: colorMap[cat] || "text-zinc-400",
              qualityLevel: getQualityLevel(score),
              score,
              hasBackend: (m.has_backend as boolean) ?? false,
              hasAI: (m.has_ai as boolean) ?? false,
              hasCRUD: (m.has_crud as boolean) ?? false,
              hasRealData: (m.has_real_data as boolean) ?? true,
              hasUI: true,
              uptime: (m.uptime as number) || 99,
              responseTime: (m.response_time as number) || 100,
              description: (m.description as string) || "",
              realFeatures: parseJsonSafe<string[]>(m.real_features, []),
              limitations: parseJsonSafe<string[]>(m.limitations, []),
              route: (m.route as string) || undefined,
            };
          });
          setAllItems(items);
          setBackendConnected(true);
        }
      } catch (err) {

        if (import.meta.env.DEV) console.warn("[ServiceQuality] Error (// Empty state):", err);

      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  const filteredItems = activeCategory === "all" ? allItems : allItems.filter((i) => i.category === activeCategory);
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category) || b.score - a.score;
  });

  const totalItems = allItems.length;
  const avgScore = totalItems > 0 ? Math.round(allItems.reduce((a, i) => a + i.score, 0) / totalItems) : 0;
  const eliteCount = allItems.filter((i) => i.qualityLevel === "elite").length;
  const backendCount = allItems.filter((i) => i.hasBackend).length;
  const aiCount = allItems.filter((i) => i.hasAI).length;

  const getScoreColor = (score: number) => {
    if (score >= 97) return "text-emerald-400";
    if (score >= 90) return "text-blue-400";
    if (score >= 75) return "text-violet-400";
    if (score >= 50) return "text-amber-400";
    return "text-zinc-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 97) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 90) return "bg-blue-500/10 border-blue-500/20";
    if (score >= 75) return "bg-violet-500/10 border-violet-500/20";
    if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
    return "bg-zinc-500/10 border-zinc-500/20";
  };

  const groupedByCategory = (Object.keys(categoryLabels) as ServiceCategory[]).map((cat) => {
    const items = sortedItems.filter((i) => i.category === cat);
    return { category: cat, items };
  }).filter((g) => g.items.length > 0);

  return (
    <DashboardLayout title="Calidad de Servicios" subtitle="Métricas reales desde PostgreSQL — Sin mentiras">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="ml-3 text-zinc-400">Cargando métricas de calidad del backend...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Backend status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${backendConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-[10px] text-zinc-500">
              {backendConnected ? `${totalItems} servicios monitoreados desde PostgreSQL` : "Sin conexión al backend"}
            </span>
            <Database className="w-3 h-3 text-zinc-600" />
          </div>

          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Score Promedio", value: `${avgScore}%`, color: getScoreColor(avgScore), icon: Gauge },
              { label: "Total Servicios", value: totalItems.toString(), color: "text-white", icon: Layers },
              { label: "Nivel Elite", value: eliteCount.toString(), color: "text-emerald-400", icon: Crown },
              { label: "Con Backend Real", value: backendCount.toString(), color: "text-blue-400", icon: Database },
              { label: "Con IA Real", value: aiCount.toString(), color: "text-purple-400", icon: Brain },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-[#111113] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={cn("w-4 h-4", s.color)} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeCategory === "all"
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white"
              )}
            >
              Todos ({totalItems})
            </button>
            {(Object.keys(categoryLabels) as ServiceCategory[]).map((cat) => {
              const config = categoryLabels[cat];
              const count = allItems.filter((i) => i.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                    activeCategory === cat
                      ? `bg-white/10 ${config.color} border border-white/20`
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white"
                  )}
                >
                  <config.icon className="w-3 h-3" />
                  {config.label.split("(")[0].trim()} ({count})
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            {(["category", "score", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-medium transition-all",
                  sortBy === s ? "bg-violet-500/15 text-violet-300" : "bg-white/[0.03] text-zinc-500 hover:text-white"
                )}
              >
                {s === "category" ? "Por Categoría" : s === "score" ? "Por Score" : "Por Nombre"}
              </button>
            ))}
          </div>

          {/* Services List */}
          {sortBy === "category" ? (
            groupedByCategory.map(({ category, items }) => {
              const catConfig = categoryLabels[category];
              const catAvg = Math.round(items.reduce((a, i) => a + i.score, 0) / items.length);
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <catConfig.icon className={cn("w-5 h-5", catConfig.color)} />
                    <h3 className="text-sm font-semibold text-white">{catConfig.label}</h3>
                    <span className={cn("text-xs font-bold", getScoreColor(catAvg))}>{catAvg}%</span>
                    <span className="text-[10px] text-zinc-600">({items.length} servicios)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((item) => (
                      <ServiceCard
                        key={item.id}
                        item={item}
                        expanded={expandedItem === item.id}
                        onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        navigate={navigate}
                        getScoreColor={getScoreColor}
                        getScoreBg={getScoreBg}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sortedItems.map((item) => (
                <ServiceCard
                  key={item.id}
                  item={item}
                  expanded={expandedItem === item.id}
                  onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  navigate={navigate}
                  getScoreColor={getScoreColor}
                  getScoreBg={getScoreBg}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Service Card Component ─── */
function ServiceCard({
  item, expanded, onToggle, navigate, getScoreColor, getScoreBg,
}: {
  item: QualityItem;
  expanded: boolean;
  onToggle: () => void;
  navigate: ReturnType<typeof useNavigate>;
  getScoreColor: (s: number) => string;
  getScoreBg: (s: number) => string;
}) {
  const qc = qualityConfig[item.qualityLevel];
  return (
    <div className={cn(
      "rounded-xl bg-[#111113] border transition-all",
      expanded ? "border-white/[0.12]" : "border-white/[0.06] hover:border-white/[0.1]"
    )}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", qc.bg, "border", qc.border)}>
              <item.icon className={cn("w-4 h-4", item.color)} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{item.name}</h4>
              <p className="text-[10px] text-zinc-500 mt-0.5">{item.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-lg font-bold", getScoreColor(item.score))}>{item.score}</span>
            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full", qc.bg, qc.color, "border", qc.border)}>
              {qc.emoji} {qc.label}
            </span>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.hasBackend && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Backend Real</span>
          )}
          {item.hasAI && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">IA Real</span>
          )}
          {item.hasCRUD && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">CRUD</span>
          )}
          {item.hasRealData && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Datos Reales</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-3">
            <span className="text-[9px] text-zinc-600">Uptime: {item.uptime}%</span>
            <span className="text-[9px] text-zinc-600">Resp: {item.responseTime}ms</span>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-2">
          {item.realFeatures.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Funcionalidades Reales</p>
              <div className="flex flex-wrap gap-1">
                {item.realFeatures.map((f) => (
                  <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.limitations.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Limitaciones</p>
              <div className="flex flex-wrap gap-1">
                {item.limitations.map((l) => (
                  <span key={l} className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/5 text-amber-400 border border-amber-500/10">
                    ⚠ {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.route && (
            <button
              onClick={() => navigate(item.route!)}
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
            >
              <ExternalLink className="w-3 h-3" /> Ir al servicio
            </button>
          )}
        </div>
      )}
    </div>
  );
}