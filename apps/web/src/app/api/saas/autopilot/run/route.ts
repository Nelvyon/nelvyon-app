import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasAutopilotService,
  SaasAutopilotError,
  requireSaasContext,
  type AutopilotService,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SERVICES: AutopilotService[] = ["seo", "social", "reputation", "ads"];

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as { service?: string };
    const service = body.service as AutopilotService | undefined;

    if (!service || !VALID_SERVICES.includes(service)) {
      return NextResponse.json(
        { error: `service must be one of: ${VALID_SERVICES.join(", ")}` },
        { status: 400 },
      );
    }

    const svc = getSaasAutopilotService();
    const result = await svc.runNow(ctx.tenant.id, service);
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof SaasAutopilotError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[autopilot/run POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
