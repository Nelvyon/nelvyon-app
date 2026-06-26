import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasComplianceVaultService,
  SaasComplianceVaultError,
  requireSaasContext,
  type AttachDocumentInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { artifactId } = await params;
    const svc = getSaasComplianceVaultService();
    const artifact = await svc.getArtifact(ctx.tenant.id, artifactId);
    return NextResponse.json({ artifact });
  } catch (e) {
    if (e instanceof SaasComplianceVaultError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[compliance/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const { artifactId } = await params;
    const body = (await req.json()) as {
      action?: "attach" | "verify" | "revoke";
      legalDocUrl?: string;
      qaPdfUrl?: string;
      contentHash?: string;
      metadata?: Record<string, unknown>;
      userId?: string;
      reason?: string;
    };

    const svc = getSaasComplianceVaultService();

    if (body.action === "verify") {
      const artifact = await svc.verifyArtifact(ctx.tenant.id, artifactId, body.userId);
      return NextResponse.json({ artifact });
    }
    if (body.action === "revoke") {
      const artifact = await svc.revokeArtifact(ctx.tenant.id, artifactId, body.reason);
      return NextResponse.json({ artifact });
    }

    // default: attach
    const input: AttachDocumentInput = {
      legalDocUrl: body.legalDocUrl,
      qaPdfUrl: body.qaPdfUrl,
      contentHash: body.contentHash,
      metadata: body.metadata,
    };
    const artifact = await svc.attachDocument(ctx.tenant.id, artifactId, input);
    return NextResponse.json({ artifact });
  } catch (e) {
    if (e instanceof SaasComplianceVaultError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[compliance/[id] PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
