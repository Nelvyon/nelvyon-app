import { NextResponse } from "next/server";

import {
  getSaasCampaniasService,
  requireSaasContext,
  SaasCampaniasError,
  saasErrorBody,
  saasErrorStatus,
  type CampaniaChannel,
  type CampaniaStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasCampaniasError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "campanias.read");
    const campanias = await getSaasCampaniasService().getCampanias(ctx.tenant.id);
    const ses_configured = Boolean(process.env.SES_FROM_EMAIL && process.env.SES_ACCESS_KEY_ID);
    return NextResponse.json({ campanias, ses_configured });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "campanias.write");
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
    if (typeof b.name !== "string" || b.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof b.body !== "string" || b.body.trim().length === 0) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    if (typeof b.channel !== "string") {
      return NextResponse.json({ error: "channel is required" }, { status: 400 });
    }
    const campania = await getSaasCampaniasService().createCampania(ctx.tenant.id, {
      name: b.name,
      description: typeof b.description === "string" ? b.description : null,
      status: typeof b.status === "string" ? (b.status as CampaniaStatus) : undefined,
      channel: b.channel as CampaniaChannel,
      subject: typeof b.subject === "string" ? b.subject : null,
      body: b.body,
      ctaText: typeof b.ctaText === "string" ? b.ctaText : null,
      ctaUrl: typeof b.ctaUrl === "string" ? b.ctaUrl : null,
      audienceFilter:
        typeof b.audienceFilter === "object" && b.audienceFilter !== null
          ? (b.audienceFilter as Record<string, unknown>)
          : {},
    });
    return NextResponse.json({ campania }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
