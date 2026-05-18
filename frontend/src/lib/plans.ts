/* ─── NELVYON Plans & Access Control — Sistema Elite de Niveles ─── */
/* Precios ligeramente más baratos que GoHighLevel (GHL: $97/$297/$497) */

import { client } from "@/lib/api";

export type PlanId = "starter" | "pro" | "enterprise" | "partner";
export type UserRole = "super_admin" | "admin" | "user" | "partner";
export const CORE_PLAN_IDS: PlanId[] = ["starter", "pro", "enterprise"];
export const VALID_PLAN_IDS: PlanId[] = ["starter", "pro", "enterprise", "partner"];

/** Align JWT /api/v1/auth/me role with frontend RBAC (backend: user | admin | super_admin). */
export function normalizeRoleFromBackend(role: string | undefined | null): UserRole {
  if (!role) return "user";
  const r = String(role).toLowerCase();
  if (r === "super_admin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "partner") return "partner";
  return "user";
}

/** Default commercial plan for authenticated users until subscription is loaded. */
export const DEFAULT_PLAN_FOR_AUTHENTICATED: PlanId = "starter";

export interface NelvyonPlan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  color: string;
  gradient: string;
  icon: string;
  modules: {
    contacts: boolean;
    helpdesk: boolean;
    campaigns: boolean;
    workflows: boolean;
    analytics: boolean;
    integrations: boolean;
  };
  limits: {
    contacts: number | null;
    activeCampaigns: number | null;
    activeWorkflows: number | null;
    workspaceUsers: number | null;
  };
  maxContacts: number | null;
  maxUsers: number | null;
  features: string[];
  allowedRoutes: string[];
  ghlComparison?: string;
}

/** All SaaS routes organized by access level */
const STARTER_ROUTES = [
  "/saas/home",
  "/saas/dashboard",
  "/saas/crm",
  "/saas/calendar",
  "/saas/email-marketing",
  "/saas/conversations",
  "/saas/forms",
  "/saas/blog",
  "/saas/templates",
  "/saas/billing",
  "/saas/settings",
];

const PRO_ROUTES = [
  ...STARTER_ROUTES,
  "/saas/pipelines",
  "/saas/campaigns",
  "/saas/funnels",
  "/saas/social",
  "/saas/helpdesk",
  "/saas/calls",
  "/saas/workflows",
  "/saas/bots",
  "/saas/analytics",
  "/saas/reports",
  "/saas/payments",
  "/saas/segmentation",
  "/saas/pdf-generator",
  "/saas/presentations",
  "/saas/websites",
  "/saas/contracts",
  "/saas/integrations",
];

const ENTERPRISE_ROUTES = [
  ...PRO_ROUTES,
  "/saas/video-ads",
  "/saas/autopilot",
  "/saas/cybersecurity",
  "/saas/agents-marketplace",
  "/saas/benchmark",
  "/saas/comparison",
  "/saas/vs-ghl",
  "/saas/sales",
  "/saas/admin",
  "/saas/service",
  "/saas/partners",
];

const PARTNER_ROUTES = [
  "/saas/home",
  "/saas/dashboard",
  "/saas/partners",
  "/saas/contracts",
  "/saas/templates",
  "/saas/settings",
];

