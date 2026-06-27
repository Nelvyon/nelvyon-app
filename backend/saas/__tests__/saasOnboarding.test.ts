import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import { GET, POST } from "../../../apps/web/src/app/api/saas/onboarding/route";
import { POST as POST_COMPLETE } from "../../../apps/web/src/app/api/saas/onboarding/complete/route";
import {
  SaasOnboardingError,
  SaasOnboardingService,
  SaasPlanValidationError,
  assertSaasPlan,
  resetSaasOnboardingServiceForTests,
} from "../index";

const secret = process.env.JWT_SECRET as string;

type MemRow = {
  id: string;
  user_id: string;
  workspace_id: number | null;
  company_name: string;
  industry: string;
  plan: string;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: Date;
  updated_at: Date;
};

function makeMemoryDb(opts?: { failInsertCheck?: boolean }) {
  const byUser = new Map<string, MemRow>();

  async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();

    if (opts?.failInsertCheck && s.startsWith("INSERT INTO saas_tenants")) {
      const err = new Error("check violation");
      (err as { code: string }).code = "23514";
      throw err;
    }

    if (s.startsWith("INSERT INTO saas_tenants")) {
      const userId = params[0] as string;
      if (byUser.has(userId)) {
        return [] as T[];
      }
      const row: MemRow = {
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: null,
        company_name: params[1] as string,
        industry: params[2] as string,
        plan: params[3] as string,
        website: (params[4] as string | null) ?? null,
        phone: (params[5] as string | null) ?? null,
        employees: (params[6] as string | null) ?? null,
        goals: (params[7] as string[]) ?? [],
        onboarding_completed: false,
        onboarding_step: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      byUser.set(userId, row);
      return [row as unknown as T];
    }

    if (s.includes("FROM saas_tenants WHERE user_id") && s.startsWith("SELECT")) {
      const userId = params[0] as string;
      const r = byUser.get(userId);
      return (r ? [r] : []) as T[];
    }

    if (s.includes("onboarding_completed = TRUE")) {
      const userId = params[0] as string;
      const r = byUser.get(userId);
      if (!r) return [] as T[];
      const next = { ...r, onboarding_completed: true, updated_at: new Date() };
      byUser.set(userId, next);
      return [next as unknown as T];
    }

    if (s.includes("onboarding_step = $") || (s.startsWith("UPDATE saas_tenants SET") && s.includes("onboarding_step"))) {
      const userId = params[0] as string;
      const r = byUser.get(userId);
      if (!r) return [] as T[];
      const companyName = params[1] !== null ? (params[1] as string) : r.company_name;
      const industry = params[2] !== null ? (params[2] as string) : r.industry;
      const plan = params[3] !== null ? (params[3] as string) : r.plan;
      const website = params[4] !== null ? (params[4] as string | null) : r.website;
      const phone = params[5] !== null ? (params[5] as string | null) : r.phone;
      const employees = params[6] !== null ? (params[6] as string | null) : r.employees;
      const goals = params[7] !== null ? (params[7] as string[]) : r.goals;
      const step = params[8] as number;
      const next: MemRow = {
        ...r,
        company_name: companyName,
        industry,
        plan,
        website,
        phone,
        employees,
        goals,
        onboarding_step: step,
        updated_at: new Date(),
      };
      byUser.set(userId, next);
      return [next as unknown as T];
    }

    return [] as T[];
  }

  return {
    query,
    byUser,
  };
}

function authRequest(userId: string): Request {
  const token = jwt.sign(
    { userId, email: "t@test.com", tenantId: "ten-1", plan: "free" },
    secret,
    { expiresIn: "1h", algorithm: "HS256" },
  );
  return new Request("https://app.test/api/saas/onboarding", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("SaasOnboardingService", () => {
  const savedDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    resetSaasOnboardingServiceForTests();
  });

  afterEach(() => {
    if (savedDatabaseUrl !== undefined) process.env.DATABASE_URL = savedDatabaseUrl;
    else delete process.env.DATABASE_URL;
    resetSaasOnboardingServiceForTests();
  });

  it("createTenant crea registro correctamente", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    const t = await svc.createTenant("u1", { companyName: "Acme", industry: "Retail" });
    expect(t.userId).toBe("u1");
    expect(t.companyName).toBe("Acme");
    expect(t.onboardingStep).toBe(1);
    expect(t.onboardingCompleted).toBe(false);
  });

  it("getTenant retorna null si no existe", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await expect(svc.getTenant("ghost")).resolves.toBeNull();
  });

  it("getTenant retorna tenant si existe", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "A", industry: "B" });
    const t = await svc.getTenant("u1");
    expect(t?.companyName).toBe("A");
  });

  it("updateOnboardingStep avanza step correctamente", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "A", industry: "B" });
    const t = await svc.updateOnboardingStep("u1", 2, { plan: "pro" });
    expect(t.onboardingStep).toBe(2);
    expect(t.plan).toBe("pro");
  });

  it("updateOnboardingStep no permite step > 4", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "A", industry: "B" });
    await expect(svc.updateOnboardingStep("u1", 5, {})).rejects.toMatchObject({ code: "INVALID_STEP" });
  });

  it("completeOnboarding marca onboarding_completed = true", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "A", industry: "B" });
    await svc.updateOnboardingStep("u1", 4, {});
    const t = await svc.completeOnboarding("u1");
    expect(t.onboardingCompleted).toBe(true);
  });

  it("completeOnboarding falla si step < 4", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "A", industry: "B" });
    await svc.updateOnboardingStep("u1", 2, {});
    await expect(svc.completeOnboarding("u1")).rejects.toMatchObject({ code: "ONBOARDING_INCOMPLETE" });
  });

  it("Plan inválido es rechazado por la DB constraint (mapeo 23514)", async () => {
    const db = makeMemoryDb({ failInsertCheck: true });
    const svc = new SaasOnboardingService(db);
    await expect(svc.createTenant("u1", { companyName: "A", industry: "B" })).rejects.toMatchObject({ code: "CONSTRAINT" });
  });

  it("Tenant duplicado por user_id retorna el existente (upsert)", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    const a = await svc.createTenant("u1", { companyName: "First", industry: "X" });
    const b = await svc.createTenant("u1", { companyName: "Ignored", industry: "Y" });
    expect(b.id).toBe(a.id);
    expect(b.companyName).toBe("First");
  });

  it("assertSaasPlan valida planes", () => {
    expect(assertSaasPlan("pro")).toBe("pro");
    expect(() => assertSaasPlan("invalid")).toThrow(SaasPlanValidationError);
  });
});

