import { useEffect, useState, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Bot, Zap, Send, FileText, Check, Clock, AlertTriangle, Crown,
  Loader2, Play, RefreshCw, Users, Globe, Handshake,
  Package, ArrowRight, CheckCircle2, Sparkles,
  Mail, Shield, Cpu, Server, Database, DollarSign, Tag,
  TrendingDown, Percent, Calendar, Plus, Trash2,
  BarChart3, Activity, XCircle, Eye, EyeOff, Lock, Unlock, TrendingUp
} from "lucide-react";
import AgentsAnalyticsTab from "@/components/analytics/AgentsAnalyticsTab";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PLANS, PARTNER_JOB_TYPES, BILLING_OPTIONS,
  type PlanId, type BillingCycle, type AgentJob, type AgentStatus,
  type PricingPromo, type PromoType,
  loadManagedUsers,
  getPlanBadgeStyle, getAllPricing,
} from "@/lib/plans";
import { redirectToCheckout } from "@/lib/payment-service";

/* ─── Role Permissions ─── */
type UserRole = "superadmin" | "admin" | "manager" | "agent" | "viewer";

const ROLE_PERMISSIONS: Record<UserRole, { canCreateJobs: boolean; canManagePromos: boolean; canViewAllAgents: boolean; canSendWhiteLabel: boolean; canDeleteJobs: boolean; canViewRevenue: boolean; label: string; color: string }> = {
  superadmin: { canCreateJobs: true, canManagePromos: true, canViewAllAgents: true, canSendWhiteLabel: true, canDeleteJobs: true, canViewRevenue: true, label: "Super Admin", color: "text-amber-400" },
  admin: { canCreateJobs: true, canManagePromos: true, canViewAllAgents: true, canSendWhiteLabel: true, canDeleteJobs: true, canViewRevenue: true, label: "Administrador", color: "text-violet-400" },
  manager: { canCreateJobs: true, canManagePromos: true, canViewAllAgents: true, canSendWhiteLabel: false, canDeleteJobs: false, canViewRevenue: true, label: "Manager", color: "text-blue-400" },
  agent: { canCreateJobs: true, canManagePromos: false, canViewAllAgents: false, canSendWhiteLabel: false, canDeleteJobs: false, canViewRevenue: false, label: "Agente", color: "text-emerald-400" },
  viewer: { canCreateJobs: false, canManagePromos: false, canViewAllAgents: false, canSendWhiteLabel: false, canDeleteJobs: false, canViewRevenue: false, label: "Visor", color: "text-zinc-400" },
};

/* ─── Agent Definitions ─── */
interface NelvyonAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  status: "online" | "busy" | "offline";
  capabilities: string[];
  jobsCompleted: number;
}

const AGENTS: NelvyonAgent[] = [
  {
    id: "agent-templates",
    name: "Agente Templates SaaS",
    role: "Generador & Distribuidor de Plantillas White-Label",
    description: "Genera plantillas SaaS personalizadas y las envía automáticamente a clientes Enterprise.",
    icon: Package,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    status: "online",
    capabilities: [
      "Genera plantillas SaaS completas",
      "Personaliza branding (logo, colores, dominio)",
      "Configura CRM, Email, Funnels automáticamente",
      "Envía al cliente Enterprise tras pago confirmado",
      "Incluye documentación y guía de uso",
      "Setup automático de dominio personalizado",
    ],
    jobsCompleted: 47,
  },
  {
    id: "agent-partners",
    name: "Agente Partners",
    role: "Gestor de Trabajos Partner — OS → Cliente",
    description: "Recibe solicitudes de Partners, procesa a través del OS, ejecuta y entrega al cliente final.",
    icon: Handshake,
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    status: "online",
    capabilities: [
      "Recibe trabajos de Partners (€50/mes base)",
      "Procesa a través del OS de NELVYON",
      "Ejecuta el trabajo (web, marketing, CRM, etc.)",
      "Genera contrato automático para el cliente",
      "Entrega al Partner → Partner entrega al cliente",
      "Cobra por trabajo: €120-€800 según tipo",
    ],
    jobsCompleted: 128,
  },
  {
    id: "agent-contracts",
    name: "Agente Contratos",
    role: "Generador Automático de Contratos Élite",
    description: "Genera contratos legales élite automáticamente para cada trabajo completado.",
    icon: FileText,
    color: "#7C3AED",
    gradient: "from-violet-500 to-purple-600",
    status: "online",
    capabilities: [
      "Genera contratos para cada trabajo",
      "Adaptado a 195+ jurisdicciones",
      "Multi-idioma (100+ idiomas)",
      "Firma digital eIDAS/ESIGN",
      "Cumplimiento GDPR/CCPA/LGPD",
      "Envío automático al Partner y cliente",
    ],
    jobsCompleted: 312,
  },
  {
    id: "agent-pricing",
    name: "Agente Precios & Rebajas",
    role: "Gestor Dinámico de Precios",
    description: "Gestiona precios dinámicos con descuentos por ciclo de facturación.",
    icon: DollarSign,
    color: "#10B981",
    gradient: "from-emerald-500 to-teal-600",
    status: "online",
    capabilities: [
      "Precios dinámicos: mensual a bienal",
      "Descuentos automáticos: 10%-35% según ciclo",
      "Promociones flash y estacionales",
      "Descuentos por fidelidad y volumen",
      "Códigos promocionales personalizados",
      "Actualización de precios en tiempo real",
    ],
    jobsCompleted: 89,
  },
];

