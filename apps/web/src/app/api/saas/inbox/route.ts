import { NextResponse } from "next/server";
import {
  getSaasInboxService,
  SaasInboxError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type InboxChannel,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasInboxError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const svc = getSaasInboxService();

    if (url.searchParams.get("view") === "threads") {
      const threads = await svc.listThreads(ctx.tenant.id);
      return NextResponse.json({ threads });
    }

    if (url.searchParams.get("sla") === "at_risk") {
      const conversations = await svc.listSlaAtRisk(ctx.tenant.id);
      return NextResponse.json({ conversations });
    }

    const conversations = await svc.listConversations(ctx.tenant.id, {
      status: url.searchParams.get("status") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      assignedTo: url.searchParams.get("assigned_to") ?? undefined,
      threadId: url.searchParams.get("thread_id") ?? undefined,
    });
    return NextResponse.json({ conversations });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const svc = getSaasInboxService();

    if (b.action === "set_sla_policy") {
      const policy = await svc.setSlaPolicy(ctx.tenant.id, {
        firstResponseMinutes: typeof b.first_response_minutes === "number" ? b.first_response_minutes : undefined,
        resolutionMinutes: typeof b.resolution_minutes === "number" ? b.resolution_minutes : undefined,
        businessHoursOnly: typeof b.business_hours_only === "boolean" ? b.business_hours_only : undefined,
      });
      return NextResponse.json({ policy });
    }

    if (b.action === "get_sla_policy") {
      const policy = await svc.getSlaPolicy(ctx.tenant.id);
      return NextResponse.json({ policy });
    }

    if (b.action === "check_sla_breaches") {
      const breached = await svc.checkSlaBreaches(ctx.tenant.id);
      return NextResponse.json({ breached });
    }

    const conversation = await svc.createConversation(ctx.tenant.id, {
      contactId: typeof b.contact_id === "string" ? b.contact_id : null,
      channel: typeof b.channel === "string" ? (b.channel as InboxChannel) : "chat",
      assignedTo: typeof b.assigned_to === "string" ? b.assigned_to : null,
      firstMessage: typeof b.first_message === "string" ? b.first_message : undefined,
      subject: typeof b.subject === "string" ? b.subject : null,
      priority: typeof b.priority === "string" ? (b.priority as never) : undefined,
    });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
