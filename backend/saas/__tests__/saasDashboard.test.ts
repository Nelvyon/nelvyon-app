import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_DASHBOARD } from "../../../apps/web/src/app/api/saas/dashboard/route";
import { GET as GET_ACTIVITY, POST as POST_ACTIVITY } from "../../../apps/web/src/app/api/saas/dashboard/activity/route";
import { SaasDashboardService } from "../SaasDashboardService";

type TenantRow = {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: Date;
  updated_at: Date;
  auth_tenant_id: string;
};

type ActivityRow = {
  id: string;
  tenant_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: Date;
};

function makeMemoryDb() {
  const tenants = new Map<string, TenantRow>();
  const activities: ActivityRow[] = [];
  const jobs: Array<{ client_id: string; status: string }> = [];
  let tick = 0;

  const t1: TenantRow = {
    id: "tenant-uuid-1",
    user_id: "u1",
    company_name: "Acme",
    industry: "Retail",
    plan: "pro",
    website: null,
    phone: null,
    employees: null,
    goals: [],
    onboarding_completed: true,
    onboarding_step: 4,
    created_at: new Date(),
    updated_at: new Date(),
    auth_tenant_id: "auth-tenant-1",
  };
  const t2: TenantRow = { ...t1, id: "tenant-uuid-2", user_id: "u2", company_name: "Beta", auth_tenant_id: "auth-tenant-2" };
  tenants.set(t1.id, t1);
  tenants.set(t2.id, t2);

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const p = params ?? [];
    const s = sql.replace(/\s+/g, " ").trim();

    if (s.includes("FROM saas_tenants st JOIN nelvyon_users")) {
      const tenantId = String(p[0]);
      const row = tenants.get(tenantId);
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("SELECT COUNT(*)::text AS n FROM os_jobs")) {
      const clientId = String(p[0]);
      const status = s.includes("status = 'running'") ? "running" : "completed";
      const n = jobs.filter((j) => j.client_id === clientId && j.status === status).length;
      return [{ n: String(n) }] as T[];
    }
    if (s.includes("to_regclass('public.billing_payments')")) {
      return [{ total: 0 }] as T[];
    }
    if (s.startsWith("SELECT id, tenant_id, event_type, description, metadata, created_at FROM saas_activity_log")) {
      const tenantId = String(p[0]);
      const limit = Number(p[1] ?? 10);
      const rows = activities
        .filter((a) => a.tenant_id === tenantId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, limit);
      return rows as T[];
    }
    if (s.startsWith("INSERT INTO saas_activity_log")) {
      const row: ActivityRow = {
        id: `act-${activities.length + 1}`,
        tenant_id: String(p[0]),
        event_type: String(p[1]),
        description: String(p[2]),
        metadata: (p[3] as Record<string, unknown>) ?? {},
        created_at: new Date(Date.now() + ++tick),
      };
      activities.push(row);
      return [] as T[];
    }
    return [] as T[];
  }

  return { query, tenants, activities, jobs };
}

