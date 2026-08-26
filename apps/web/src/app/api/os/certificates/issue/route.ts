import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, packRunBelongsToWorkspace, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsDeliveryCertificateService, OsDeliveryCertError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { packRunId, force? } — emite o reemite un certificado de entrega.
 *
 * El `tenantId` NO se acepta del cuerpo, aunque antes se documentara así.
 *
 * El `workspaceId` que se graba sale del pack run ya verificado, pero su campo
 * hermano —el que identifica al mismo dueño— se cogía de la petición. Dos
 * campos que dicen de quién es el certificado, uno derivado y el otro regalado.
 *
 * Y no es decorativo: `filtroCert` acota los listados por `tenant_id`, así que
 * un certificado sellado con el inquilino de otro **aparece en el listado de
 * ese otro**. Un atacante con acceso legítimo a un pack run propio podía
 * inyectar un certificado de entrega falsificado en la cuenta de otro cliente.
 * En un producto que vende el certificado como prueba del trabajo hecho, eso
 * no es un detalle.
 *
 * Mass assignment de manual: comprobar la pertenencia de un campo y confiar en
 * el de al lado. Ahora sale de `claims`, que es lo que se acaba de verificar.
 */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const body = (await req.json().catch(() => ({}))) as { packRunId?: string; force?: boolean };
    if (!body.packRunId) {
      return NextResponse.json({ error: "packRunId requerido", code: "VALIDATION" }, { status: 400 });
    }
    if (!(await packRunBelongsToWorkspace(body.packRunId, workspaceId))) {
      return notFoundResponse();
    }
    const cert = await getOsDeliveryCertificateService().issueCertificate(body.packRunId, {
      force: body.force,
      // De la sesión verificada, nunca del cuerpo.
      tenantId: claims.tenantId ?? null,
    });
    return NextResponse.json({ certificate: cert });
  } catch (e) {
    if (e instanceof OsDeliveryCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/certificates/issue POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
