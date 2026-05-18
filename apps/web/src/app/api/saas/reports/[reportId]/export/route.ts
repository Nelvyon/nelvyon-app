import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { resolveArtifactZipPath } from "@nelvyon/os-agents/artifacts/artifactPublisher";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const claims = await authenticate(req);
    const { reportId } = await context.params;
    if (!reportId?.trim()) {
      return NextResponse.json({ error: "reportId requerido" }, { status: 400 });
    }

    const filePath = resolveArtifactZipPath(claims.tenantId, reportId, "saas-dashboard-report");
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
    if (err instanceof OsAgentError && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
