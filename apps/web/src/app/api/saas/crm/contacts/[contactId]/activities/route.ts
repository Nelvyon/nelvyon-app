import { NextResponse } from "next/server";

import {
  getSaasCrmService,
  requireSaasContext,
  SaasCrmError,
  saasErrorBody,
  saasErrorStatus,
  type ActivityType,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasCrmError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, context: { params: Promise<{ contactId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { contactId } = await context.params;
    const activity = await getSaasCrmService().getActivities(contactId, ctx.tenant.id);
    return NextResponse.json({ activity });
  } catch (e: unknown) {
    if (e instanceof SaasCrmError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request, context: { params: Promise<{ contactId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { contactId } = await context.params;
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
    if (typeof b.activityType !== "string" || b.activityType.trim().length === 0) {
      return NextResponse.json({ error: "activityType is required" }, { status: 400 });
    }
    if (typeof b.description !== "string" || b.description.trim().length === 0) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    const activity = await getSaasCrmService().addActivity(contactId, ctx.tenant.id, {
      activityType: b.activityType as ActivityType,
      description: b.description,
      scheduledAt: typeof b.scheduledAt === "string" ? b.scheduledAt : null,
      completed: b.completed === true,
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasCrmError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
