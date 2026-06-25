import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasAutopilotService,
  SaasAutopilotError,
  requireSaasContext,
  type UpdateAutopilotInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasAutopilotService();
    const status = await svc.getStatus(ctx.tenant.id);
    return NextResponse.json({ status });
  } catch (e) {
    if (e instanceof SaasAutopilotError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[autopilot GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as UpdateAutopilotInput;
    const svc = getSaasAutopilotService();
    const settings = await svc.updateSettings(ctx.tenant.id, body);
    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof SaasAutopilotError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[autopilot PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
