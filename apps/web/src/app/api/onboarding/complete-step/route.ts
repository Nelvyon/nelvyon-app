import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { completeStep, type OnboardingStep } from "@nelvyon/onboarding";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const VALID_STEPS: OnboardingStep[] = ["welcome_email_sent", "profile_completed", "first_agent_used", "plan_activated"];

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const step = typeof body === "object" && body !== null && "step" in body ? (body as { step?: unknown }).step : undefined;
    if (typeof step !== "string" || !VALID_STEPS.includes(step as OnboardingStep)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }
    await completeStep(claims.userId, step as OnboardingStep);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
