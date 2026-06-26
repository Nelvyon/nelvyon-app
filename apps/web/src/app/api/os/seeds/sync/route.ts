import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsEnvatoSeedService } from "../../../../../../../../backend/os-agents/seeds/OsEnvatoSeedService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/os/seeds/sync
 *  - mode "metadata"      → UPSERT registry from the committed metadata file (always available)
 *  - mode "download-lite" → only when ENVATO_ELEMENTS_TOKEN is set; otherwise honest 422
 */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: "metadata" | "download-lite" };
    const mode = body.mode ?? "metadata";
    const svc = getOsEnvatoSeedService();

    if (mode === "download-lite") {
      if (!process.env.ENVATO_ELEMENTS_TOKEN?.trim()) {
        return NextResponse.json(
          {
            error: "ENVATO_ELEMENTS_TOKEN no configurado — ejecuta el script de descarga lite en el servidor",
            code: "TOKEN_MISSING",
          },
          { status: 422 },
        );
      }
      // Heavy download runs out-of-band via the CLI script; here we just re-sync metadata.
      const result = await svc.syncFromMetadataFile();
      return NextResponse.json({ mode, ...result, note: "Descarga lite se ejecuta vía CLI; registry re-sincronizado" });
    }

    const result = await svc.syncFromMetadataFile();
    return NextResponse.json({ mode, ...result });
  } catch (e) {
    console.error("[os/seeds/sync POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