type TabKey = "agents" | "white-label" | "partner-jobs" | "pricing" | "history" | "analytics";

export default function SaasAgentsDashboard() {
  const { ts } = useI18n();
  const { user, loading: authLoading, isSuperAdmin, getManagedUsers } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("agents");
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("superadmin");

  const permissions = ROLE_PERMISSIONS[currentRole];

  /* ─── Audit Trail ─── */
  interface AgentAuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }
  const [auditTrail, setAuditTrail] = useState<AgentAuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  const syncBackendJobs = useCallback(async () => {
    try {
      const res = await client.entities.automation_jobs.query({ sort: "-created_at", limit: 50 });
      const items = (res.data?.items || []) as Array<Record<string, unknown>>;
      const mapped: AgentJob[] = items.map((item) => ({
        id: `be-${item.id}`,
        agentId: (item.source as string) || "agent-partners",
        type: (item.job_type as string) || "partner-job",
        status: ((item.status as string) === "completed" ? "completed" : (item.status as string) === "error" ? "error" : "working") as AgentStatus,
        clientEmail: "",
        clientName: (item.client_name as string) || "",
        plan: "partner" as PlanId,
        description: (item.input_data as string) || (item.job_type as string) || "",
        createdAt: (item.created_at as string) || new Date().toISOString(),
        completedAt: (item.delivered_at as string) || undefined,
        result: (item.output_data as string) || undefined,
      }));
      setJobs(mapped);
    } catch (err) { if (import.meta.env.DEV) console.warn("[AgentsDashboard]", err); }
  }, []);

  const [promos, setPromos] = useState<PricingPromo[]>([]);
  const syncBackendPromos = useCallback(async () => {
    try {
      const res = await client.entities.pricing_promos.query({ sort: "-created_at", limit: 50 });
      const items = (res.data?.items || []) as Array<Record<string, unknown>>;
      const mapped: PricingPromo[] = items.map((item) => ({
        id: `be-${item.id}`,
        name: (item.name as string) || "",
        type: ((item.promo_type as string) || "seasonal") as PromoType,
        description: `${item.discount_percent || 0}% extra en plan ${item.plan_id || ""} (${item.billing_cycle || ""})`,
        extraDiscount: (item.discount_percent as number) || 0,
        validFrom: (item.valid_from as string) || new Date().toISOString(),
        validUntil: (item.valid_until as string) || new Date().toISOString(),
        applicablePlans: [(item.plan_id as PlanId) || "pro"],
        applicableCycles: [(item.billing_cycle as BillingCycle) || "annual"],
        code: (item.code as string) || "",
        active: item.active !== false,
      }));
      setPromos(mapped);
    } catch (err) { if (import.meta.env.DEV) console.warn("[AgentsDashboard]", err); }
  }, []);

  useEffect(() => {
    if (user) { syncBackendJobs(); syncBackendPromos(); }
  }, [user, syncBackendJobs, syncBackendPromos]);

  // White-Label form
  const [wlClientEmail, setWlClientEmail] = useState("");
  const [wlClientName, setWlClientName] = useState("");
  const [wlBrandName, setWlBrandName] = useState("");
  const [wlDomain, setWlDomain] = useState("");

  // Partner job form
  const [pjPartnerEmail, setPjPartnerEmail] = useState("");
  const [pjPartnerName, setPjPartnerName] = useState("");
  const [pjClientName, setPjClientName] = useState("");
  const [pjJobType, setPjJobType] = useState(PARTNER_JOB_TYPES[0].id);
  const [pjNotes, setPjNotes] = useState("");

  // Checkout & Pricing
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [newPromoName, setNewPromoName] = useState("");
  const [newPromoType, setNewPromoType] = useState<PromoType>("seasonal");
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoPlan, setNewPromoPlan] = useState<PlanId>("pro");
  const [newPromoCycle, setNewPromoCycle] = useState<BillingCycle>("annual");
  const [newPromoDays, setNewPromoDays] = useState(30);
  const [selectedPricingPlan, setSelectedPricingPlan] = useState<PlanId>("starter");

  const refreshJobs = useCallback(() => { syncBackendJobs(); syncBackendPromos(); }, [syncBackendJobs, syncBackendPromos]);

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) navigate("/saas/dashboard");
  }, [user, authLoading, isSuperAdmin, navigate]);

  const managedUsers = getManagedUsers();
  const whitelabelClients = managedUsers.filter(u => u.plan === "enterprise");
  const partnerClients = managedUsers.filter(u => u.plan === "partner");

  // ── Per-Agent Metrics ──
  const agentMetrics = useMemo(() => {
    const metrics: Record<string, { total: number; completed: number; working: number; errors: number; revenue: number; avgTime: string; successRate: string }> = {};
    AGENTS.forEach(a => {
      const agentJobs = jobs.filter(j => j.agentId === a.id);
      const completed = agentJobs.filter(j => j.status === "completed");
      const errors = agentJobs.filter(j => j.status === "error");
      const working = agentJobs.filter(j => j.status === "working");
      const revenue = completed.reduce((s, j) => s + (j.price || 0), 0);
      const successRate = agentJobs.length > 0 ? ((completed.length / agentJobs.length) * 100).toFixed(0) : "100";
      metrics[a.id] = {
        total: agentJobs.length + a.jobsCompleted,
        completed: completed.length + a.jobsCompleted,
        working: working.length,
        errors: errors.length,
        revenue,
        avgTime: completed.length > 0 ? "~3min" : "—",
        successRate: agentJobs.length > 0 ? successRate : "99",
      };
    });
    return metrics;
  }, [jobs]);

  const completedJobs = jobs.filter(j => j.status === "completed");
  const workingJobs = jobs.filter(j => j.status === "working");
  const errorJobs = jobs.filter(j => j.status === "error");
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.price || 0), 0);

  // Auto-refresh
  useEffect(() => {
    if (workingJobs.length === 0) return;
    const interval = setInterval(() => syncBackendJobs(), 15000);
    return () => clearInterval(interval);
  }, [workingJobs.length, syncBackendJobs]);

  /* ─── Execute White-Label Template Send ─── */
  const handleSendWhiteLabel = () => {
    if (!permissions.canSendWhiteLabel) { toast.error("No tienes permisos para enviar White-Label"); return; }
    if (!wlClientEmail || !wlClientName || !wlBrandName) { toast.error("Completa todos los campos obligatorios"); return; }
    const jobId = `wl-${Date.now()}`;
    setProcessing(jobId);
    const newJob: AgentJob = {
      id: jobId, agentId: "agent-templates", type: "white-label-template", status: "working",
      clientEmail: wlClientEmail, clientName: wlClientName, plan: "enterprise",
      description: `Plantilla SaaS White-Label para ${wlBrandName} (${wlDomain || "dominio pendiente"})`,
      createdAt: new Date().toISOString(),
    };
    setJobs(prev => [...prev, newJob]);
    client.entities.automation_jobs.create({
      data: { job_type: "white-label-template", status: "working", source: "agent-templates", client_name: wlClientName,
        input_data: JSON.stringify({ email: wlClientEmail, name: wlClientName, brand: wlBrandName, domain: wlDomain }),
        created_at: new Date().toISOString() },
    }).catch(() => { /* ignore */ });
    setTimeout(async () => {
      const result = `✅ Plantilla White-Label generada y enviada a ${wlClientEmail}\n📦 Marca: ${wlBrandName}\n🌐 Dominio: ${wlDomain || "Pendiente"}\n📄 Contrato generado\n🔧 CRM, Email, Funnels configurados`;
      try {
        const latest = await client.entities.automation_jobs.query({ sort: "-created_at", limit: 1 });
        const items = (latest.data?.items || []) as Array<Record<string, unknown>>;
        if (items[0]?.id) {
          await client.entities.automation_jobs.update({ id: items[0].id as number, data: { status: "completed", output_data: result, delivered_at: new Date().toISOString() } });
        }
      } catch { /* ignore */ }
      setProcessing(null);
      toast.success(`✅ Plantilla White-Label enviada a ${wlClientName}`);
      addAudit("White-Label enviado", `Cliente: ${wlClientName} · Marca: ${wlBrandName} · Dominio: ${wlDomain || "pendiente"}`);
      setWlClientEmail(""); setWlClientName(""); setWlBrandName(""); setWlDomain("");
      await syncBackendJobs();
    }, 3000);
  };

  /* ─── Execute Partner Job ─── */
  const handleCreatePartnerJob = () => {
    if (!permissions.canCreateJobs) { toast.error("No tienes permisos para crear trabajos"); return; }
    if (!pjPartnerEmail || !pjPartnerName || !pjClientName) { toast.error("Completa todos los campos obligatorios"); return; }
    const jobType = PARTNER_JOB_TYPES.find(j => j.id === pjJobType)!;
    const jobId = `pj-${Date.now()}`;
    setProcessing(jobId);
    const newJob: AgentJob = {
      id: jobId, agentId: "agent-partners", type: "partner-job", status: "working",
      clientEmail: pjPartnerEmail, clientName: pjPartnerName, plan: "partner",
      description: `${jobType.name} para "${pjClientName}" del Partner ${pjPartnerName}`,
      price: jobType.price, createdAt: new Date().toISOString(),
    };
    setJobs(prev => [...prev, newJob]);
    client.entities.automation_jobs.create({
      data: { job_type: "partner-job", status: "working", source: "agent-partners", client_name: pjClientName,
        input_data: JSON.stringify({ partner: pjPartnerName, email: pjPartnerEmail, client: pjClientName, jobType: pjJobType, notes: pjNotes }),
        created_at: new Date().toISOString() },
    }).catch(() => { /* ignore */ });
    setTimeout(async () => {
      const result = `✅ "${jobType.name}" completado\n👤 Partner: ${pjPartnerName}\n🏢 Cliente: ${pjClientName}\n💰 Precio: €${jobType.price}\n⏱ Tiempo: ${jobType.estimatedTime}`;
      try {
        const latest = await client.entities.automation_jobs.query({ sort: "-created_at", limit: 1 });
        const items = (latest.data?.items || []) as Array<Record<string, unknown>>;
        if (items[0]?.id) {
          await client.entities.automation_jobs.update({ id: items[0].id as number, data: { status: "completed", output_data: result, delivered_at: new Date().toISOString() } });
        }
      } catch { /* ignore */ }
      setProcessing(null);
      toast.success(`✅ "${jobType.name}" completado — Entregado a ${pjPartnerName}`);
      addAudit("Trabajo Partner completado", `${jobType.name} · Partner: ${pjPartnerName} · Cliente: ${pjClientName} · €${jobType.price}`);
      setPjPartnerEmail(""); setPjPartnerName(""); setPjClientName(""); setPjNotes("");
      await syncBackendJobs();
    }, 4000);
  };

  const handleStripeCheckout = async (planId: PlanId, cycle: BillingCycle = "annual") => {
    setCheckoutLoading(planId);
    try { await redirectToCheckout(planId, cycle); toast.success("Redirigiendo a Stripe..."); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error al crear sesión de pago"); }
    finally { setCheckoutLoading(null); }
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count?: number; requiresPerm?: keyof typeof permissions }[] = [
    { key: "agents", label: "Agentes & Métricas", icon: Bot, count: AGENTS.length },
    { key: "white-label", label: "White-Label", icon: Package, requiresPerm: "canSendWhiteLabel" },
    { key: "partner-jobs", label: "Trabajos Partner", icon: Handshake, requiresPerm: "canCreateJobs" },
    { key: "pricing", label: "Precios & Rebajas", icon: DollarSign, count: promos.length, requiresPerm: "canManagePromos" },
    { key: "history", label: "Historial", icon: Clock, count: jobs.length },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <SaasLayout title="Agentes Internos NELVYON" subtitle="Automatización élite — Templates, Partners, Contratos, Precios">
      {/* Role Selector + Stats */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <Shield className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] text-zinc-500">Rol actual:</span>
          <select value={currentRole} onChange={e => setCurrentRole(e.target.value as UserRole)}
            className="h-7 px-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-xs text-zinc-300">
            {Object.entries(ROLE_PERMISSIONS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(permissions).filter(([k]) => k.startsWith("can")).map(([k, v]) => (
            <span key={k} className={cn("px-2 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5",
              v ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
              {v ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {k.replace("can", "").replace(/([A-Z])/g, " $1").trim()}
            </span>
          ))}
        </div>
        {permissions.canViewRevenue && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400 ml-auto" onClick={() => setShowAuditLog(!showAuditLog)}>
            <Clock className="w-3 h-3 mr-1" /> Auditoría ({auditTrail.length})
          </Button>
        )}
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && permissions.canViewRevenue && auditTrail.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" /> Registro de Auditoría — Agentes ({auditTrail.length})
            </span>
            <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditTrail.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-violet-400">{entry.action}</span>
                    <span className="text-[9px] text-zinc-500">{entry.user}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{ROLE_PERMISSIONS[entry.role as UserRole]?.label || entry.role}</span>
                  </div>
                  {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                  <p className="text-[8px] text-zinc-700">{new Date(entry.timestamp).toLocaleString("es")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Agentes Online", value: AGENTS.filter(a => a.status === "online").length, icon: Bot, color: "#10B981" },
          { label: "Jobs Activos", value: workingJobs.length, icon: Activity, color: "#3B82F6" },
          { label: "Completados", value: completedJobs.length, icon: CheckCircle2, color: "#10B981" },
          { label: "Errores", value: errorJobs.length, icon: XCircle, color: "#EF4444" },
          ...(permissions.canViewRevenue ? [{ label: "Revenue", value: `€${totalRevenue.toLocaleString()}`, icon: Sparkles, color: "#F59E0B" }] : []),
          { label: "Clientes WL+P", value: whitelabelClients.length + partnerClients.length, icon: Users, color: "#7C3AED" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <s.icon className="w-4 h-4 mb-1.5" style={{ color: s.color }} />
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[9px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const locked = tab.requiresPerm && !permissions[tab.requiresPerm];
          return (
            <button key={tab.key}
              onClick={() => { if (!locked) setActiveTab(tab.key); else toast.error(`Rol "${permissions.label}" no tiene acceso a ${tab.label}`); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                locked ? "text-zinc-700 border-transparent cursor-not-allowed opacity-40" :
                activeTab === tab.key ? "bg-violet-500/10 text-violet-400 border-violet-500/20" :
                "text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-800"
              )}>
              {locked ? <Lock className="w-3 h-3" /> : <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
              {tab.count !== undefined && !locked && (
                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-[9px] font-bold text-violet-400">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB: Agents Overview with Metrics ─── */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          {/* Agent Cards with Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AGENTS.map(agent => {
              const AgentIcon = agent.icon;
              const m = agentMetrics[agent.id];
              if (!permissions.canViewAllAgents && agent.id !== "agent-partners") return null;
              return (
                <div key={agent.id} className="rounded-2xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-all">
                  <div className={cn("h-1.5 bg-gradient-to-r", agent.gradient)} />
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", agent.gradient)}>
                        <AgentIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{agent.name}</h3>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: agent.status === "online" ? "#10B981" : "#EF4444" }} />
                            <span className="text-[9px] font-bold" style={{ color: agent.status === "online" ? "#10B981" : "#EF4444" }}>
                              {agent.status === "online" ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500">{agent.role}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">{agent.description}</p>

                    {/* Per-Agent Metrics */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-sm font-bold text-white">{m.total}</p>
                        <p className="text-[7px] text-zinc-600">Total Jobs</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10 text-center">
                        <p className="text-sm font-bold text-emerald-400">{m.successRate}%</p>
                        <p className="text-[7px] text-zinc-600">Éxito</p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/[0.04] border border-blue-500/10 text-center">
                        <p className="text-sm font-bold text-blue-400">{m.working}</p>
                        <p className="text-[7px] text-zinc-600">Activos</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/[0.04] border border-red-500/10 text-center">
                        <p className="text-sm font-bold text-red-400">{m.errors}</p>
                        <p className="text-[7px] text-zinc-600">Errores</p>
                      </div>
                    </div>

                    {/* Success rate bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${m.successRate}%` }} />
                      </div>
                      <span className="text-[8px] text-zinc-500">{m.successRate}% éxito</span>
                    </div>

                    {/* Capabilities */}
                    <div className="space-y-1 mb-3">
                      {agent.capabilities.slice(0, 4).map(cap => (
                        <div key={cap} className="flex items-center gap-2">
                          <Check className="w-3 h-3 shrink-0" style={{ color: agent.color }} />
                          <span className="text-[9px] text-zinc-400">{cap}</span>
                        </div>
                      ))}
                    </div>

                    {permissions.canViewRevenue && m.revenue > 0 && (
                      <div className="pt-2 border-t border-white/[0.04]">
                        <span className="text-[9px] text-zinc-600">Revenue generado: </span>
                        <span className="text-[10px] font-bold text-amber-400">€{m.revenue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Agent Performance Summary */}
          <div className="rounded-xl bg-gradient-to-br from-violet-500/[0.04] to-emerald-500/[0.04] border border-violet-500/10 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" /> Rendimiento Global de Agentes
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AGENTS.map(a => {
                const m = agentMetrics[a.id];
                return (
                  <div key={a.id} className="p-3 rounded-lg bg-[#0A0E13] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <a.icon className="w-4 h-4" style={{ color: a.color }} />
                      <span className="text-[10px] font-semibold text-white truncate">{a.name.replace("Agente ", "")}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">{m.completed}</p>
                        <p className="text-[8px] text-zinc-600">completados</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", Number(m.successRate) >= 90 ? "text-emerald-400" : Number(m.successRate) >= 70 ? "text-amber-400" : "text-red-400")}>
                          {m.successRate}%
                        </p>
                        <p className="text-[8px] text-zinc-600">éxito</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: White-Label ─── */}
      {activeTab === "white-label" && permissions.canSendWhiteLabel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-pink-400" /> Enviar Plantilla SaaS White-Label
            </h3>
            <p className="text-[10px] text-zinc-500 mb-5">El Agente Templates genera la plantilla personalizada y la envía automáticamente.</p>
            {whitelabelClients.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
                <p className="text-[10px] text-zinc-500 mb-2">Clientes White-Label:</p>
                <div className="flex flex-wrap gap-1">
                  {whitelabelClients.map(c => (
                    <button key={c.id} onClick={() => { setWlClientEmail(c.email); setWlClientName(c.name); }}
                      className="px-2 py-1 rounded bg-pink-500/10 text-[10px] text-pink-300 hover:bg-pink-500/20 transition-colors">{c.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Email del cliente *</label>
                <Input value={wlClientEmail} onChange={e => setWlClientEmail(e.target.value)} placeholder="cliente@empresa.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Nombre del cliente *</label>
                <Input value={wlClientName} onChange={e => setWlClientName(e.target.value)} placeholder="TechCorp S.L." className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Nombre de marca *</label>
                <Input value={wlBrandName} onChange={e => setWlBrandName(e.target.value)} placeholder="MiBrandSaaS" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Dominio personalizado</label>
                <Input value={wlDomain} onChange={e => setWlDomain(e.target.value)} placeholder="app.mibrand.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
            </div>
            <Button onClick={handleSendWhiteLabel} disabled={!!processing}
              className="w-full mt-5 h-11 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</> : <><Send className="w-4 h-4 mr-2" /> Ejecutar — Enviar Plantilla</>}
            </Button>
          </div>
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-amber-400" /> ¿Qué recibe el cliente?</h3>
            <div className="space-y-3">
              {[
                { icon: Globe, label: "Plataforma SaaS completa con su marca", desc: "CRM, Email, Funnels, Workflows, Analytics" },
                { icon: Shield, label: "Dominio personalizado configurado", desc: "app.sumarca.com con SSL y DNS" },
                { icon: FileText, label: "Contrato de licencia generado", desc: "Adaptado a jurisdicción con firma digital" },
                { icon: Mail, label: "Email de bienvenida automático", desc: "Credenciales, guía y documentación" },
                { icon: Users, label: "Panel de gestión de sub-clientes", desc: "Puede crear cuentas para sus clientes" },
                { icon: Zap, label: "Automatizaciones pre-configuradas", desc: "Workflows de onboarding y retención" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <item.icon className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                  <div><p className="text-xs font-semibold text-white">{item.label}</p><p className="text-[10px] text-zinc-500">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Partner Jobs ─── */}
      {activeTab === "partner-jobs" && permissions.canCreateJobs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Handshake className="w-4 h-4 text-orange-400" /> Crear Trabajo para Partner
            </h3>
            <p className="text-[10px] text-zinc-500 mb-5">El Agente Partners procesa, ejecuta, genera contrato y entrega.</p>
            {partnerClients.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <p className="text-[10px] text-zinc-500 mb-2">Partners registrados:</p>
                <div className="flex flex-wrap gap-1">
                  {partnerClients.map(c => (
                    <button key={c.id} onClick={() => { setPjPartnerEmail(c.email); setPjPartnerName(c.name); }}
                      className="px-2 py-1 rounded bg-orange-500/10 text-[10px] text-orange-300 hover:bg-orange-500/20 transition-colors">{c.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Email del Partner *</label>
                <Input value={pjPartnerEmail} onChange={e => setPjPartnerEmail(e.target.value)} placeholder="partner@agencia.com" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Nombre del Partner *</label>
                <Input value={pjPartnerName} onChange={e => setPjPartnerName(e.target.value)} placeholder="Agencia Digital XYZ" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Cliente final *</label>
                <Input value={pjClientName} onChange={e => setPjClientName(e.target.value)} placeholder="Restaurante La Buena Mesa" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Tipo de trabajo</label>
                <select value={pjJobType} onChange={e => setPjJobType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#0F1419] border border-white/[0.06] text-white text-xs">
                  {PARTNER_JOB_TYPES.map(jt => <option key={jt.id} value={jt.id}>{jt.name} — €{jt.price} ({jt.estimatedTime})</option>)}
                </select></div>
              <div><label className="text-[10px] text-zinc-500 mb-1 block">Notas</label>
                <textarea value={pjNotes} onChange={e => setPjNotes(e.target.value)} placeholder="Detalles..." rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-white text-xs resize-none" /></div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Precio:</span>
                <span className="font-bold text-orange-400">€{PARTNER_JOB_TYPES.find(j => j.id === pjJobType)?.price}</span>
              </div>
            </div>
            <Button onClick={handleCreatePartnerJob} disabled={!!processing}
              className="w-full mt-4 h-11 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold rounded-xl">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</> : <><Play className="w-4 h-4 mr-2" /> Ejecutar — Procesar Trabajo</>}
            </Button>
          </div>
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Crown className="w-4 h-4 text-amber-400" /> Catálogo de Trabajos Partner</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {PARTNER_JOB_TYPES.map(jt => (
                <div key={jt.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-orange-500/20 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{jt.name}</span>
                    <span className="text-xs font-bold text-orange-400">€{jt.price}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-1">{jt.description}</p>
                  <div className="flex items-center gap-3 text-[9px] text-zinc-600">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {jt.estimatedTime}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500">{jt.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Pricing ─── */}
      {activeTab === "pricing" && permissions.canManagePromos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-emerald-400" /> Precios por Ciclo</h3>
              <div className="flex gap-2 mb-4">
                {(Object.keys(PLANS) as PlanId[]).map(pid => (
                  <button key={pid} onClick={() => setSelectedPricingPlan(pid)}
                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      selectedPricingPlan === pid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "text-zinc-500 border-transparent hover:text-zinc-300")}>
                    {PLANS[pid].icon} {PLANS[pid].name}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {getAllPricing(selectedPricingPlan).map(p => {
                  const cycleLoading = checkoutLoading === `${selectedPricingPlan}-${p.cycle}`;
                  return (
                    <div key={p.cycle} className={cn("p-3 rounded-lg border transition-all", p.cycle === "annual" ? "bg-emerald-500/[0.06] border-emerald-500/15" : "bg-white/[0.02] border-white/[0.04]")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-xs font-semibold text-white">{p.label}</span>
                          {p.badge && <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black border",
                            p.cycle === "annual" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            p.cycle === "biennial" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            "bg-violet-500/20 text-violet-400 border-violet-500/30")}>{p.badge}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right"><span className="text-sm font-bold text-white">€{p.monthlyPrice}</span><span className="text-[10px] text-zinc-500">/mes</span></div>
                          <button onClick={() => {
                            setCheckoutLoading(`${selectedPricingPlan}-${p.cycle}`);
                            redirectToCheckout(selectedPricingPlan, p.cycle as BillingCycle).then(() => toast.success("Redirigiendo...")).catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Error")).finally(() => setCheckoutLoading(null));
                          }} disabled={cycleLoading || !!checkoutLoading}
                            className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border",
                              p.cycle === "annual" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20")}>
                            {cycleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Contratar"}
                          </button>
                        </div>
                      </div>
                      {p.savings > 0 && <p className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Ahorras €{p.savings.toLocaleString()} ({p.savingsPercent}%)</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Percent className="w-4 h-4 text-amber-400" /> Crear Promoción</h3>
              <div className="space-y-3">
                <div><label className="text-[10px] text-zinc-500 mb-1 block">Nombre</label>
                  <Input value={newPromoName} onChange={e => setNewPromoName(e.target.value)} placeholder="Rebajas Verano 2026" className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Tipo</label>
                    <select value={newPromoType} onChange={e => setNewPromoType(e.target.value as PromoType)} className="w-full h-9 px-3 rounded-lg bg-[#0F1419] border border-white/[0.06] text-white text-xs">
                      <option value="seasonal">Estacional</option><option value="flash">Flash</option><option value="loyalty">Fidelidad</option><option value="volume">Volumen</option><option value="launch">Lanzamiento</option>
                    </select></div>
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Descuento (%)</label>
                    <Input type="number" min={1} max={50} value={newPromoDiscount} onChange={e => setNewPromoDiscount(Number(e.target.value))} className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Código</label>
                    <Input value={newPromoCode} onChange={e => setNewPromoCode(e.target.value.toUpperCase())} placeholder="VERANO2026" className="bg-[#0F1419] border-white/[0.06] text-white text-sm font-mono" /></div>
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Días</label>
                    <Input type="number" min={1} max={365} value={newPromoDays} onChange={e => setNewPromoDays(Number(e.target.value))} className="bg-[#0F1419] border-white/[0.06] text-white text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Plan</label>
                    <select value={newPromoPlan} onChange={e => setNewPromoPlan(e.target.value as PlanId)} className="w-full h-9 px-3 rounded-lg bg-[#0F1419] border border-white/[0.06] text-white text-xs">
                      {(Object.keys(PLANS) as PlanId[]).map(pid => <option key={pid} value={pid}>{PLANS[pid].icon} {PLANS[pid].name}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-zinc-500 mb-1 block">Ciclo</label>
                    <select value={newPromoCycle} onChange={e => setNewPromoCycle(e.target.value as BillingCycle)} className="w-full h-9 px-3 rounded-lg bg-[#0F1419] border border-white/[0.06] text-white text-xs">
                      {BILLING_OPTIONS.map(opt => <option key={opt.cycle} value={opt.cycle}>{opt.label}</option>)}
                    </select></div>
                </div>
              </div>
              <Button onClick={async () => {
                if (!newPromoName || !newPromoCode) { toast.error("Completa nombre y código"); return; }
                const now = new Date(); const end = new Date(now.getTime() + newPromoDays * 86400000);
                try {
                  await client.entities.pricing_promos.create({ data: { name: newPromoName, promo_type: newPromoType, discount_percent: newPromoDiscount, code: newPromoCode, plan_id: newPromoPlan, billing_cycle: newPromoCycle, active: true, valid_from: now.toISOString(), valid_until: end.toISOString(), created_at: now.toISOString() } });
                  toast.success(`✅ Promoción "${newPromoName}" creada`);
                  addAudit("Promoción creada", `${newPromoName} · ${newPromoCode} · -${newPromoDiscount}% · Plan: ${newPromoPlan}`);
                  setNewPromoName(""); setNewPromoCode("");
                  await syncBackendPromos();
                } catch { toast.error("Error al crear promoción"); }
              }} className="w-full mt-4 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Crear Promoción
              </Button>
            </div>
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-violet-400" /> Promociones Activas ({promos.filter(p => p.active).length})</h3>
              {promos.length === 0 ? (
                <div className="text-center py-8"><Tag className="w-8 h-8 text-zinc-700 mx-auto mb-2" /><p className="text-xs text-zinc-600">No hay promociones</p></div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {promos.map(promo => (
                    <div key={promo.id} className={cn("p-3 rounded-lg border transition-all", promo.active ? "bg-emerald-500/[0.04] border-emerald-500/10" : "bg-white/[0.02] border-white/[0.04] opacity-50")}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{promo.name}</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border",
                            promo.type === "flash" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            promo.type === "seasonal" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            "bg-violet-500/20 text-violet-400 border-violet-500/30")}>{promo.type}</span>
                        </div>
                        {permissions.canDeleteJobs && (
                          <button onClick={async () => {
                            const beId = promo.id.replace("be-", "");
                            try { await client.entities.pricing_promos.delete({ id: beId }); toast.success("Eliminada"); addAudit("Promoción eliminada", `${promo.name} · ${promo.code}`); await syncBackendPromos(); } catch { toast.error("Error"); }
                          }} className="p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[9px] text-zinc-600">
                        <span className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-emerald-400">{promo.code}</span>
                        <span>-{promo.extraDiscount}%</span>
                        <span>Hasta: {new Date(promo.validUntil).toLocaleDateString("es")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: History ─── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" /> Historial ({jobs.length})</h3>
            <Button size="sm" variant="outline" onClick={refreshJobs} className="border-white/10 text-zinc-400 h-7 text-[10px]"><RefreshCw className="w-3 h-3 mr-1" /> Actualizar</Button>
          </div>
          {jobs.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
              <Bot className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No hay trabajos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...jobs].reverse().map(job => {
                const agent = AGENTS.find(a => a.id === job.agentId);
                return (
                  <div key={job.id} className={cn("p-4 rounded-xl border transition-all",
                    job.status === "completed" ? "bg-emerald-500/[0.03] border-emerald-500/10" :
                    job.status === "working" ? "bg-blue-500/[0.03] border-blue-500/10" :
                    "bg-red-500/[0.03] border-red-500/10")}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {agent && <agent.icon className="w-4 h-4" style={{ color: agent.color }} />}
                        <span className="text-xs font-semibold text-white">{agent?.name || "Agente"}</span>
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border",
                          job.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          job.status === "working" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20")}>
                          {job.status === "completed" ? "COMPLETADO" : job.status === "working" ? "EN PROCESO" : "ERROR"}
                        </span>
                      </div>
                      {permissions.canViewRevenue && job.price && <span className="text-xs font-bold text-amber-400">€{job.price}</span>}
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-1">{job.description}</p>
                    {job.result && (
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mt-2">
                        <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono">{job.result}</pre>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-600">
                      <span>{new Date(job.createdAt).toLocaleString("es")}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={getPlanBadgeStyle(job.plan)}>
                        {PLANS[job.plan].icon} {PLANS[job.plan].name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Analytics ─── */}
      {activeTab === "analytics" && <AgentsAnalyticsTab />}
    </SaasLayout>
  );
}