import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { resolveArtifactZipPath } from "@nelvyon/os-agents/artifacts/artifactPublisher";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const ctx = await requireSaasContext(req, "reports.generate");
    const { reportId } = await context.params;
    if (!reportId?.trim()) {
      return NextResponse.json({ error: "reportId requerido" }, { status: 400 });
    }

    const filePath = resolveArtifactZipPath(ctx.tenant.id, reportId, "saas-dashboard-report");
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="nelvyon-saas-dashboard-report.zip"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Invalid (clientId|jobId|artifact path)/i.test(message)) {
      return NextResponse.json({ error: "Identificador de informe inválido" }, { status: 400 });
    }
    if (message.includes("ENOENT") || (err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(err), { status: saasErrorStatus(err) });
  }
}
