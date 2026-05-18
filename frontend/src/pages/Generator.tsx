import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import E2EFlowBanner from "@/components/E2EFlowBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Hammer, Globe, ShoppingCart, Share2, Megaphone, ClipboardCheck,
  FileText, Loader2, CheckCircle2, Zap,
  Box, Palette, Shield, Crown, Mail, Workflow, Filter as FilterIcon,
  ChevronDown, ChevronUp, Copy, RefreshCw, XCircle,
  ScrollText, UserCog, ArrowRight, ShieldCheck
} from "lucide-react";
import { api, type NelvyonProject, type NelvyonClient, type GenerateResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildE2EUrl, parseE2EParams } from "@/lib/e2e-flow";

/* ═══════════════════════════════════════════════
   RBAC — Roles & Permissions
═══════════════════════════════════════════════ */
type Role = "Admin" | "Manager" | "Editor" | "Visor";
const ROLES: Role[] = ["Admin", "Manager", "Editor", "Visor"];

interface Permission {
  generate: boolean;
  copyResult: boolean;
  viewLogs: boolean;
  selectAllGenerators: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  Admin:   { generate: true,  copyResult: true,  viewLogs: true,  selectAllGenerators: true },
  Manager: { generate: true,  copyResult: true,  viewLogs: true,  selectAllGenerators: true },
  Editor:  { generate: true,  copyResult: true,  viewLogs: false, selectAllGenerators: false },
  Visor:   { generate: false, copyResult: true,  viewLogs: false, selectAllGenerators: false },
};

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-500/20 text-red-300 border-red-500/30",
  Manager: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Editor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Visor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

/* ═══════════════════════════════════════════════
   Audit Trail
═══════════════════════════════════════════════ */
interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  user: string;
  role: Role;
  timestamp: string;
}

/* ═══════════════════════════════════════════════
   GENERADORES — Configuración completa 100%
═══════════════════════════════════════════════ */

interface GeneratorConfig {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  quality: string;
  color: string;
  category: string;
  features: string[];
  badge?: string;
  premiumOnly?: boolean;
}

