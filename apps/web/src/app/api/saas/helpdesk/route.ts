export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasHelpdeskServiceV2,
  SaasHelpdeskErrorV2,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type TicketStatus,
  type TicketPriority,
  type SlaPolicy,
} from "@nelvyon/saas";

function mapErr(e: SaasHelpdeskErrorV2): NextResponse {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/helpdesk?status=open&id=uuid */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const svc = getSaasHelpdeskServiceV2();
    const id = searchParams.get("id");
    if (id) {
      const { ticket, messages } = await svc.get(ctx.tenant.id, id);
      return NextResponse.json({ ticket, messages });
    }
    if (searchParams.get("resource") === "macros") {
      const macros = await svc.listMacros(ctx.tenant.id);
      return NextResponse.json({ macros });
    }
    const status = searchParams.get("status") as TicketStatus | null;
    const tickets = await svc.list(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ tickets });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskErrorV2) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/helpdesk — action = message|update|apply-macro|create-macro|delete-macro|delete */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = await req.json() as Record<string, unknown>;
    const action = String(b.action ?? "");
    const svc = getSaasHelpdeskServiceV2();

    if (action === "message") {
      const msg = await svc.addMessage(
        ctx.tenant.id, String(b.ticket_id ?? ""), String(b.body ?? ""),
        String(b.author ?? "agent"), b.is_internal === true,
      );
      return NextResponse.json({ message: msg }, { status: 201 });
    }

    if (action === "update") {
      const ticket = await svc.update(ctx.tenant.id, String(b.id ?? ""), {
        status:     b.status     ? String(b.status)     as TicketStatus   : undefined,
        priority:   b.priority   ? String(b.priority)   as TicketPriority : undefined,
        assignedTo: b.assignedTo ? String(b.assignedTo) : undefined,
        slaPolicy:  b.slaPolicy  ? String(b.slaPolicy)  as SlaPolicy      : undefined,
      });
      return NextResponse.json({ ticket });
    }

    if (action === "apply-macro") {
      const ticket = await svc.applyMacro(ctx.tenant.id, String(b.ticketId ?? ""), String(b.macroId ?? ""));
      return NextResponse.json({ ticket });
    }

    if (action === "create-macro") {
      const macro = await svc.createMacro(ctx.tenant.id, {
        name: String(b.name ?? ""),
        actions: Array.isArray(b.actions) ? b.actions as Parameters<typeof svc.createMacro>[1]["actions"] : [],
      });
      return NextResponse.json({ macro }, { status: 201 });
    }

    if (action === "delete-macro") {
      await svc.deleteMacro(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await svc.delete(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    // default: create ticket
    const ticket = await svc.create(ctx.tenant.id, {
      subject:     String(b.subject     ?? ""),
      description: b.description ? String(b.description) : null,
      contactName: b.contactName ? String(b.contactName) : "",
      contactEmail: String(b.contactEmail ?? ""),
      priority:   b.priority  ? String(b.priority)  as TicketPriority : undefined,
      slaPolicy:  b.slaPolicy ? String(b.slaPolicy) as SlaPolicy      : undefined,
      assignedTo: b.assignedTo ? String(b.assignedTo) : null,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskErrorV2) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    await getSaasHelpdeskServiceV2().delete(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasHelpdeskErrorV2) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
