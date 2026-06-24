import { NextResponse } from "next/server";
import {
  getSaasKlaviyoService,
  SaasKlaviyoError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasKlaviyoError): NextResponse {
  const status = e.code === "NOT_CONFIGURED" ? 422 : e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/klaviyo?resource=status|lists|campaigns */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    void ctx; // auth check only
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "status";

    if (resource === "lists") {
      const lists = await getSaasKlaviyoService().getLists();
      return NextResponse.json({ lists });
    }
    if (resource === "campaigns") {
      const campaigns = await getSaasKlaviyoService().getCampaigns();
      return NextResponse.json({ campaigns });
    }
    const status = await getSaasKlaviyoService().getStatus();
    return NextResponse.json({ status });
  } catch (e: unknown) {
    if (e instanceof SaasKlaviyoError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/klaviyo — { action: "add_profile", list_id, email, first_name?, last_name?, phone? } */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    void ctx;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "add_profile") {
      const profile = await getSaasKlaviyoService().addProfile(
        typeof b.list_id === "string" ? b.list_id : "",
        typeof b.email === "string" ? b.email : "",
        typeof b.first_name === "string" ? b.first_name : undefined,
        typeof b.last_name === "string" ? b.last_name : undefined,
        typeof b.phone === "string" ? b.phone : undefined,
      );
      return NextResponse.json({ profile }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasKlaviyoError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
