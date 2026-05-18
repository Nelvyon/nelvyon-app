import { NextResponse } from "next/server";

import { downloadArtifactZip } from "../../_lib/downloadArtifactZip";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    return await downloadArtifactZip(
      req,
      jobId,
      "content-bundle",
      "nelvyon-content-bundle.zip",
      "Bundle de contenido no encontrado",
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
