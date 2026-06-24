import { NextResponse } from "next/server";
import {
  getSaasSocialService,
  SaasSocialError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSocialError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const accounts = await getSaasSocialService().listAccounts(ctx.tenant.id);
    return NextResponse.json({ accounts });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — connect a social account (token must be obtained via OAuth UI separately) */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const account = await getSaasSocialService().connectAccount(ctx.tenant.id, {
      platform: b.platform as "meta",
      accountId: typeof b.account_id === "string" ? b.account_id : "",
      accountName: typeof b.account_name === "string" ? b.account_name : "",
      pageId: typeof b.page_id === "string" ? b.page_id : undefined,
      accessToken: typeof b.access_token === "string" ? b.access_token : "",
      tokenExpiresAt: typeof b.token_expires_at === "string" ? b.token_expires_at : undefined,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasSocialService().disconnectAccount(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