export const PLANS: Record<PlanId, NelvyonPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 79,
    currency: "€",
    color: "#3B82F6",
    gradient: "from-blue-500 to-cyan-500",
    icon: "⚡",
    modules: {
      contacts: true,
      helpdesk: true,
      campaigns: true,
      workflows: true,
      analytics: false,
      integrations: false,
    },
    limits: {
      contacts: 2500,
      activeCampaigns: 10,
      activeWorkflows: 10,
      workspaceUsers: 3,
    },
    maxContacts: 2500,
    maxUsers: 3,
    ghlComparison: "GHL Starter $97 → NELVYON €79 (18% menos)",
    features: [
      "CRM básico (500 contactos)",
      "Email Marketing",
      "Calendario",
      "Conversaciones",
      "Forms & Surveys",
      "Blog & CMS",
      "Templates básicos",
      "Soporte email",
    ],
    allowedRoutes: STARTER_ROUTES,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 249,
    currency: "€",
    color: "#7C3AED",
    gradient: "from-violet-500 to-purple-600",
    icon: "🚀",
    modules: {
      contacts: true,
      helpdesk: true,
      campaigns: true,
      workflows: true,
      analytics: true,
      integrations: true,
    },
    limits: {
      contacts: 25000,
      activeCampaigns: 200,
      activeWorkflows: 100,
      workspaceUsers: 20,
    },
    maxContacts: 25000,
    maxUsers: 20,
    ghlComparison: "GHL Unlimited $297 → NELVYON €249 (16% menos)",
    features: [
      "Todo de Starter +",
      "CRM completo (25K contactos)",
      "Pipelines & Deals",
      "Campañas avanzadas",
      "Funnels & Landing Pages",
      "Social Media Manager",
      "Helpdesk completo",
      "VoIP & Llamadas",
      "Workflows & Automatización",
      "Bots & Chatbots",
      "Analytics avanzado",
      "Reportes",
      "Pagos & Facturas",
      "Websites Builder",
      "Contratos",
      "Integraciones",
      "Soporte prioritario",
    ],
    allowedRoutes: PRO_ROUTES,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 449,
    currency: "€",
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    icon: "👑",
    modules: {
      contacts: true,
      helpdesk: true,
      campaigns: true,
      workflows: true,
      analytics: true,
      integrations: true,
    },
    limits: {
      contacts: null,
      activeCampaigns: null,
      activeWorkflows: null,
      workspaceUsers: null,
    },
    maxContacts: null,
    maxUsers: null,
    ghlComparison: "GHL SaaS Pro $497 → NELVYON €449 (10% menos, con White-Label incluido)",
    features: [
      "Todo de Pro +",
      "Contactos ilimitados",
      "Usuarios ilimitados",
      "Video Ads Studio",
      "Piloto Automático (IA)",
      "Ciberseguridad SENTINEL",
      "Agentes IA Marketplace",
      "Benchmarks & Comparativas",
      "API completa + Webhooks",
      "Soporte dedicado 24/7",
      "SLA garantizado",
      "✨ White-Label completo",
      "Tu marca, tu dominio",
      "Personalización total UI/UX",
      "Programa Partners incluido",
      "Reventa con márgenes 70-90%",
      "Onboarding dedicado",
      "Account Manager personal",
      "Plantillas SaaS auto-enviadas",
    ],
    allowedRoutes: ENTERPRISE_ROUTES,
  },
  partner: {
    id: "partner",
    name: "Partner",
    price: 50,
    currency: "€",
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    icon: "🤝",
    modules: {
      contacts: false,
      helpdesk: false,
      campaigns: false,
      workflows: false,
      analytics: false,
      integrations: false,
    },
    limits: {
      contacts: null,
      activeCampaigns: null,
      activeWorkflows: null,
      workspaceUsers: 1,
    },
    maxContacts: null,
    maxUsers: 1,
    ghlComparison: "GHL no tiene programa Partner accesible → NELVYON €50/mes",
    features: [
      "Acceso al Programa Partners",
      "Dashboard de Partner",
      "Contratos auto-generados",
      "Templates de trabajo",
      "Pago por trabajo realizado",
      "Soporte Partner",
    ],
    allowedRoutes: PARTNER_ROUTES,
  },
};

export function normalizePlanId(planId: string | undefined | null): PlanId {
  if (!planId) return "starter";
  const normalized = String(planId).toLowerCase() as PlanId;
  return VALID_PLAN_IDS.includes(normalized) ? normalized : "starter";
}

/** Check if a route is allowed for a given plan */
export function isRouteAllowed(planId: PlanId, route: string): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  return plan.allowedRoutes.some(
    (r) => route === r || route.startsWith(r + "/")
  );
}

/** Get the plan name badge color */
export function getPlanBadgeStyle(planId: PlanId) {
  const plan = PLANS[planId];
  return {
    backgroundColor: `${plan.color}20`,
    color: plan.color,
    borderColor: `${plan.color}40`,
  };
}

/* ═══════════════════════════════════════════════════════════════
   BACKEND-SYNCED STORAGE
   All data persists to backend DB via API, with localStorage as cache.
   ═══════════════════════════════════════════════════════════════ */

const INVITATIONS_KEY = "nelvyon_invitations";
const MANAGED_USERS_KEY = "nelvyon_managed_users";
const AGENT_JOBS_KEY = "nelvyon_agent_jobs";
const PROMOS_KEY = "nelvyon_pricing_promos";

/** Generic: read from localStorage cache */
function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Generic: write to localStorage cache */
function writeCache<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

/* ─── Invitation System ─── */

export interface Invitation {
  id: string;
  code: string;
  email: string;
  plan: PlanId;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  role: UserRole;
  status: "active" | "suspended" | "pending";
  createdAt: string;
  lastLogin?: string;
  invitedBy: string;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NVY-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += "-";
  }
  return code;
}

