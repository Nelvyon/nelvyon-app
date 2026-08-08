import { NextResponse } from "next/server";

import { ChangelogService } from "../../../../../../backend/changelog/ChangelogService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  // Mismo motivo que en /api/changelog: sin captura, un fallo del servicio
  // devolvia un 500 con cuerpo vacio y rompia la pagina publica /roadmap.
  try {
    const items = await ChangelogService.instance().getRoadmap();
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (error) {
    console.error("[roadmap] no se pudo obtener el roadmap", error);
    return NextResponse.json(
      { items: [], degraded: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
