/**
 * El trabajo terminado aparece en la lista de entregables del cliente.
 *
 * ── EL HUECO, Y ES DE LOS GRANDES ───────────────────────────────────────────
 *
 * Medido: en todo el repositorio, `os_deliverables` sólo se ESCRIBE desde
 * ficheros de prueba. Producción no inserta ni una fila. Todas las referencias
 * de `backend/core/*.py`, `SenalesDeCliente` y el hub del portal son SELECT.
 *
 * Existen dos mundos que nunca se tocaron:
 *
 *   os_clients → os_projects → os_deliverables    lo llena el backfill de datos
 *                                                  antiguos; lo leen el portal y
 *                                                  el autopilot
 *   os_jobs → resultado                            lo llena el trabajador
 *
 * Consecuencia concreta: el cliente no ve NUNCA lo que se le produce. Y como
 * `SenalesDeCliente` levanta `sin_entregables` —gravedad bloqueante— cuando un
 * cliente con servicio aceptado no tiene ni una fila, esa señal salta para
 * todos, siempre. El sistema era coherente en su pesimismo: tenía razón, y por
 * el motivo equivocado.
 *
 * ── LAS TRES DECISIONES ─────────────────────────────────────────────────────
 *
 * 1. VISIBILIDAD `internal`, NO `client_visible`. Enseñarle al cliente una pieza
 *    en el momento en que se produce se saltaría la puerta de aprobación por la
 *    puerta de atrás. Que exista en el sistema y que el cliente la vea son dos
 *    decisiones distintas, y sólo la primera es automática.
 *
 * 2. ESTADO `in_review`. Ha pasado calidad —si no, no habría llegado aquí— pero
 *    no la ha mirado una persona. `delivered` afirmaría algo que no ha ocurrido.
 *
 * 3. PROYECTO: se reutiliza uno vivo del cliente y sólo se crea si no hay
 *    ninguno. La tabla exige `project_id NOT NULL`, y un servicio contratado ES
 *    un proyecto. Crear uno por entrega llenaría el portal de proyectos vacíos.
 *
 * ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
 *
 * Un trabajo puede reintentarse. La fila lleva el `jobId` en `metadata` y se
 * comprueba antes de insertar: dos intentos del mismo trabajo son un entregable,
 * no dos. Sin esto, un reintento le duplicaría el trabajo al cliente en su lista
 * — y contar dos veces lo mismo es como se construye un informe que miente.
 */
import { DbClient } from "../db/DbClient";

import { workspaceDelCliente } from "./workspaceDelCliente";

/** Conexión con lo justo: la forma, no la clase. */
export type ConexionDeEntregables = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

export type EntregableRegistrado =
  | { registrado: true; deliverableId: string; proyectoCreado: boolean }
  | { registrado: false; motivo: string };

/** El proyecto vivo del cliente, o uno nuevo si no tiene ninguno. */
async function proyectoDelCliente(
  db: ConexionDeEntregables,
  workspaceId: number,
  clientId: string,
  serviceId: string,
): Promise<{ id: string; creado: boolean } | null> {
  const vivos = await db.query<{ id: string }>(
    `SELECT id FROM os_projects
      WHERE workspace_id = $1 AND client_id = $2::uuid
        AND archived_at IS NULL AND status NOT IN ('cancelled', 'archived')
      ORDER BY created_at ASC LIMIT 1`,
    [workspaceId, clientId],
  );
  if (vivos[0]) return { id: vivos[0].id, creado: false };

  const creados = await db.query<{ id: string }>(
    `INSERT INTO os_projects (workspace_id, client_id, name, status, priority, metadata)
     VALUES ($1, $2::uuid, $3, 'active', 'medium', $4::jsonb)
     RETURNING id`,
    [
      workspaceId,
      clientId,
      `Servicios contratados`,
      JSON.stringify({ creadoPor: "entrega-automatica", primerServicio: serviceId }),
    ],
  );
  return creados[0] ? { id: creados[0].id, creado: true } : null;
}

/**
 * Registra el trabajo terminado como entregable del cliente.
 *
 * NUNCA lanza. El cliente ya tiene su trabajo hecho; perderlo por no poder
 * anotarlo sería absurdo. Pero tampoco se traga el fallo: una lista de
 * entregables que deja de crecer y no lo dice es indistinguible de una agencia
 * que ha dejado de trabajar.
 */
export async function registrarEntregable(params: {
  clientId: string;
  serviceId: string;
  jobId: string;
  titulo: string;
  resumen?: string | null;
  metadata?: Record<string, unknown>;
  db?: ConexionDeEntregables;
}): Promise<EntregableRegistrado> {
  const db = params.db ?? DbClient.getInstance();
  try {
    const workspaceId = await workspaceDelCliente(params.clientId, db);
    if (workspaceId === null) {
      // El cliente no está en el núcleo del OS. No se le inventa un sitio: meter
      // un entregable en el workspace equivocado se lo enseña a otro cliente.
      return { registrado: false, motivo: "el cliente no consta en os_clients" };
    }

    const yaEsta = await db.query<{ id: string }>(
      `SELECT id FROM os_deliverables
        WHERE workspace_id = $1 AND client_id = $2::uuid
          AND metadata->>'jobId' = $3
        LIMIT 1`,
      [workspaceId, params.clientId, params.jobId],
    );
    if (yaEsta[0]) {
      return { registrado: true, deliverableId: yaEsta[0].id, proyectoCreado: false };
    }

    const proyecto = await proyectoDelCliente(db, workspaceId, params.clientId, params.serviceId);
    if (!proyecto) return { registrado: false, motivo: "no se pudo obtener un proyecto" };

    const filas = await db.query<{ id: string }>(
      `INSERT INTO os_deliverables
         (workspace_id, client_id, project_id, title, description, type,
          status, visibility, metadata)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, 'in_review', 'internal', $7::jsonb)
       RETURNING id`,
      [
        workspaceId,
        params.clientId,
        proyecto.id,
        params.titulo,
        params.resumen ?? null,
        params.serviceId,
        JSON.stringify({ ...(params.metadata ?? {}), jobId: params.jobId, serviceId: params.serviceId }),
      ],
    );
    const id = filas[0]?.id;
    if (!id) return { registrado: false, motivo: "la inserción no devolvió id" };
    return { registrado: true, deliverableId: id, proyectoCreado: proyecto.creado };
  } catch (e) {
    const { redactar } = await import("../seguridad/formaDeUnSecreto.mjs");
    const crudo = e instanceof Error ? e.message : "desconocido";
    console.warn(
      `[entregables] no se pudo registrar la entrega de ${params.serviceId}: `
        + `${String(redactar(crudo)).slice(0, 200)}`,
    );
    return { registrado: false, motivo: "error al registrar" };
  }
}
