/**
 * Las solicitudes de servicio que esperan una decisión de NELVYON.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * `os_service_requests` declaraba seis estados y sólo se escribía el primero:
 * un cliente pedía un servicio y se quedaba pedido para siempre. La transición
 * a `aceptado` no existía en ninguna parte del repositorio, así que
 * `os_service_contracts` estaba vacía y los cuatro módulos que la leen —salud,
 * informes, analítica y el cron— recorrían cero clientes.
 *
 * Añadir la transición sin superficie que la invoque habría sido dejarla tan
 * muerta como estaba.
 *
 * ── AUTENTICAR NO ES AUTORIZAR ──────────────────────────────────────────────
 *
 * Aceptar una solicitud crea un contrato y pone a trabajar al sistema para un
 * cliente. Es una decisión de NELVYON, no de cualquiera con sesión iniciada, así
 * que exige `requirePlatformAdmin` desde la primera versión — la lección de la
 * bandeja de aprobación, aprendida antes de repetirla.
 *
 * ── Y LA CONEXIÓN CORRECTA ──────────────────────────────────────────────────
 *
 * Esta vista es TRANSVERSAL a inquilinos: ve las solicitudes de todos. Por eso
 * usa `DbJobsClient` y no `DbClient`.
 *
 * No es un detalle de estilo. Lo cazó `test_las_rutas_entre_inquilinos_usan_la_conexion_correcta`
 * en la primera versión: tras el corte a mínimo privilegio, `DbClient` no daría
 * error aquí — devolvería CERO FILAS. Y una bandeja vacía se parece demasiado a
 * «no había nada que decidir».
 */
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/platformBffAuth";

import { CicloDelClienteService } from "../../../../../../../backend/portal/CicloDelClienteService";
import { CerebroDeNegocioService } from "../../../../../../../backend/cerebro/CerebroDeNegocioService";
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getCiclo(): CicloDelClienteService {
  const db = DbJobsClient.getInstance();
  return new CicloDelClienteService(db, new CerebroDeNegocioService(db));
}

/** Lo que espera una decisión, con lo que el cliente contó al pedirlo. */
export async function GET(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  const filas = await DbJobsClient.getInstance().query<{
    id: string;
    workspace_id: number;
    client_id: string;
    service_id: string;
    motivo: string | null;
    estado: string;
    desde: string;
  }>(
    `SELECT id::text, workspace_id, client_id::text, service_id, motivo, estado,
            created_at::text AS desde
       FROM os_service_requests
      WHERE estado IN ('solicitado', 'en_revision', 'propuesto')
      ORDER BY created_at ASC
      LIMIT 200`,
  );

  return NextResponse.json({ total: filas.length, solicitudes: filas });
}

/** Aceptar una solicitud: nace el contrato. */
export async function POST(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const solicitudId = typeof body.solicitudId === "string" ? body.solicitudId.trim() : "";
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const workspaceId = Number(body.workspaceId);

  if (!solicitudId || !clientId || !Number.isInteger(workspaceId) || workspaceId <= 0) {
    return NextResponse.json(
      { error: "solicitudId, clientId y workspaceId son obligatorios" },
      { status: 400 },
    );
  }

  const r = await getCiclo().aceptarSolicitud({
    workspaceId,
    clientId,
    solicitudId,
    // Quién aceptó queda en la fila. Una decisión anónima no se puede discutir
    // después, y las que crean un contrato se acaban discutiendo.
    aceptadaPor: claims.email ?? claims.userId,
  });

  return r.aceptada
    ? NextResponse.json({ ok: true, ...r })
    : NextResponse.json({ error: r.motivo ?? "no se pudo aceptar" }, { status: 409 });
}
