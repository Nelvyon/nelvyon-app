import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Admin from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_STATS } from "../../../apps/web/src/app/api/admin/stats/route";
import { GET as GET_TENANTS } from "../../../apps/web/src/app/api/admin/tenants/route";
import { GET as GET_JOBS } from "../../../apps/web/src/app/api/admin/jobs/route";
import { NelvyonAdminService } from "../NelvyonAdminService";

function makeDb() {
  const tenants = [
    { id: "t1", user_id: "u1", company_name: "Acme", industry: "Retail", plan: "pro", onboarding_completed: true, created_at: new Date(), updated_at: new Date() },
    { id: "t2", user_id: "u2", company_name: "Beta", industry: "SaaS", plan: "starter", onboarding_completed: false, created_at: new Date(), updated_at: new Date() },
  ];
  const users = [
    { user_id: "u1", tenant_id: "auth-1", email: "a@acme.com", role: "admin" },
    { user_id: "u2", tenant_id: "auth-2", email: "b@beta.com", role: "member" },
  ];
  const jobs = [
    { job_id: "j1", service_id: "seo", client_id: "auth-1", status: "running", progress: 20, error: null, created_at: new Date(), updated_at: new Date() },
    { job_id: "j2", service_id: "ads", client_id: "auth-1", status: "completed", progress: 100, error: null, created_at: new Date(), updated_at: new Date() },
    { job_id: "j3", service_id: "seo", client_id: "auth-2", status: "failed", progress: 80, error: "x", created_at: new Date(), updated_at: new Date() },
  ];
  const contacts = [{ tenant_id: "t1" }, { tenant_id: "t1" }, { tenant_id: "t2" }];
  const campanias = [{ tenant_id: "t1" }, { tenant_id: "t2" }];
  const workflows = [{ tenant_id: "t1" }];
  const activity = [
    { id: "a1", tenant_id: "t1", event_type: "x", description: "first", metadata: {}, created_at: new Date(Date.now() + 10) },
    { id: "a2", tenant_id: "t2", event_type: "y", description: "second", metadata: {}, created_at: new Date(Date.now() + 20) },
  ];

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];
    if (s === "SELECT COUNT(*)::text AS n FROM saas_tenants") return [{ n: String(tenants.length) }] as T[];
    if (s.includes("FROM saas_tenants WHERE onboarding_completed = TRUE")) return [{ n: String(tenants.filter((t) => t.onboarding_completed).length) }] as T[];
    if (s === "SELECT COUNT(*)::text AS n FROM os_jobs") return [{ n: String(jobs.length) }] as T[];
    if (s.includes("FROM os_jobs WHERE status = 'running'")) return [{ n: String(jobs.filter((j) => j.status === "running").length) }] as T[];
    if (s.includes("FROM os_jobs WHERE status = 'completed'")) return [{ n: String(jobs.filter((j) => j.status === "completed").length) }] as T[];
    if (s.includes("FROM os_jobs WHERE status = 'failed'")) return [{ n: String(jobs.filter((j) => j.status === "failed").length) }] as T[];
    if (s === "SELECT COUNT(*)::text AS n FROM saas_contacts") return [{ n: String(contacts.length) }] as T[];
    if (s === "SELECT COUNT(*)::text AS n FROM saas_campanias") return [{ n: String(campanias.length) }] as T[];
    if (s === "SELECT COUNT(*)::text AS n FROM saas_workflows") return [{ n: String(workflows.length) }] as T[];

    if (s.startsWith("SELECT st.id, st.user_id, st.company_name") && s.includes("FROM saas_tenants st") && !s.includes("WHERE st.id = $1")) {
      let out = tenants.map((t) => {
        const u = users.find((x) => x.user_id === t.user_id);
        const jobsCount = jobs.filter((j) => j.client_id === (u?.tenant_id ?? "")).length;
        const lastActivity = activity.filter((a) => a.tenant_id === t.id).sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]?.created_at ?? null;
        return { ...t, user_email: u?.email ?? "", jobs_count: String(jobsCount), last_activity_at: lastActivity };
      });
      if (s.includes("st.plan = $1")) out = out.filter((x) => x.plan === String(p[0]));
      if (s.includes("st.company_name ILIKE")) {
        const term = String(p[p.length - 1]).replace(/%/g, "").toLowerCase();
        out = out.filter((x) => x.company_name.toLowerCase().includes(term));
      }
      return out as unknown as T[];
    }

    if (s.startsWith("SELECT st.id, st.user_id, st.company_name") && s.includes("WHERE st.id = $1")) {
      const row = tenants.find((x) => x.id === String(p[0]));
      if (!row) return [] as T[];
      const u = users.find((x) => x.user_id === row.user_id);
      const jobsCount = jobs.filter((j) => j.client_id === (u?.tenant_id ?? "")).length;
      const lastActivity = activity.filter((a) => a.tenant_id === row.id).sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]?.created_at ?? null;
      return [{ ...row, user_email: u?.email ?? "", jobs_count: String(jobsCount), last_activity_at: lastActivity }] as unknown as T[];
    }

    if (s.startsWith("SELECT COUNT(*)::text AS n FROM saas_contacts WHERE tenant_id = $1")) return [{ n: String(contacts.filter((c) => c.tenant_id === String(p[0])).length) }] as T[];
    if (s.startsWith("SELECT COUNT(*)::text AS n FROM saas_campanias WHERE tenant_id = $1")) return [{ n: String(campanias.filter((c) => c.tenant_id === String(p[0])).length) }] as T[];
    if (s.startsWith("SELECT COUNT(*)::text AS n FROM saas_workflows WHERE tenant_id = $1")) return [{ n: String(workflows.filter((c) => c.tenant_id === String(p[0])).length) }] as T[];
    if (s.startsWith("SELECT j.job_id, j.service_id, j.client_id") && s.includes("WHERE j.client_id = (SELECT nu.tenant_id")) {
      const user = users.find((u) => u.user_id === String(p[0]));
      return jobs.filter((j) => j.client_id === user?.tenant_id).slice(0, 10) as unknown as T[];
    }

    if (s.startsWith("SELECT nu.tenant_id") && s.includes("FROM saas_tenants st")) {
      const tenantId = String(p[0]);
      const t = tenants.find((x) => x.id === tenantId);
      const u = users.find((x) => x.user_id === t?.user_id);
      return u ? ([{ tenant_id: u.tenant_id }] as unknown as T[]) : ([] as T[]);
    }

    if (s.startsWith("SELECT j.job_id, j.service_id, j.client_id, j.status")) {
      let out = [...jobs];
      let i = 0;
      if (s.includes("j.status = $1")) out = out.filter((j) => j.status === String(p[i++]));
      if (s.includes("j.service_id = $2") || s.includes("j.service_id = $1")) out = out.filter((j) => j.service_id === String(p[i++]));
      if (s.includes("j.client_id = $1") || s.includes("j.client_id = $2") || s.includes("j.client_id = $3")) out = out.filter((j) => j.client_id === String(p[i]));
      return out as unknown as T[];
    }

    if (s.startsWith("SELECT id, tenant_id, event_type, description, metadata, created_at FROM saas_activity_log")) {
      const limit = Number(p[0] ?? 20);
      return [...activity].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, limit) as unknown as T[];
    }

    if (s.startsWith("SELECT role FROM os_users WHERE id = $1 LIMIT 1")) {
      return [] as T[];
    }
    if (s.startsWith("SELECT role FROM nelvyon_users WHERE user_id = $1 LIMIT 1")) {
      const row = users.find((u) => u.user_id === String(p[0]));
      return (row ? [{ role: row.role }] : []) as T[];
    }
    return [] as T[];
  }

  return { query };
}

