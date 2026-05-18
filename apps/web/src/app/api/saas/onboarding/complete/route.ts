import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getNelvyonEmailService } from "@nelvyon/email";
import { getSaasOnboardingService, SaasOnboardingError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

function mapSaasError(e: SaasOnboardingError): { status: number; body: { error: string; code: string } } {
  switch (e.code) {
    case "NOT_FOUND":
      return { status: 404, body: { error: e.message, code: e.code } };
    case "ONBOARDING_INCOMPLETE":
    case "VALIDATION":
    case "CONSTRAINT":
    case "INVALID_STEP":
      return { status: 400, body: { error: e.message, code: e.code } };
    default:
      return { status: 400, body: { error: e.message, code: e.code } };
  }
}

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const svc = getSaasOnboardingService();
    try {
      const tenant = await svc.completeOnboarding(claims.userId);
      void getNelvyonEmailService()
        .sendOnboardingComplete(
          claims.email,
          "Cliente",
          tenant.companyName,
          `${process.env.APP_URL ?? "https://app.nelvyon.com"}/saas/dashboard`,
        )
        .catch((err) => {
          console.error("[Email] onboarding complete send failed:", err);
        });
      return NextResponse.json({ tenant });
    } catch (err) {
      if (err instanceof SaasOnboardingError) {
        const m = mapSaasError(err);
        return NextResponse.json(m.body, { status: m.status });
      }
      throw err;
    }
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
