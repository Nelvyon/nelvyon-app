import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  resolveArtifactZipPath,
  type OsArtifactKind,
} from "../../../../../../../backend/os-agents/artifacts/artifactPublisher";

export async function downloadArtifactZip(
  req: Request,
  jobId: string,
  kind: OsArtifactKind,
  downloadFilename: string,
  notFoundLabel: string,
): Promise<NextResponse> {
  const claims = await authenticate(req);
  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  }

  const rows = await DbClient.getInstance().query<{ id: string }>(
    `SELECT id FROM os_assets
     WHERE job_id = $1 AND client_id = $2 AND type = 'document'
     ORDER BY created_at DESC LIMIT 1`,
    [jobId, claims.tenantId],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: notFoundLabel }, { status: 404 });
  }

  const filePath = resolveArtifactZipPath(claims.tenantId, jobId, kind);
  const buffer = await readFile(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadFilename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
