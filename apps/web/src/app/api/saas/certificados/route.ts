import { NextResponse } from "next/server";
import {
  getSaasLmsService,
  SaasLmsError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasLmsError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/certificados — issued LMS certificates + pending enrollments */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasLmsService();
    const [certificates, pending] = await Promise.all([
      svc.listCertificates(ctx.tenant.id),
      svc.listPendingCertificates(ctx.tenant.id),
    ]);
    return NextResponse.json({ certificates, pending });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/certificados — issue certificate for enrollment */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const enrollmentId = typeof b.enrollment_id === "string" ? b.enrollment_id : "";
    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
    }
    const cert = await getSaasLmsService().issueCertificate(ctx.tenant.id, enrollmentId);
    return NextResponse.json({ certificate: cert }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasLmsError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
