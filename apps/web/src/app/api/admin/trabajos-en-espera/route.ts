/**
 * La bandeja de trabajos que esperan a que los mire una persona.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * `waiting_approval` sólo se escribía en un sitio y NADA lo escribía de vuelta:
 * una sentencia en todo el árbol ponía ese estado y cero lo quitaban. Un trabajo
 * que entraba se quedaba ahí para siempre.
 *
 * `SalaDeMaquinas` los enseñaba, pero pasadas unas horas y como «atasco». Eso es
 * un detector de olvidos, no una bandeja: cuando algo aparece ahí, ya se ha
 * perdido tiempo del cliente.
 *
 * La puerta de calidad multiplicó la frecuencia con la que se entra en ese
 * estado. Añadirla sin dar salida habría convertido una mejora en un agujero.
 *
 * ── APROBAR NO ES REEJECUTAR ────────────────────────────────────────────────
 *
 * El resultado ya está guardado. Aprobar significa «esto vale», no «hazlo otra
 * vez»: reejecutar costaría otra llamada al modelo y produciría algo DISTINTO
 * de lo que la persona acaba de aprobar.
 *
 * ── ALCANCE ─────────────────────────────────────────────────────────────────
 *
 * Es una vista de operación, transversal a inquilinos, igual que la sala de
 * máquinas: enseña y decide sobre trabajos de TODOS los clientes.
 *
 * Por eso exige ser ADMINISTRADOR, no sólo estar autenticado. La primera
 * versión usaba `requirePlatformClaims` —que comprueba que has iniciado sesión
 * y nada más— y lo cazó `test_toda_ruta_de_administracion_comprueba_que_lo_seas`:
 * cualquier usuario con cuenta habría podido aprobar o rechazar entregables de
 * otras agencias. Autenticar no es autorizar, y en una vista transversal la
 * diferencia es toda.
 */
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/platformBffAuth";

import { ColaDeTrabajos } from "../../../../../../../backend/queue/colaDeTrabajos";
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let cola: ColaDeTrabajos | null = null;
function getCola(): ColaDeTrabajos {
  if (!cola) cola = new ColaDeTrabajos(DbJobsClient.getInstance(), { identidad: "panel-de-aprobacion" });
  return cola;
}

export async function GET(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  const limite = Number(new URL(req.url).searchParams.get("limite") ?? "50");
  const enEspera = await getCola().listarEsperandoAprobacion(
    Number.isFinite(limite) ? limite : 50,
  );
  return NextResponse.json({ total: enEspera.length, enEspera });
}

export async function POST(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const decision = body.decision;
  if (!jobId) return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  if (decision !== "aprobar" && decision !== "rechazar") {
    return NextResponse.json({ error: "decision debe ser aprobar o rechazar" }, { status: 400 });
  }

  // Quién decide queda registrado en la fila. Una aprobación anónima no se
  // puede discutir después, y estas son justo las que se acaban discutiendo.
  const quien = claims.email ?? claims.userId;

  if (decision === "aprobar") {
    const hecho = await getCola().aprobar(jobId, quien);
    return hecho
      ? NextResponse.json({ ok: true, jobId, decision })
      : NextResponse.json({ error: "el trabajo no está esperando aprobación" }, { status: 409 });
  }

  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) {
    // Rechazar sin motivo deja al siguiente sin saber qué arreglar, y el trabajo
    // se vuelve a hacer igual.
    return NextResponse.json({ error: "motivo requerido para rechazar" }, { status: 400 });
  }
  const hecho = await getCola().rechazar(jobId, quien, motivo);
  return hecho
    ? NextResponse.json({ ok: true, jobId, decision })
    : NextResponse.json({ error: "el trabajo no está esperando aprobación" }, { status: 409 });
}
