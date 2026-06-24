import { NextResponse } from "next/server";
import {
  getSaasFunnelService,
  SaasFunnelError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type UpdateFunnelInput,
  type CreateFunnelStepInput,
  type UpdateFunnelStepInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ funnelId: string }> };

function mapError(e: SaasFunnelError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/funnels/[funnelId]?resource=analytics */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.read");
    const { funnelId } = await ctx.params;
    const { searchParams } = new URL(req.url);

    if (searchParams.get("resource") === "analytics") {
      const analytics = await getSaasFunnelService().getAnalytics(saasCtx.tenant.id, funnelId);
      return NextResponse.json({ analytics });
    }

    const funnel = await getSaasFunnelService().get(saasCtx.tenant.id, funnelId);
    if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    return NextResponse.json({ funnel });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST /api/saas/funnels/[funnelId]
 * action="publish"  → publish funnel
 * action="step"     → add step (body: CreateFunnelStepInput)
 * action="track_visitor"   → body: { step_id }
 * action="track_conversion" → body: { step_id }
 * action="update_step" → body: { step_id, ...UpdateFunnelStepInput }
 * action="delete_step" → body: { step_id }
 * default           → update funnel (UpdateFunnelInput)
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { funnelId } = await ctx.params;
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const svc = getSaasFunnelService();

    if (body.action === "publish") {
      const funnel = await svc.publish(saasCtx.tenant.id, funnelId);
      return NextResponse.json({ funnel });
    }

    if (body.action === "step") {
      const step = await svc.addStep(saasCtx.tenant.id, funnelId, body as unknown as CreateFunnelStepInput);
      return NextResponse.json({ step }, { status: 201 });
    }

    if (body.action === "update_step") {
      const stepId = typeof body.step_id === "string" ? body.step_id : "";
      if (!stepId) return NextResponse.json({ error: "step_id required" }, { status: 400 });
      const input: UpdateFunnelStepInput = {
        name: typeof body.name === "string" ? body.name : undefined,
        type: typeof body.type === "string" ? body.type as UpdateFunnelStepInput["type"] : undefined,
        content: typeof body.content === "string" ? body.content : undefined,
        ctaLabel: typeof body.cta_label === "string" ? body.cta_label : undefined,
        ctaUrl: typeof body.cta_url === "string" ? body.cta_url : undefined,
        stepOrder: typeof body.step_order === "number" ? body.step_order : undefined,
      };
      const step = await svc.updateStep(saasCtx.tenant.id, stepId, input);
      return NextResponse.json({ step });
    }

    if (body.action === "delete_step") {
      const stepId = typeof body.step_id === "string" ? body.step_id : "";
      if (!stepId) return NextResponse.json({ error: "step_id required" }, { status: 400 });
      await svc.deleteStep(saasCtx.tenant.id, stepId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "track_visitor") {
      const stepId = typeof body.step_id === "string" ? body.step_id : "";
      if (!stepId) return NextResponse.json({ error: "step_id required" }, { status: 400 });
      await svc.trackVisitor(saasCtx.tenant.id, stepId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "track_conversion") {
      const stepId = typeof body.step_id === "string" ? body.step_id : "";
      if (!stepId) return NextResponse.json({ error: "step_id required" }, { status: 400 });
      await svc.trackConversion(saasCtx.tenant.id, stepId);
      return NextResponse.json({ ok: true });
    }

    // Default: update funnel metadata
    const input: UpdateFunnelInput = {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      status: typeof body.status === "string" ? body.status as UpdateFunnelInput["status"] : undefined,
    };
    const funnel = await svc.update(saasCtx.tenant.id, funnelId, input);
    return NextResponse.json({ funnel });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/funnels/[funnelId] */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const saasCtx = await requireSaasContext(req, "contacts.write");
    const { funnelId } = await ctx.params;
    await getSaasFunnelService().delete(saasCtx.tenant.id, funnelId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