export function saveInvitations(invitations: Invitation[]): void {
  writeCache(INVITATIONS_KEY, invitations);
}

export function loadInvitations(): Invitation[] {
  return readCache<Invitation>(INVITATIONS_KEY);
}

/** Async version: load from backend, update cache */
export async function loadInvitationsAsync(): Promise<Invitation[]> {
  try {
    const res = await client.entities.contacts.query({ query: { tag: "invitation" }, limit: 200 });
    const items = (res.data?.items || []) as Array<Record<string, unknown>>;
    if (items.length > 0) {
      const mapped: Invitation[] = items.map((r) => ({
        id: String(r.id ?? ""),
        code: String(r.notes ?? r.code ?? ""),
        email: String(r.email ?? ""),
        plan: (r.status as PlanId) || "starter",
        role: "user" as UserRole,
        createdAt: String(r.created_at ?? new Date().toISOString()),
        expiresAt: String(r.updated_at ?? new Date().toISOString()),
        used: r.tag === "invitation_used",
        usedBy: r.assigned_to ? String(r.assigned_to) : undefined,
      }));
      writeCache(INVITATIONS_KEY, mapped);
      return mapped;
    }
  } catch { /* fallback to cache */ }
  return readCache<Invitation>(INVITATIONS_KEY);
}

export function saveManagedUsers(users: ManagedUser[]): void {
  writeCache(MANAGED_USERS_KEY, users);
}

export function loadManagedUsers(): ManagedUser[] {
  return readCache<ManagedUser>(MANAGED_USERS_KEY);
}

/** Async version: load from backend, update cache */
export async function loadManagedUsersAsync(): Promise<ManagedUser[]> {
  try {
    const res = await client.entities.user_roles.query({ limit: 200 });
    const items = (res.data?.items || []) as Array<Record<string, unknown>>;
    if (items.length > 0) {
      const mapped: ManagedUser[] = items.map((r) => ({
        id: String(r.id ?? ""),
        email: String(r.email ?? ""),
        name: String(r.display_name ?? r.email ?? ""),
        plan: (r.plan_id as PlanId) || "starter",
        role: (r.role as UserRole) || "user",
        status: (r.status as "active" | "suspended" | "pending") || "active",
        createdAt: String(r.created_at ?? new Date().toISOString()),
        lastLogin: r.last_login ? String(r.last_login) : undefined,
        invitedBy: String(r.invited_by ?? ""),
      }));
      writeCache(MANAGED_USERS_KEY, mapped);
      return mapped;
    }
  } catch { /* fallback to cache */ }
  return readCache<ManagedUser>(MANAGED_USERS_KEY);
}

export function validateInviteCode(code: string): Invitation | null {
  const invitations = loadInvitations();
  const invite = invitations.find(
    (i) => i.code === code.toUpperCase() && !i.used
  );
  if (!invite) return null;
  if (new Date(invite.expiresAt) < new Date()) return null;
  return invite;
}

export function markInviteCodeUsed(code: string, userId: string): Invitation | null {
  const invitations = loadInvitations();
  const idx = invitations.findIndex(
    (i) => i.code === code.toUpperCase() && !i.used
  );
  if (idx === -1) return null;
  invitations[idx].used = true;
  invitations[idx].usedBy = userId;
  invitations[idx].usedAt = new Date().toISOString();
  saveInvitations(invitations);
  return invitations[idx];
}

/* ─── Agent System — Agentes Internos ─── */

export type AgentStatus = "idle" | "working" | "completed" | "error";

export interface AgentJob {
  id: string;
  agentId: string;
  type: string;
  status: AgentStatus;
  clientEmail: string;
  clientName: string;
  plan: PlanId;
  description: string;
  result?: string;
  contractId?: string;
  createdAt: string;
  completedAt?: string;
  price?: number;
}

export function saveAgentJobs(jobs: AgentJob[]): void {
  writeCache(AGENT_JOBS_KEY, jobs);
}

export function loadAgentJobs(): AgentJob[] {
  return readCache<AgentJob>(AGENT_JOBS_KEY);
}

