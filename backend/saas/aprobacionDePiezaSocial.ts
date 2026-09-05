/**
 * Que este permitido publicar NO significa que ESTA pieza este aprobada.
 *
 * ── LO QUE EL INTERRUPTOR NO CUBRE ──────────────────────────────────────────
 *
 * `publicacionSocialPermitida` decide si esta instancia puede hablar con Meta o
 * LinkedIn. Es una puerta de INSTALACION: una vez arriba, cualquier pieza sale.
 *
 * Eso no es gobernanza. Una agencia no aprueba «publicar» de una vez para
 * siempre: aprueba PIEZAS, una a una, y la aprobacion de un carrusel no vale
 * para el siguiente. Sin esto, encender el interruptor en produccion equivale a
 * dar permiso a todo lo que haya en la cola.
 *
 * ── QUE EXIGE ESTA PUERTA ───────────────────────────────────────────────────
 *
 * Un registro en `saas_private_ai_approvals` que cumpla LAS CUATRO cosas:
 *
 *   1 · `status = 'approved'`  — ni pendiente, ni rechazada, ni caducada
 *   2 · del MISMO inquilino    — una aprobacion no cruza de cliente
 *   3 · de ESTA pieza          — el `postId` va dentro, no basta el inquilino
 *   4 · de ESTE contenido      — huella del texto que se aprobo
 *
 * La cuarta es la que suele faltar. Sin ella se aprueba un borrador, se edita
 * despues y sale publicado algo que nadie leyo: la aprobacion quedaria atada al
 * identificador, no a lo que se dijo.
 *
 * ── FALLA CERRADO, Y LANZA ──────────────────────────────────────────────────
 *
 * Ausencia de aprobacion NO es permiso. Y lanza en vez de devolver `false`
 * porque quien llama esta a punto de publicar: un `false` ignorado publica.
 *
 * ── POR QUE NO HAY TABLA NUEVA ──────────────────────────────────────────────
 *
 * `saas_private_ai_approvals` ya tiene inquilino, tipo de accion, carga,
 * estado y caducidad, y ya la revisan las pantallas de aprobacion. Anadir una
 * tabla paralela habria partido en dos el sitio donde se mira que hay pendiente.
 */
import { createHash } from "node:crypto";

import type { SaasPostgresPort } from "./SaasOnboardingService";

/** El tipo de accion con el que se registran estas aprobaciones. */
export const ACCION_DE_PUBLICACION_SOCIAL = "send_client_message";

/** Se intento publicar una pieza que nadie aprobo, o cuya aprobacion ya no vale. */
export class PiezaSocialNoAprobadaError extends Error {
  readonly code = "SOCIAL_PIECE_NOT_APPROVED";
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "PiezaSocialNoAprobadaError";
  }
}

/**
 * La huella del contenido aprobado.
 *
 * Se normalizan los espacios antes: un salto de linea de mas no es un cambio de
 * mensaje, y obligar a re-aprobar por eso haria que la gente aprobara sin leer.
 */
export function huellaDelContenido(contenido: string): string {
  const normalizado = contenido.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalizado, "utf8").digest("hex").slice(0, 32);
}

type FilaDeAprobacion = { id: string; huella: string | null };

/**
 * Exige que ESTA pieza, con ESTE contenido, este aprobada para ESTE inquilino.
 *
 * @throws PiezaSocialNoAprobadaError si falta la aprobacion o ya no vale.
 */
export async function exigirPiezaSocialAprobada(
  db: Pick<SaasPostgresPort, "query">,
  tenantId: string,
  postId: string,
  contenido: string,
): Promise<void> {
  const huella = huellaDelContenido(contenido);

  const filas = await db.query<FilaDeAprobacion>(
    `SELECT id, payload->>'contentHash' AS huella
       FROM saas_private_ai_approvals
      WHERE tenant_id = $1
        AND action_type = $2
        AND status = 'approved'
        AND payload->>'postId' = $3
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY reviewed_at DESC NULLS LAST
      LIMIT 5`,
    [tenantId, ACCION_DE_PUBLICACION_SOCIAL, postId],
  );

  if (filas.length === 0) {
    throw new PiezaSocialNoAprobadaError(
      `La pieza ${postId} no tiene una aprobacion vigente para este inquilino`,
    );
  }

  if (!filas.some((f) => f.huella === huella)) {
    throw new PiezaSocialNoAprobadaError(
      `La pieza ${postId} cambio despues de aprobarse: hay que volver a revisarla`,
    );
  }
}

/**
 * Registra la peticion de aprobacion de una pieza.
 *
 * Guarda la huella del contenido EN ESE MOMENTO: es lo que despues se compara.
 */
export async function pedirAprobacionDePiezaSocial(
  db: Pick<SaasPostgresPort, "query">,
  entrada: {
    tenantId: string;
    postId: string;
    contenido: string;
    plataforma: string;
    agentId: string;
    solicitadaPor?: string;
  },
): Promise<string> {
  const filas = await db.query<{ id: string }>(
    `INSERT INTO saas_private_ai_approvals
       (tenant_id, agent_id, action_type, payload, requested_by, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW() + INTERVAL '7 days')
     RETURNING id`,
    [
      entrada.tenantId,
      entrada.agentId,
      ACCION_DE_PUBLICACION_SOCIAL,
      JSON.stringify({
        source: "social_publish",
        postId: entrada.postId,
        platform: entrada.plataforma,
        contentHash: huellaDelContenido(entrada.contenido),
      }),
      entrada.solicitadaPor ?? null,
    ],
  );
  return filas[0]?.id ?? "";
}
