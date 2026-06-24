export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasSurveysService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");
    const svc = getSaasSurveysService();

    if (type === "qr") {
      const qrCodes = await svc.listQrCodes(ctx.tenant.id);
      return NextResponse.json({ qrCodes });
    }

    if (id) {
      if (url.searchParams.get("stats") === "true") {
        const stats = await svc.getSurveyStats(ctx.tenant.id, id);
        if (!stats) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        return NextResponse.json({ stats });
      }
      if (url.searchParams.get("responses") === "true") {
        const responses = await svc.listResponses(ctx.tenant.id, id);
        return NextResponse.json({ responses });
      }
      const survey = await svc.getSurvey(ctx.tenant.id, id);
      if (!survey) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ survey });
    }

    const surveys = await svc.listSurveys(
      ctx.tenant.id,
      (url.searchParams.get("surveyType") as Parameters<typeof svc.listSurveys>[1]) ?? undefined,
    );
    return NextResponse.json({ surveys });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const resourceType = body.resourceType as string | undefined;
    const svc = getSaasSurveysService();

    // QR codes
    if (resourceType === "qr") {
      if (action === "update") {
        const qr = await svc.updateQrCode(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.updateQrCode>[2]);
        if (!qr) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        return NextResponse.json({ qr });
      }
      const qr = await svc.createQrCode(ctx.tenant.id, body as unknown as Parameters<typeof svc.createQrCode>[1]);
      return NextResponse.json({ qr }, { status: 201 });
    }

    // Survey actions
    if (action === "submit_response") {
      const response = await svc.submitResponse(String(body.surveyId ?? ""), body as unknown as Parameters<typeof svc.submitResponse>[1]);
      return NextResponse.json({ response }, { status: 201 });
    }

    if (action === "enable_share") {
      const slug = await svc.enableShare(ctx.tenant.id, String(body.id ?? ""));
      return NextResponse.json({ slug });
    }

    if (action === "disable_share") {
      await svc.disableShare(ctx.tenant.id, String(body.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const survey = await svc.updateSurvey(ctx.tenant.id, String(body.id ?? ""), body as unknown as Parameters<typeof svc.updateSurvey>[2]);
      if (!survey) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ survey });
    }

    const survey = await svc.createSurvey(ctx.tenant.id, body as unknown as Parameters<typeof svc.createSurvey>[1]);
    return NextResponse.json({ survey }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const type = url.searchParams.get("type");
    const svc = getSaasSurveysService();

    if (type === "qr") {
      const ok = await svc.deleteQrCode(ctx.tenant.id, id);
      if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const ok = await svc.deleteSurvey(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
