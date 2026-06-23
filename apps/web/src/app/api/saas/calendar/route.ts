import { NextResponse } from "next/server";
import {
  getSaasCalendarService,
  SaasCalendarError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type CalendarEventType,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasCalendarError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const events = await getSaasCalendarService().list(ctx.tenant.id, {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
    return NextResponse.json({ events });
  } catch (e: unknown) {
    if (e instanceof SaasCalendarError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const event = await getSaasCalendarService().create(ctx.tenant.id, {
      title: typeof b.title === "string" ? b.title : "",
      type: typeof b.type === "string" ? (b.type as CalendarEventType) : "task",
      eventDate: typeof b.event_date === "string" ? b.event_date : "",
      eventTime: typeof b.event_time === "string" ? b.event_time : null,
      durationMinutes: typeof b.duration_minutes === "number" ? b.duration_minutes : null,
      color: typeof b.color === "string" ? b.color : null,
      contactId: typeof b.contact_id === "string" ? b.contact_id : null,
      assignedTo: typeof b.assigned_to === "string" ? b.assigned_to : null,
      notes: typeof b.notes === "string" ? b.notes : null,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasCalendarError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
