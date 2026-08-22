import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";

import { getPackRun } from "@/lib/packs/packRunStore";
import { entrarConInquilino } from "../../../../backend/db/contextoDeInquilino";
import { assertUserCanAccessWorkspace, WorkspaceAccessError } from "@/lib/platformDbFallback";

export function parseWorkspaceHeader(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Requires X-Workspace-Id and active membership (OS BFF routes). */
export async function requireOsWorkspaceAccess(
  req: Request,
  claims: JwtPayload,
): Promise<{ workspaceId: number } | NextResponse> {
  const workspaceId = parseWorkspaceHeader(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }
  try {
    await assertUserCanAccessWorkspace(claims, workspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
  // Fija el inquilino para el RESTO de la peticion: todo lo que consulte el
  // manejador llevara ya `app.workspace_id` a PostgreSQL.
  //
  // AQUI y no antes: la comprobacion de acceso de arriba es la que decide si este
  // usuario PUEDE trabajar en ese workspace. Fijar el contexto antes seria fijarlo
  // con el numero que llego en la cabecera —controlado por quien llama— en vez de
  // con el que se ha verificado.
  //
  // Inocuo hoy: el rol de produccion es superusuario y ninguna politica se evalua.
  entrarConInquilino({ workspaceId, userId: claims.userId });
  return { workspaceId };
}

export async function packRunBelongsToWorkspace(packRunId: string, workspaceId: number): Promise<boolean> {
  const run = await getPackRun(packRunId, workspaceId);
  return !!run;
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
