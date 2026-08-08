import { NextResponse } from "next/server";

import { ChangelogService } from "../../../../../../backend/changelog/ChangelogService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  // Sin captura, cualquier fallo del servicio (base de datos caida, error de
  // consulta) devolvia un 500 con cuerpo vacio y dejaba rota la pagina publica
  // /changelog. Se degrada a lista vacia, como ya hace /api/status, marcando
  // `degraded` para que el fallo siga siendo observable.
  try {
    const entries = await ChangelogService.instance().getChangelog();
    return NextResponse.json(
      { entries },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (error) {
    console.error("[changelog] no se pudo obtener el changelog", error);
    return NextResponse.json(
      { entries: [], degraded: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
