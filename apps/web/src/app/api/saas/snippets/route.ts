import { NextResponse } from "next/server";
import {
  getSaasSnippetsService,
  SaasSnippetsError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSnippetsError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    const snippets = await getSaasSnippetsService().list(ctx.tenant.id, search);
    return NextResponse.json({ snippets });
  } catch (e: unknown) {
    if (e instanceof SaasSnippetsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const snippet = await getSaasSnippetsService().create(ctx.tenant.id, ctx.claims.userId ?? null, {
      name: typeof b.name === "string" ? b.name : "",
      shortcut: typeof b.shortcut === "string" ? b.shortcut : null,
      content: typeof b.content === "string" ? b.content : "",
      channels: Array.isArray(b.channels) ? b.channels.filter((x): x is string => typeof x === "string") : [],
      variables: Array.isArray(b.variables) ? b.variables.filter((x): x is string => typeof x === "string") : [],
    });
    return NextResponse.json({ snippet }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSnippetsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    const snippet = await getSaasSnippetsService().update(ctx.tenant.id, b.id, {
      name: typeof b.name === "string" ? b.name : undefined,
      shortcut: typeof b.shortcut === "string" ? b.shortcut : undefined,
      content: typeof b.content === "string" ? b.content : undefined,
    });
    return NextResponse.json({ snippet });
  } catch (e: unknown) {
    if (e instanceof SaasSnippetsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