const generators: GeneratorConfig[] = [
  {
    id: "web", icon: Globe, label: "Web Premium + SEO Élite",
    desc: "Sitio web completo con el mejor SEO del mundo: Schema.org, meta tags, Open Graph, Core Web Vitals A+, sitemap XML, structured data, 3D hero elements",
    quality: "Premium", color: "from-violet-500 to-blue-500",
    category: "Web & SEO",
    features: ["Schema.org JSON-LD", "Core Web Vitals A+", "Open Graph + Twitter Cards", "Sitemap XML", "Rich Snippets", "3D Hero Elements"],
    badge: "SEO #1",
  },
  {
    id: "ecommerce", icon: ShoppingCart, label: "E-commerce + SEO Máximo",
    desc: "Tienda online premium con Product Schema, Review Schema, visor 3D de productos, AR Try-On, checkout optimizado",
    quality: "Premium", color: "from-blue-500 to-cyan-500",
    category: "Web & SEO",
    features: ["Product Schema", "Visor 3D 360°", "AR Try-On", "Rich Snippets", "Checkout optimizado", "Catálogo SEO"],
    badge: "SEO #1",
  },
  {
    id: "social", icon: Share2, label: "Social Media Total",
    desc: "Estrategia completa para TODAS las redes: Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Pinterest, Threads",
    quality: "Volumen", color: "from-pink-500 to-rose-500",
    category: "Marketing",
    features: ["Instagram Feed + Reels", "TikTok Scripts", "LinkedIn Articles", "YouTube Shorts", "Calendario editorial", "Hooks virales"],
  },
  {
    id: "ads", icon: Megaphone, label: "Ads Universales — 14+ Plataformas",
    desc: "Campañas para Meta, Google, LinkedIn, TikTok, YouTube, Pinterest, Snapchat, Spotify, Amazon, Reddit, Quora, Microsoft, Programmatic",
    quality: "Premium", color: "from-amber-500 to-orange-500",
    category: "Publicidad",
    features: ["Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "YouTube Ads", "5+ variantes creativas"],
    badge: "14+ PLATAFORMAS", premiumOnly: true,
  },
  {
    id: "email", icon: Mail, label: "Email Marketing World-Class",
    desc: "Secuencias automatizadas, A/B testing, segmentación avanzada. Open rate > 35%, CTR > 5%",
    quality: "Premium", color: "from-emerald-500 to-teal-500",
    category: "Marketing",
    features: ["Welcome Sequence", "Nurture Sequence", "A/B Testing", "Segmentación", "Automations", "Templates responsive"],
    badge: "NUEVO",
  },
  {
    id: "workflows", icon: Workflow, label: "Workflow Automation",
    desc: "Flujos de trabajo inteligentes: lead nurturing, onboarding, soporte, ventas, facturación, seguimiento",
    quality: "Volumen", color: "from-sky-500 to-blue-500",
    category: "Automatización",
    features: ["Lead Nurturing", "Onboarding", "Soporte auto", "Ventas", "Facturación", "8+ workflows"],
    badge: "NUEVO",
  },
  {
    id: "funnel", icon: FilterIcon, label: "Funnel de Venta Premium",
    desc: "Embudos completos: landing, optin, sales page, checkout, upsell, thank you. Conversion > 15%",
    quality: "Premium", color: "from-orange-500 to-red-500",
    category: "Ventas",
    features: ["Landing Page", "Sales Page", "Checkout", "Upsell/Downsell", "Email Sequence", "Retargeting"],
    badge: "NUEVO", premiumOnly: true,
  },
  {
    id: "3d", icon: Box, label: "3D & Experiencias Inmersivas",
    desc: "Elementos 3D interactivos: visores 360°, Three.js, WebGL, AR product try-on, showrooms virtuales",
    quality: "Premium", color: "from-fuchsia-500 to-purple-500",
    category: "3D & AR",
    features: ["Visor 3D 360°", "Three.js Scenes", "AR Try-On", "Showroom Virtual", "Configurador 3D", "Parallax 3D"],
    badge: "3D", premiumOnly: true,
  },
  {
    id: "branding", icon: Palette, label: "Branding 360° + 3D",
    desc: "Identidad visual completa: logo, paleta, tipografía, guía de estilo, mockups 3D, brand book, social kit",
    quality: "Premium", color: "from-rose-500 to-pink-500",
    category: "Branding",
    features: ["Logo 2D + 3D", "Paleta de colores", "Tipografía", "Brand Book", "Social Media Kit", "Mockups 3D"],
    badge: "NUEVO",
  },
  {
    id: "audit", icon: ClipboardCheck, label: "Auditoría Digital Completa",
    desc: "Auditoría 360°: SEO técnico, Core Web Vitals, accesibilidad, conversión, competencia, 3D readiness",
    quality: "Premium", color: "from-emerald-500 to-green-500",
    category: "Análisis",
    features: ["SEO Técnico", "Core Web Vitals", "Accesibilidad", "Conversión", "Competencia", "Roadmap 90 días"],
    badge: "AUDIT", premiumOnly: true,
  },
  {
    id: "proposal", icon: FileText, label: "Propuesta Comercial Pro",
    desc: "Propuesta premium: resumen ejecutivo, servicios, inversión, ROI, timeline, mockups 3D, garantías",
    quality: "Premium", color: "from-indigo-500 to-violet-500",
    category: "Ventas",
    features: ["Resumen ejecutivo", "ROI estimado", "Timeline visual", "Mockups 3D", "Garantías", "Casos de éxito"],
  },
];

type GeneratorType = "web" | "ecommerce" | "social" | "ads" | "email" | "workflows" | "funnel" | "3d" | "branding" | "audit" | "proposal";

const generateFn: Record<GeneratorType, (projectId: number) => Promise<GenerateResult>> = {
  web: (id) => api.generateWeb(id),
  ecommerce: (id) => api.generateEcommerce(id),
  social: (id) => api.generateSocial(id),
  ads: (id) => api.generateAds(id),
  email: (id) => api.generateEmailMarketing(id),
  workflows: (id) => api.generateWorkflows(id),
  funnel: (id) => api.generateFunnel(id),
  "3d": (id) => api.generateWeb(id),
  branding: (id) => api.generateBranding(id),
  audit: (id) => api.generateAudit(id),
  proposal: (id) => api.generateProposal(id),
};

const categories = ["Todos", "Web & SEO", "Marketing", "Publicidad", "Automatización", "Ventas", "3D & AR", "Branding", "Análisis"];

export default function Generator() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const e2eParams = parseE2EParams(searchParams.toString());

  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(e2eParams.client_id || null);
  const [selectedProject, setSelectedProject] = useState<number | null>(e2eParams.project_id || null);
  const [selectedGen, setSelectedGen] = useState<GeneratorType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [expandedResult, setExpandedResult] = useState(false);

  // RBAC
  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const perms = ROLE_PERMISSIONS[currentRole];

  // Audit Trail
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const addAudit = useCallback((action: string, detail: string) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      user: user?.name || user?.email || "Sistema",
      role: currentRole,
      timestamp: new Date().toLocaleString("es-ES"),
    }, ...prev].slice(0, 100));
  }, [currentRole, user]);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  const loadData = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.getClients(), api.getProjects()]);
      setClients(c.items || []);
      setProjects(p.items || []);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[Generator] Error:", err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProjects = selectedClient
    ? projects.filter((p) => p.client_id === selectedClient)
    : projects;

  const filteredGenerators = (categoryFilter === "Todos"
    ? generators
    : generators.filter((g) => g.category === categoryFilter)
  ).filter(g => {
    if (!perms.selectAllGenerators && g.premiumOnly) return false;
    return true;
  });

  const handleGenerate = async () => {
    if (!perms.generate) { toast.error("Sin permisos para generar contenido"); return; }
    if (!selectedProject || !selectedGen) {
      toast.error("Selecciona un proyecto y un generador");
      return;
    }
    setGenerating(true);
    setProgress(0);
    setResult(null);
    setError(null);

    const genConfig = generators.find(g => g.id === selectedGen);
    addAudit("GENERATE_START", `Generación iniciada: ${genConfig?.label || selectedGen} para proyecto #${selectedProject}`);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 800);

    try {
      const fn = generateFn[selectedGen];
      const res = await fn(selectedProject);
      setProgress(100);
      setResult(res);
      addAudit("GENERATE_OK", `Generación completada: ${genConfig?.label || selectedGen} — QA: ${res.qa_status}`);
      toast.success("Generación completada con éxito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error en la generación";
      setError(msg);
      addAudit("GENERATE_FAIL", `Error en generación: ${genConfig?.label || selectedGen} — ${msg}`);
      toast.error(msg);
    } finally {
      clearInterval(progressInterval);
      setGenerating(false);
    }
  };

  const copyResult = () => {
    if (!perms.copyResult) { toast.error("Sin permisos para copiar"); return; }
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      addAudit("COPY_RESULT", `Resultado copiado: Output #${result.output_id}`);
      toast.success("Contenido copiado al portapapeles");
    }
  };

  const selectedGenConfig = generators.find((g) => g.id === selectedGen);

  if (loading) return null;

  return (
    <DashboardLayout title="Generador Nelvyon" subtitle="11 generadores profesional de contenido premium">
      <div className="space-y-6">
        {/* ─── E2E Flow Banner ─── */}
        <E2EFlowBanner
          clientName={selectedClient ? clients.find(c => c.id === selectedClient)?.business_name : undefined}
          projectName={selectedProject ? projects.find(p => p.id === selectedProject)?.name : undefined}
        />

        {/* RBAC Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111113] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-zinc-400">Rol:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-violet-500/50 focus:outline-none"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Badge className={cn("text-[10px]", ROLE_COLORS[currentRole])}>{currentRole}</Badge>
            <div className="flex gap-1.5 ml-2">
              {Object.entries(perms).map(([key, val]) => (
                <span key={key} className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded border",
                  val ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border-zinc-700 line-through"
                )}>
                  {key === "generate" ? "Generar" : key === "copyResult" ? "Copiar" : key === "viewLogs" ? "Ver Logs" : "Todos Gen."}
                </span>
              ))}
            </div>
          </div>
          {perms.viewLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAudit(!showAudit)}
              className={cn("h-7 text-[10px] border-white/10", showAudit ? "bg-violet-600/20 text-violet-300" : "text-zinc-400")}
            >
              <ScrollText className="w-3 h-3 mr-1" />
              Audit Log ({auditLog.length})
            </Button>
          )}
        </div>

        {/* Audit Trail Panel */}
        {showAudit && perms.viewLogs && (
          <div className="rounded-xl bg-[#0d0d0f] border border-violet-500/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-violet-300 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Audit Trail — Generador
              </h4>
              <span className="text-[9px] text-zinc-500">{auditLog.length} registros</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.03]">
              {auditLog.length === 0 ? (
                <p className="text-xs text-zinc-600 p-4 text-center">Sin registros de auditoría</p>
              ) : auditLog.map(entry => (
                <div key={entry.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-600 w-32 shrink-0">{entry.timestamp}</span>
                  <Badge className={cn("text-[9px]", ROLE_COLORS[entry.role])}>{entry.role}</Badge>
                  <span className="text-zinc-400">{entry.user}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    entry.action.includes("FAIL") ? "bg-red-500/10 text-red-400" :
                    entry.action.includes("OK") || entry.action.includes("START") ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-blue-500/10 text-blue-400"
                  )}>{entry.action}</span>
                  <span className="text-zinc-500 truncate">{entry.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Hammer className="w-7 h-7 text-violet-400" />
              Generador World-Class
            </h1>
            <p className="text-sm text-white/50 mt-1">
              11 generadores Nelvyon premium · Supera a cualquier agencia del mundo
            </p>
          </div>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
            <Crown className="w-3 h-3 mr-1" /> 11 Generadores
          </Badge>
        </div>

        {/* Step 1: Select Client & Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium">1. Cliente</label>
            <select
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
              value={selectedClient ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setSelectedClient(v);
                setSelectedProject(null);
              }}
            >
              <option value="">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.business_name} — {c.sector}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium">2. Proyecto</label>
            <select
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-500/50 focus:outline-none"
              value={selectedProject ?? ""}
              onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Seleccionar proyecto...</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.project_type})</option>
              ))}
            </select>
            {filteredProjects.length === 0 && (
              <p className="text-xs text-amber-400/60 mt-2">
                No hay proyectos. Crea uno en la sección Proyectos.
              </p>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                categoryFilter === cat
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Step 2: Select Generator */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredGenerators.map((gen) => {
            const Icon = gen.icon;
            const isSelected = selectedGen === gen.id;
            return (
              <button
                key={gen.id}
                onClick={() => setSelectedGen(gen.id as GeneratorType)}
                className={cn(
                  "relative text-left p-4 rounded-xl border transition-all duration-200",
                  isSelected
                    ? "bg-gradient-to-br border-violet-500/50 shadow-lg shadow-violet-500/10"
                    : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                )}
                style={isSelected ? { background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))` } : {}}
              >
                {gen.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded">
                    {gen.badge}
                  </span>
                )}
                {gen.premiumOnly && (
                  <span className="absolute top-2 left-2 text-[8px] font-bold bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">
                    PREMIUM
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", gen.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white leading-tight">{gen.label}</h3>
                    <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{gen.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {gen.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-[9px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                      {gen.features.length > 3 && (
                        <span className="text-[9px] text-white/20">+{gen.features.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Generate Button */}
        {selectedGen && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {selectedGenConfig && (
                  <>
                    <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", selectedGenConfig.color)}>
                      <selectedGenConfig.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedGenConfig.label}</h3>
                      <p className="text-[10px] text-white/40">
                        Calidad: {selectedGenConfig.quality} · {selectedGenConfig.features.length} features
                      </p>
                    </div>
                  </>
                )}
              </div>
              {perms.generate ? (
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !selectedProject}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-6"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Generar</>
                  )}
                </Button>
              ) : (
                <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs">Sin permisos para generar</Badge>
              )}
            </div>

            {/* Progress */}
            {generating && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>
                    {progress < 30 ? "Analizando perfil del cliente..." :
                     progress < 60 ? "Generando contenido profesional con Nelvyon..." :
                     progress < 90 ? "Aplicando estándares de calidad premium..." :
                     "Finalizando..."}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-red-300">{error}</p>
                  {perms.generate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      className="mt-2 text-red-400 hover:text-red-300 p-0 h-auto"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Reintentar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">Generación completada</span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                      QA: {result.qa_status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {perms.copyResult && (
                      <Button variant="ghost" size="sm" onClick={copyResult} className="text-white/40 hover:text-white">
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedResult(!expandedResult)}
                      className="text-white/40 hover:text-white"
                    >
                      {expandedResult ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                      {expandedResult ? "Colapsar" : "Expandir"}
                    </Button>
                  </div>
                </div>

                <div className={cn(
                  "bg-black/30 border border-white/5 rounded-lg p-4 overflow-auto text-xs text-white/60 font-mono",
                  expandedResult ? "max-h-[600px]" : "max-h-48"
                )}>
                  <pre className="whitespace-pre-wrap">{result.content}</pre>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/30">
                  <span>Output ID: {result.output_id}</span>
                  <span>·</span>
                  <span>Tipo: {result.output_type}</span>
                </div>

                {/* ─── E2E Next Steps ─── */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider mr-1">Siguiente paso:</span>
                  <Button
                    size="sm"
                    onClick={() => navigate(buildE2EUrl("/qa", { output_id: result.output_id, project_id: selectedProject || undefined, client_id: selectedClient || undefined }))}
                    className="h-7 text-[10px] bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/20"
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" /> Validar en QA <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(buildE2EUrl("/saas/social", { content: result.content?.substring(0, 200), client_id: selectedClient || undefined, source: "generator" }))}
                    className="h-7 text-[10px] bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 border border-pink-500/20"
                  >
                    <Share2 className="w-3 h-3 mr-1" /> Publicar en Social
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(buildE2EUrl("/saas/contracts", { client_id: selectedClient || undefined, project_id: selectedProject || undefined, source: "generator" }))}
                    className="h-7 text-[10px] bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/20"
                  >
                    <FileText className="w-3 h-3 mr-1" /> Generar Contrato
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Generadores", value: "11", icon: Zap, color: "text-violet-400" },
            { label: "Plataformas Ads", value: "14+", icon: Megaphone, color: "text-amber-400" },
            { label: "Motor N", value: "Nelvyon Engine", icon: Zap, color: "text-blue-400" },
            { label: "QA Score Mín.", value: "90/100", icon: Shield, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <s.icon className={cn("w-5 h-5 mx-auto mb-1", s.color)} />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}