describe("API SaaS onboarding", () => {
  const savedDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    resetSaasOnboardingServiceForTests();
  });

  afterEach(() => {
    if (savedDatabaseUrl !== undefined) process.env.DATABASE_URL = savedDatabaseUrl;
    else delete process.env.DATABASE_URL;
    vi.restoreAllMocks();
    resetSaasOnboardingServiceForTests();
  });

  it("GET /api/saas/onboarding → 401 sin auth", async () => {
    const res = await GET(new Request("https://app.test/api/saas/onboarding"));
    expect(res.status).toBe(401);
  });

  it("GET /api/saas/onboarding → 200 con tenant existente", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u1", { companyName: "Co", industry: "Tech" });
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u1",
      email: "t@test.com",
      tenantId: "ten-1",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const res = await GET(authRequest("u1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenant: { companyName: string } | null };
    expect(body.tenant?.companyName).toBe("Co");
  });

  it("POST /api/saas/onboarding → crea tenant con datos válidos", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u2",
      email: "t2@test.com",
      tenantId: "ten-2",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const req = new Request("https://app.test/api/saas/onboarding", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: "u2", email: "t2@test.com", tenantId: "ten-2", plan: "free" }, secret, { expiresIn: "1h" })}`, "Content-Type": "application/json" },
      body: JSON.stringify({ step: 2, companyName: "Nova", industry: "SaaS" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenant: { companyName: string; onboardingStep: number } };
    expect(body.tenant.companyName).toBe("Nova");
    expect(body.tenant.onboardingStep).toBe(2);
  });

  it("POST /api/saas/onboarding → 400 con datos inválidos", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u3",
      email: "t3@test.com",
      tenantId: "ten-3",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const req = new Request("https://app.test/api/saas/onboarding", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt.sign({ userId: "u3", email: "t3@test.com", tenantId: "ten-3", plan: "free" }, secret, { expiresIn: "1h" })}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyName: "Only" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/saas/onboarding/complete → 200 si step = 4", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u4", { companyName: "X", industry: "Y" });
    await svc.updateOnboardingStep("u4", 4, {});
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u4",
      email: "t4@test.com",
      tenantId: "ten-4",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const req = new Request("https://app.test/api/saas/onboarding/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: "u4", email: "t4@test.com", tenantId: "ten-4", plan: "free" }, secret, { expiresIn: "1h" })}` },
    });
    const res = await POST_COMPLETE(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenant: { onboardingCompleted: boolean } };
    expect(body.tenant.onboardingCompleted).toBe(true);
  });

  it("POST /api/saas/onboarding/complete → 400 si onboarding incompleto", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u5", { companyName: "X", industry: "Y" });
    await svc.updateOnboardingStep("u5", 2, {});
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u5",
      email: "t5@test.com",
      tenantId: "ten-5",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const req = new Request("https://app.test/api/saas/onboarding/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ userId: "u5", email: "t5@test.com", tenantId: "ten-5", plan: "free" }, secret, { expiresIn: "1h" })}` },
    });
    const res = await POST_COMPLETE(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/saas/onboarding rechaza plan inválido", async () => {
    const db = makeMemoryDb();
    const svc = new SaasOnboardingService(db);
    await svc.createTenant("u6", { companyName: "X", industry: "Y" });
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "u6",
      email: "t6@test.com",
      tenantId: "ten-6",
      plan: "free",
    });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue(svc);

    const req = new Request("https://app.test/api/saas/onboarding", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt.sign({ userId: "u6", email: "t6@test.com", tenantId: "ten-6", plan: "free" }, secret, { expiresIn: "1h" })}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ step: 3, plan: "ultra" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
