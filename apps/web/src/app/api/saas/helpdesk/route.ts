import { NextResponse } from "next/server";
import {
  getSaasHelpdeskService,
  SaasHelpdeskError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type TicketStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasHelpdeskError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/helpdesk?status=open|in_progress|resolved|closed */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TicketStatus | null;
    const tickets = await getSaasHelpdeskService().list(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ tickets });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/helpdesk
 *  action="message" → add message to ticket
 *  action="update"  → update status/priority/assignedTo
 *  default          → create ticket
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "message") {
      const msg = await getSaasHelpdeskService().addMessage(
        ctx.tenant.id,
        typeof b.ticket_id === "string" ? b.ticket_id : "",
        typeof b.body === "string" ? b.body : "",
        typeof b.author === "string" ? b.author : "agent",
        b.is_internal === true,
      );
      return NextResponse.json({ message: msg }, { status: 201 });
    }

    if (b.action === "update") {
      const ticket = await getSaasHelpdeskService().update(ctx.tenant.id, typeof b.id === "string" ? b.id : "", {
        status: typeof b.status === "string" ? b.status as TicketStatus : undefined,
        assignedTo: typeof b.assigned_to === "string" ? b.assigned_to : undefined,
      });
      return NextResponse.json({ ticket });
    }

    const ticket = await getSaasHelpdeskService().create(ctx.tenant.id, {
      subject: typeof b.subject === "string" ? b.subject : "",
      description: typeof b.description === "string" ? b.description : null,
      contactName: typeof b.contactName === "string" ? b.contactName : (typeof b.contact_name === "string" ? b.contact_name : ""),
      contactEmail: typeof b.contactEmail === "string" ? b.contactEmail : (typeof b.contact_email === "string" ? b.contact_email : ""),
      priority: typeof b.priority === "string" ? b.priority as "low" | "medium" | "high" | "urgent" : undefined,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/helpdesk?id=uuid */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    await getSaasHelpdeskService().delete(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