/** Async version: load from backend automation_jobs */
export async function loadAgentJobsAsync(): Promise<AgentJob[]> {
  try {
    const res = await client.entities.automation_jobs.query({ sort: "-created_at", limit: 100 });
    const items = (res.data?.items || []) as Array<Record<string, unknown>>;
    if (items.length > 0) {
      const mapped: AgentJob[] = items.map((r) => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(String(r.input_data || "{}")); } catch { /* ignore */ }
        return {
          id: String(r.id ?? ""),
          agentId: String(parsed.agentId ?? ""),
          type: String(r.job_type ?? ""),
          status: (r.status as AgentStatus) || "idle",
          clientEmail: String(parsed.email ?? ""),
          clientName: String(r.client_name ?? ""),
          plan: (parsed.plan as PlanId) || "starter",
          description: String(r.job_type ?? ""),
          result: r.output_data ? String(r.output_data) : undefined,
          createdAt: String(r.created_at ?? new Date().toISOString()),
          completedAt: r.delivered_at ? String(r.delivered_at) : undefined,
        };
      });
      writeCache(AGENT_JOBS_KEY, mapped);
      return mapped;
    }
  } catch { /* fallback to cache */ }
  return readCache<AgentJob>(AGENT_JOBS_KEY);
}

/* ─── Billing Cycles & Discounts ─── */

export type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual" | "biennial";

export interface BillingOption {
  cycle: BillingCycle;
  label: string;
  labelShort: string;
  months: number;
  discountPercent: number;
  badge?: string;
}

export const BILLING_OPTIONS: BillingOption[] = [
  { cycle: "monthly", label: "Mensual", labelShort: "mes", months: 1, discountPercent: 0 },
  { cycle: "quarterly", label: "Trimestral", labelShort: "3 meses", months: 3, discountPercent: 10, badge: "-10%" },
  { cycle: "semiannual", label: "Semestral", labelShort: "6 meses", months: 6, discountPercent: 15, badge: "-15%" },
  { cycle: "annual", label: "Anual", labelShort: "año", months: 12, discountPercent: 25, badge: "POPULAR" },
  { cycle: "biennial", label: "Bienal (2 años)", labelShort: "2 años", months: 24, discountPercent: 35, badge: "MÁXIMO AHORRO" },
];

export function calculatePrice(baseMontlyPrice: number, cycle: BillingCycle): {
  monthlyPrice: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  billingOption: BillingOption;
} {
  const option = BILLING_OPTIONS.find(o => o.cycle === cycle) || BILLING_OPTIONS[0];
  const discountedMonthly = baseMontlyPrice * (1 - option.discountPercent / 100);
  const totalPrice = Math.round(discountedMonthly * option.months * 100) / 100;
  const fullPrice = baseMontlyPrice * option.months;
  const savings = Math.round((fullPrice - totalPrice) * 100) / 100;
  return {
    monthlyPrice: Math.round(discountedMonthly * 100) / 100,
    totalPrice,
    savings,
    savingsPercent: option.discountPercent,
    billingOption: option,
  };
}

/** Get all pricing for a plan across all billing cycles */
export function getAllPricing(planId: PlanId): Array<{
  cycle: BillingCycle;
  label: string;
  monthlyPrice: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  badge?: string;
}> {
  const plan = PLANS[planId];
  if (!plan) return [];
  return BILLING_OPTIONS.map(opt => {
    const calc = calculatePrice(plan.price, opt.cycle);
    return {
      cycle: opt.cycle,
      label: opt.label,
      monthlyPrice: calc.monthlyPrice,
      totalPrice: calc.totalPrice,
      savings: calc.savings,
      savingsPercent: calc.savingsPercent,
      badge: opt.badge,
    };
  });
}

/* ─── Pricing Agent — Auto-update & Promotions ─── */

export type PromoType = "seasonal" | "flash" | "loyalty" | "volume" | "launch";

export interface PricingPromo {
  id: string;
  name: string;
  type: PromoType;
  description: string;
  extraDiscount: number;
  validFrom: string;
  validUntil: string;
  applicablePlans: PlanId[];
  applicableCycles: BillingCycle[];
  code: string;
  active: boolean;
}

export function savePromos(promos: PricingPromo[]): void {
  writeCache(PROMOS_KEY, promos);
}

export function loadPromos(): PricingPromo[] {
  return readCache<PricingPromo>(PROMOS_KEY);
}

/** Async version: load from backend pricing_promos */
export async function loadPromosAsync(): Promise<PricingPromo[]> {
  try {
    const res = await client.entities.pricing_promos.query({ sort: "-created_at", limit: 100 });
    const items = (res.data?.items || []) as Array<Record<string, unknown>>;
    if (items.length > 0) {
      const mapped: PricingPromo[] = items.map((r) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? ""),
        type: (r.promo_type as PromoType) || "seasonal",
        description: String(r.name ?? ""),
        extraDiscount: Number(r.discount_percent ?? 0),
        validFrom: String(r.valid_from ?? ""),
        validUntil: String(r.valid_until ?? ""),
        applicablePlans: String(r.plan_id ?? "").split(",").filter(Boolean) as PlanId[],
        applicableCycles: String(r.billing_cycle ?? "").split(",").filter(Boolean) as BillingCycle[],
        code: String(r.code ?? ""),
        active: Boolean(r.active),
      }));
      writeCache(PROMOS_KEY, mapped);
      return mapped;
    }
  } catch { /* fallback to cache */ }
  return readCache<PricingPromo>(PROMOS_KEY);
}

