import { NextResponse } from "next/server";
import { requirePublicApiContext } from "../../../../../lib/requirePublicApiContext";
import { getSaasCrmService, type ContactStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requirePublicApiContext(req, "crm.read");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const crm = getSaasCrmService();
    const contacts = await crm.getContacts(gate.ctx.tenantId);
    const page  = Math.max(1, Number(url.searchParams.get("page")  ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "25")));
    const offset = (page - 1) * limit;
    const paginated = contacts.slice(offset, offset + limit);
    return NextResponse.json({ data: paginated, total: contacts.length, page, limit }, { headers: gate.rateHeaders });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requirePublicApiContext(req, "crm.write");
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json() as Record<string, unknown>;
    const crm = getSaasCrmService();
    const contact = await crm.createContact(gate.ctx.tenantId, {
      name:    String(body.name    ?? "").trim(),
      email:   body.email   != null ? String(body.email)   : undefined,
      phone:   body.phone   != null ? String(body.phone)   : undefined,
      company: body.company != null ? String(body.company) : undefined,
      status:  body.status  != null ? String(body.status) as ContactStatus : undefined,
    });
    return NextResponse.json(contact, { status: 201, headers: gate.rateHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
