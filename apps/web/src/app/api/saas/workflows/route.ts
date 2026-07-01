import { NextResponse } from "next/server";

import {
  getSaasWorkflowService,
  isSesEnvConfigured,
  requireSaasContext,
  SaasWorkflowError,
  saasErrorBody,
  saasErrorStatus,
  type TriggerType,
  type WorkflowStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWorkflowError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

const ALL_TRIGGERS = [
  "contact_created","contact_updated","stage_changed","deal_stage_changed",
  "job_completed","manual","scheduled","form_submitted","tag_added",
  "email_opened","email_clicked","webhook_in","date_reached",
  "sequence_enrolled","review_received","score_threshold",
] as const;

const ALL_ACTIONS = [
  "send_email","update_contact","change_stage","change_deal_stage","add_deal_note",
  "create_activity","create_deal_activity","notify","delay_minutes","webhook_out",
  "add_tag","send_sms","send_whatsapp","log_call_activity",
  "enroll_sequence","create_task","update_field",
] as const;

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const { searchParams } = new URL(req.url);
    if (searchParams.get("resource") === "meta") {
      return NextResponse.json({ triggers: ALL_TRIGGERS, actions: ALL_ACTIONS });
    }
    const workflows = await getSaasWorkflowService().getWorkflows(ctx.tenant.id);
    const ses_configured = isSesEnvConfigured();
    return NextResponse.json({ workflows, ses_configured });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (typeof b.name !== "string" || b.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof b.triggerType !== "string") {
      return NextResponse.json({ error: "triggerType is required" }, { status: 400 });
    }
    const workflow = await getSaasWorkflowService().createWorkflow(ctx.tenant.id, {
      name: b.name,
      description: typeof b.description === "string" ? b.description : null,
      status: typeof b.status === "string" ? (b.status as WorkflowStatus) : undefined,
      triggerType: b.triggerType as TriggerType,
      triggerConfig:
        typeof b.triggerConfig === "object" && b.triggerConfig !== null
          ? (b.triggerConfig as Record<string, unknown>)
          : {},
      conditions: Array.isArray(b.conditions) ? (b.conditions as []) : [],
      actions: Array.isArray(b.actions) ? (b.actions as []) : [],
    });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