export function getActivePromos(): PricingPromo[] {
  const now = new Date().toISOString();
  return loadPromos().filter(p => p.active && p.validFrom <= now && p.validUntil >= now);
}

export function applyPromo(baseMonthly: number, cycle: BillingCycle, promoCode: string): {
  finalMonthlyPrice: number;
  finalTotalPrice: number;
  totalSavings: number;
  promoApplied: PricingPromo | null;
} {
  const calc = calculatePrice(baseMonthly, cycle);
  const promos = loadPromos();
  const promo = promos.find(p => p.code.toUpperCase() === promoCode.toUpperCase() && p.active);
  
  if (!promo || !promo.applicableCycles.includes(cycle)) {
    return { finalMonthlyPrice: calc.monthlyPrice, finalTotalPrice: calc.totalPrice, totalSavings: calc.savings, promoApplied: null };
  }

  const extraDiscountedMonthly = calc.monthlyPrice * (1 - promo.extraDiscount / 100);
  const option = BILLING_OPTIONS.find(o => o.cycle === cycle) || BILLING_OPTIONS[0];
  const finalTotal = Math.round(extraDiscountedMonthly * option.months * 100) / 100;
  const fullPrice = baseMonthly * option.months;

  return {
    finalMonthlyPrice: Math.round(extraDiscountedMonthly * 100) / 100,
    finalTotalPrice: finalTotal,
    totalSavings: Math.round((fullPrice - finalTotal) * 100) / 100,
    promoApplied: promo,
  };
}

/* ─── Partner Jobs & Pricing ─── */

export interface PartnerJobType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  estimatedTime: string;
  category: string;
}

export const PARTNER_JOB_TYPES: PartnerJobType[] = [
  { id: "web-basic", name: "Web Básica (Landing)", description: "Landing page profesional con formulario de contacto", price: 150, currency: "€", estimatedTime: "24-48h", category: "Web" },
  { id: "web-pro", name: "Web Profesional (5-10 pág)", description: "Sitio web completo con múltiples páginas y CMS", price: 450, currency: "€", estimatedTime: "3-5 días", category: "Web" },
  { id: "web-ecommerce", name: "E-commerce Completo", description: "Tienda online con catálogo, carrito y pagos", price: 800, currency: "€", estimatedTime: "5-7 días", category: "Web" },
  { id: "funnel-basic", name: "Funnel de Ventas", description: "Embudo de ventas con landing, email sequence y thank you page", price: 250, currency: "€", estimatedTime: "2-3 días", category: "Marketing" },
  { id: "email-campaign", name: "Campaña Email Marketing", description: "Diseño y configuración de campaña de email completa", price: 120, currency: "€", estimatedTime: "24h", category: "Marketing" },
  { id: "social-setup", name: "Setup Social Media", description: "Configuración completa de redes sociales + 30 posts", price: 200, currency: "€", estimatedTime: "2-3 días", category: "Marketing" },
  { id: "crm-setup", name: "Setup CRM Completo", description: "Configuración de CRM, pipelines, automatizaciones", price: 300, currency: "€", estimatedTime: "2-4 días", category: "CRM" },
  { id: "automation", name: "Workflow de Automatización", description: "Diseño e implementación de workflow automatizado", price: 180, currency: "€", estimatedTime: "1-2 días", category: "Automatización" },
  { id: "chatbot", name: "Chatbot Personalizado", description: "Bot conversacional con IA para atención al cliente", price: 350, currency: "€", estimatedTime: "3-5 días", category: "IA" },
  { id: "seo-audit", name: "Auditoría SEO + Optimización", description: "Análisis SEO completo con implementación de mejoras", price: 280, currency: "€", estimatedTime: "3-5 días", category: "SEO" },
  { id: "video-ad", name: "Video Ad Profesional", description: "Creación de video publicitario para redes sociales", price: 200, currency: "€", estimatedTime: "2-3 días", category: "Video" },
  { id: "branding", name: "Pack Branding Completo", description: "Logo, paleta de colores, tipografía, guía de marca", price: 500, currency: "€", estimatedTime: "5-7 días", category: "Diseño" },
];