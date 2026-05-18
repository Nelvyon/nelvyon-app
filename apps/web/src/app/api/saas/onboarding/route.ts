import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import {
  assertSaasPlan,
  getSaasOnboardingService,
  SaasOnboardingError,
  type CreateSaasTenantInput,
  type SaasPlan,
  type UpdateSaasTenantPatch,
} from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseGoals(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) {
    throw new SaasOnboardingError("goals must be an array of strings", "VALIDATION");
  }
  if (!v.every((x) => typeof x === "string")) {
    throw new SaasOnboardingError("goals must be an array of strings", "VALIDATION");
  }
  return v;
}

function parseOptionalString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") {
    throw new SaasOnboardingError("Invalid string field", "VALIDATION");
  }
  return v;
}

function mapSaasError(e: SaasOnboardingError): { status: number; body: { error: string; code: string } } {
  switch (e.code) {
    case "NOT_FOUND":
      return { status: 404, body: { error: e.message, code: e.code } };
    case "INVALID_STEP":
    case "VALIDATION":
    case "ONBOARDING_INCOMPLETE":
    case "CONSTRAINT":
      return { status: 400, body: { error: e.message, code: e.code } };
    default:
      return { status: 400, body: { error: e.message, code: e.code } };
  }
}

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const svc = getSaasOnboardingService();
    const tenant = await svc.getTenant(claims.userId);
    return NextResponse.json({ tenant });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
    }

    const stepRaw = body.step;
    let step: number | undefined;
    if (stepRaw !== undefined) {
      const n = Number(stepRaw);
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        return NextResponse.json({ error: "step must be an integer 1-4" }, { status: 400 });
      }
      step = n;
    }

    const companyName = typeof body.companyName === "string" ? body.companyName : undefined;
    const industry = typeof body.industry === "string" ? body.industry : undefined;
    let plan: SaasPlan | undefined;
    if (body.plan !== undefined) {
      if (typeof body.plan !== "string") {
        return NextResponse.json({ error: "plan must be a string" }, { status: 400 });
      }
      try {
        plan = assertSaasPlan(body.plan);
      } catch (err) {
        if (err instanceof SaasOnboardingError) {
          const m = mapSaasError(err);
          return NextResponse.json(m.body, { status: m.status });
        }
        throw err;
      }
    }

    let goals: string[] | undefined;
    try {
      goals = parseGoals(body.goals);
    } catch (err) {
      if (err instanceof SaasOnboardingError) {
        const m = mapSaasError(err);
        return NextResponse.json(m.body, { status: m.status });
      }
      throw err;
    }

    let website: string | null | undefined;
    let phone: string | null | undefined;
    let employees: string | null | undefined;
    try {
      website = parseOptionalString(body.website);
      phone = parseOptionalString(body.phone);
      employees = parseOptionalString(body.employees);
    } catch (err) {
      if (err instanceof SaasOnboardingError) {
        const m = mapSaasError(err);
        return NextResponse.json(m.body, { status: m.status });
      }
      throw err;
    }

    const svc = getSaasOnboardingService();
    let tenant = await svc.getTenant(claims.userId);

    if (!tenant) {
      if (typeof companyName !== "string" || typeof industry !== "string") {
        return NextResponse.json({ error: "companyName and industry are required for new tenant" }, { status: 400 });
      }
      const createPayload: CreateSaasTenantInput = {
        companyName,
        industry,
        plan,
        website: website ?? undefined,
        phone: phone ?? undefined,
        employees: employees ?? undefined,
        goals,
      };
      try {
        tenant = await svc.createTenant(claims.userId, createPayload);
      } catch (err) {
        if (err instanceof SaasOnboardingError) {
          const m = mapSaasError(err);
          return NextResponse.json(m.body, { status: m.status });
        }
        throw err;
      }
    }

    if (step !== undefined) {
      const patch: UpdateSaasTenantPatch = {};
      if (companyName !== undefined) patch.companyName = companyName;
      if (industry !== undefined) patch.industry = industry;
      if (plan !== undefined) patch.plan = plan;
      if (website !== undefined) patch.website = website;
      if (phone !== undefined) patch.phone = phone;
      if (employees !== undefined) patch.employees = employees;
      if (goals !== undefined) patch.goals = goals;
      try {
        tenant = await svc.updateOnboardingStep(claims.userId, step, patch);
      } catch (err) {
        if (err instanceof SaasOnboardingError) {
          const m = mapSaasError(err);
          return NextResponse.json(m.body, { status: m.status });
        }
        throw err;
      }
    }

    return NextResponse.json({ tenant });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
