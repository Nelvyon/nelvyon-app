export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  DragDropWorkflowService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const svc = new DragDropWorkflowService();
    const workflows = await svc.listWorkflows(ctx.claims.userId);
    return NextResponse.json({ workflows });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = new DragDropWorkflowService();

    if (body.action === "publish-saas") {
      const visualId = String(body.visualWorkflowId ?? "");
      await svc.attachTenant(visualId, ctx.claims.userId, ctx.tenant.id);
      const published = await svc.publishAsSaasWorkflow(visualId, ctx.claims.userId, ctx.tenant.id);
      return NextResponse.json(published, { status: 201 });
    }

    const created = await svc.createWorkflow(
      ctx.claims.userId,
      String(body.name ?? "Nuevo flujo"),
      body.description ? String(body.description) : null,
      Array.isArray(body.nodes) ? body.nodes : [],
      Array.isArray(body.edges) ? body.edges : [],
    );
    return NextResponse.json({ workflow: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = new DragDropWorkflowService();
    const updated = await svc.updateWorkflow(
      String(body.id),
      ctx.claims.userId,
      String(body.name ?? "Flujo"),
      Array.isArray(body.nodes) ? body.nodes : [],
      Array.isArray(body.edges) ? body.edges : [],
    );
    return NextResponse.json({ workflow: updated });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