describe("NelvyonAdminService", () => {
  it("getSystemStats retorna estructura correcta", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const s = await svc.getSystemStats();
    expect(typeof s.totalTenants).toBe("number");
    expect(typeof s.runningJobs).toBe("number");
  });
  it("getSystemStats cuenta totalTenants correctamente", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const s = await svc.getSystemStats();
    expect(s.totalTenants).toBe(2);
  });
  it("getSystemStats cuenta runningJobs correctamente", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const s = await svc.getSystemStats();
    expect(s.runningJobs).toBe(1);
  });
  it("getTenants retorna array con email del usuario", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getTenants();
    expect(out[0]?.userEmail).toBeTruthy();
  });
  it("getTenants filtra por plan", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getTenants({ plan: "starter" });
    expect(out).toHaveLength(1);
  });
  it("getTenants filtra por search (company_name)", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getTenants({ search: "acm" });
    expect(out).toHaveLength(1);
  });
  it("getTenant retorna null si no existe", async () => {
    const svc = new NelvyonAdminService(makeDb());
    await expect(svc.getTenant("missing")).resolves.toBeNull();
  });
  it("getTenant retorna detalle completo con counts", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getTenant("t1");
    expect(out?.contactsCount).toBe(2);
    expect(Array.isArray(out?.recentJobs)).toBe(true);
  });
  it("getJobs retorna todos los jobs", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getJobs();
    expect(out).toHaveLength(3);
  });
  it("getJobs filtra por status", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getJobs({ status: "running" });
    expect(out).toHaveLength(1);
  });
  it("getJobs filtra por tenantId", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getJobs({ tenantId: "t1" });
    expect(out).toHaveLength(2);
  });
  it("getRecentActivity retorna límite correcto", async () => {
    const svc = new NelvyonAdminService(makeDb());
    const out = await svc.getRecentActivity(1);
    expect(out).toHaveLength(1);
  });
});