describe("SaasDashboardService", () => {
  it("getDashboardSummary retorna estructura correcta con tenant válido", async () => {
    const db = makeMemoryDb();
    db.jobs.push({ client_id: "auth-tenant-1", status: "running" }, { client_id: "auth-tenant-1", status: "completed" });
    const svc = new SaasDashboardService(db);
    const s = await svc.getDashboardSummary("tenant-uuid-1");
    expect(s.tenant.companyName).toBe("Acme");
    expect(typeof s.activeJobs).toBe("number");
    expect(typeof s.completedJobs).toBe("number");
    expect(typeof s.totalSpend).toBe("number");
    expect(Array.isArray(s.recentActivity)).toBe(true);
  });

  it("getDashboardSummary retorna activeJobs=0 si no hay jobs", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    const s = await svc.getDashboardSummary("tenant-uuid-1");
    expect(s.activeJobs).toBe(0);
  });

  it("getDashboardSummary cuenta solo jobs del tenant correcto", async () => {
    const db = makeMemoryDb();
    db.jobs.push({ client_id: "auth-tenant-1", status: "running" }, { client_id: "auth-tenant-2", status: "running" });
    const svc = new SaasDashboardService(db);
    const s = await svc.getDashboardSummary("tenant-uuid-1");
    expect(s.activeJobs).toBe(1);
  });

  it("getRecentActivity retorna array vacío si no hay actividad", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    await expect(svc.getRecentActivity("tenant-uuid-1")).resolves.toEqual([]);
  });

  it("getRecentActivity respeta el límite", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    for (let i = 0; i < 12; i++) {
      await svc.logActivity("tenant-uuid-1", "evt", `item-${i}`);
    }
    const out = await svc.getRecentActivity("tenant-uuid-1", 5);
    expect(out).toHaveLength(5);
  });

  it("getRecentActivity ordena por created_at DESC", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    await svc.logActivity("tenant-uuid-1", "a", "primero");
    await svc.logActivity("tenant-uuid-1", "b", "segundo");
    const out = await svc.getRecentActivity("tenant-uuid-1", 2);
    expect(out[0]?.description).toBe("segundo");
  });

  it("logActivity inserta correctamente en saas_activity_log", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    await svc.logActivity("tenant-uuid-1", "manual_event", "algo paso");
    expect(db.activities[0]?.event_type).toBe("manual_event");
  });

  it("logActivity acepta metadata opcional", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    await svc.logActivity("tenant-uuid-1", "manual_event", "algo paso", { from: "test" });
    expect(db.activities[0]?.metadata).toEqual({ from: "test" });
  });

  it("DashboardSummary incluye tenant con company_name y plan", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    const s = await svc.getDashboardSummary("tenant-uuid-1");
    expect(s.tenant.companyName).toBe("Acme");
    expect(s.tenant.plan).toBe("pro");
  });

  it("totalSpend es 0 si no hay billing registrado", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    const s = await svc.getDashboardSummary("tenant-uuid-1");
    expect(s.totalSpend).toBe(0);
  });
});

describe("API SaaS dashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasDashboardServiceForTests();
    Saas.resetSaasOnboardingServiceForTests();
  });

  it("API GET /api/saas/dashboard → 401 sin auth", async () => {
    vi.spyOn(Auth, "authenticate").mockRejectedValue(new OsAgentError("Unauthorized"));
    const res = await GET_DASHBOARD(new Request("https://app.test/api/saas/dashboard"));
    expect(res.status).toBe(401);
  });

  it("API GET /api/saas/dashboard → 200 con DashboardSummary", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "tenant-uuid-1", onboardingCompleted: true }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDashboardService").mockReturnValue(svc);
    const res = await GET_DASHBOARD(new Request("https://app.test/api/saas/dashboard"));
    expect(res.status).toBe(200);
  });

  it("API GET /api/saas/dashboard/activity → 200 con array de actividad", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    await svc.logActivity("tenant-uuid-1", "evt", "hello");
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "tenant-uuid-1", onboardingCompleted: true }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDashboardService").mockReturnValue(svc);
    const res = await GET_ACTIVITY(new Request("https://app.test/api/saas/dashboard/activity"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { activity: unknown[] };
    expect(Array.isArray(body.activity)).toBe(true);
  });

  it("API POST /api/saas/dashboard/activity → 201 con eventType válido", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "tenant-uuid-1", onboardingCompleted: true }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDashboardService").mockReturnValue(svc);
    const req = new Request("https://app.test/api/saas/dashboard/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "custom", description: "desc" }),
    });
    const res = await POST_ACTIVITY(req);
    expect(res.status).toBe(201);
  });

  it("API POST /api/saas/dashboard/activity → 400 sin eventType", async () => {
    const db = makeMemoryDb();
    const svc = new SaasDashboardService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "tenant-uuid-1", onboardingCompleted: true }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDashboardService").mockReturnValue(svc);
    const req = new Request("https://app.test/api/saas/dashboard/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "desc" }),
    });
    const res = await POST_ACTIVITY(req);
    expect(res.status).toBe(400);
  });
});
