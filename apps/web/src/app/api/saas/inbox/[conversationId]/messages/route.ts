import { NextResponse } from "next/server";
import {
  getSaasInboxService,
  SaasInboxError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasInboxError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const messages = await getSaasInboxService().listMessages(ctx.tenant.id, params.conversationId);
    return NextResponse.json({ messages });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const message = await getSaasInboxService().sendMessage(ctx.tenant.id, params.conversationId, {
      body: typeof b.body === "string" ? b.body : "",
      direction: b.direction === "inbound" ? "inbound" : "outbound",
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasInboxError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