describe("API admin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Admin.resetNelvyonAdminServiceForTests();
  });

  it("API GET /api/admin/stats → 403 si no es admin", async () => {
    const svc = new NelvyonAdminService(makeDb());
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u2", email: "x", tenantId: "auth-2", plan: "free" });
    vi.spyOn(Admin, "getNelvyonAdminService").mockReturnValue(svc);
    const res = await GET_STATS(new Request("https://app.test/api/admin/stats"));
    expect(res.status).toBe(403);
  });
  it("API GET /api/admin/stats → 200 con SystemStats si es admin", async () => {
    const svc = new NelvyonAdminService(makeDb());
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "x", tenantId: "auth-1", plan: "free" });
    vi.spyOn(Admin, "getNelvyonAdminService").mockReturnValue(svc);
    const res = await GET_STATS(new Request("https://app.test/api/admin/stats"));
    expect(res.status).toBe(200);
  });
  it("API GET /api/admin/tenants → 403 si no es admin", async () => {
    const svc = new NelvyonAdminService(makeDb());
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u2", email: "x", tenantId: "auth-2", plan: "free" });
    vi.spyOn(Admin, "getNelvyonAdminService").mockReturnValue(svc);
    const res = await GET_TENANTS(new Request("https://app.test/api/admin/tenants"));
    expect(res.status).toBe(403);
  });
  it("API GET /api/admin/tenants → 200 con lista si es admin", async () => {
    const svc = new NelvyonAdminService(makeDb());
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "x", tenantId: "auth-1", plan: "free" });
    vi.spyOn(Admin, "getNelvyonAdminService").mockReturnValue(svc);
    const res = await GET_TENANTS(new Request("https://app.test/api/admin/tenants"));
    expect(res.status).toBe(200);
  });
  it("API GET /api/admin/jobs → 200 con filtros aplicados", async () => {
    const svc = new NelvyonAdminService(makeDb());
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "x", tenantId: "auth-1", plan: "free" });
    vi.spyOn(Admin, "getNelvyonAdminService").mockReturnValue(svc);
    const res = await GET_JOBS(new Request("https://app.test/api/admin/jobs?status=running"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { jobs: Array<{ status: string }> };
    expect(body.jobs[0]?.status).toBe("running");
  });
});
