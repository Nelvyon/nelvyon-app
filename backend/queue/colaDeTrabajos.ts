/**
 * LA COLA DE TRABAJOS, sobre PostgreSQL.
 *
 * Existe porque `os_jobs` no tenía consumidor. Medido en producción el 28 de
 * agosto de 2026: doce trabajos en `queued`, ni un `completed`, ni un `failed`,
 * desde el 29 de junio. No eran doce atascados de entre miles: es que nunca se
 * procesó ninguno. En el árbol no había ni una consulta que seleccionara
 * trabajo pendiente — sólo INSERT, UPDATE por id y cinco COUNT(*) para pintar
 * paneles.
 *
 * Hay un worker en `osWorker.ts`, pero vacía una lista de Redis, que es otra
 * cosa. Este módulo es el consumidor que le faltaba a la tabla.
 *
 * LAS DECISIONES QUE IMPORTAN
 *
 * 1 · El reclamo es `FOR UPDATE SKIP LOCKED` dentro de una transacción. Dos
 *     trabajadores nunca se llevan la misma fila, y ninguno espera al otro.
 *
 * 2 · Se reclama por LISTA BLANCA: `status = 'queued'`. Nunca «todo lo que no
 *     esté terminado». Una lista negra dejaría pasar cualquier estado futuro, y
 *     el que más caro saldría es `waiting_approval`: un trabajo parado
 *     esperando a una persona que, tras un reinicio, se ejecutara solo.
 *
 * 3 · El intento se cuenta AL RECLAMAR, no al terminar. Si el proceso muere en
 *     mitad del trabajo, el intento ya está contado. Contarlo al terminar hace
 *     que un trabajo capaz de tumbar al trabajador se reintente eternamente.
 *
 * 4 · El arriendo caduca. Un trabajador que muere sin decir nada deja su fila
 *     en `running` para siempre; el rescate la devuelve a la cola cuando el
 *     arriendo vence, y sólo entonces.
 *
 * 5 · La conexión es la de trabajos (`DbJobsClient`), que es cruzada entre
 *     inquilinos por necesidad. El contexto de inquilino se instala POR
 *     TRABAJO, justo antes de ejecutarlo, y nunca durante el reclamo.
 */

import { randomUUID } from "node:crypto";

import { redactar } from "../seguridad/loQueNoSeImprime.mjs";

import { DbJobsClient } from "../db/DbJobsClient";

/**
 * Estados posibles. Cerrado: la restricción de la migración 579 los fija.
 *
 * ESTA LISTA Y LA DE LA MIGRACIÓN TIENEN QUE SER LA MISMA, y hasta ahora nada
 * lo comprobaba. Se descubrió de la peor manera: cancelando doce trabajos
 * huérfanos en producción con un estado que la 579 no contemplaba, y viéndola
 * fallar al aplicarse. Ahora hay una prueba que compara las dos listas.
 */
export type EstadoDeTrabajo =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "dead_letter"
  /**
   * Cancelado: no se ejecutará, y no porque fallara.
   *
   * Es distinto de los otros dos finales y por eso no se reutiliza ninguno:
   * `failed` dice «se intentó y salió mal», `dead_letter` dice «se agotaron los
   * reintentos». Un trabajo que nunca debió existir —sin inquilino, sin
   * encargo— no es ninguna de las dos cosas, y llamarlo `failed` mentiría en
   * cualquier informe que cuente fallos.
   */
  | "cancelled";

/** Estados desde los que un trabajador PUEDE tomar trabajo. Lista blanca. */
export const RECLAMABLES: readonly EstadoDeTrabajo[] = ["queued"] as const;

/**
 * Estados que NUNCA debe tocar un trabajador, ni tras un reinicio, ni con el
 * arriendo vencido, ni por error. Se declara aparte de `RECLAMABLES` a
 * propósito: una sola lista invita a razonar por complemento, y razonar por
 * complemento es lo que haría que `waiting_approval` acabara ejecutándose.
 */
export const INTOCABLES: readonly EstadoDeTrabajo[] = [
  "waiting_approval",
  "completed",
  "failed",
  "dead_letter",
  // Cancelado es terminal: un trabajo cancelado no vuelve a la cola ni cuando
  // vence su arriendo. Sin esto, el rescate de trabajos varados lo devolvería
  // a `queued` y acabaría ejecutándose lo que alguien decidió no ejecutar.
  "cancelled",
] as const;

export interface TrabajoReclamado {
  jobId: string;
  serviceId: string;
  clientId: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
  intake: Record<string, unknown> | null;
  attempts: number;
  maxAttempts: number;
}

export interface OpcionesDeCola {
  /** Identidad de este trabajador, para poder saber quién tenía cada fila. */
  identidad?: string;
  /** Cuánto dura un arriendo antes de considerarse muerto. */
  arriendoMs?: number;
  /** Espera base entre reintentos, antes del crecimiento exponencial. */
  esperaBaseMs?: number;
  /** Tope de la espera entre reintentos. */
  esperaMaximaMs?: number;
  /**
   * Servicios que ESTE trabajador atiende. Vacío o ausente = todos.
   *
   * Sirve para especializar trabajadores: uno dedicado a publicidad, que puede
   * necesitar más memoria y menos concurrencia, no tiene por qué llevarse los
   * trabajos de contenido. Sin esto, un solo trabajo pesado bloquea huecos que
   * otros trabajos ligeros podrían usar.
   *
   * Y hace posible aislar pruebas que comparten la misma base: el reclamo es
   * cruzado entre inquilinos POR DISEÑO, así que dos suites en paralelo se
   * roban los trabajos la una a la otra. Medido: pasó.
   */
  serviciosQueAtiende?: readonly string[];
}

type Fila = {
  job_id: string;
  service_id: string;
  client_id: string;
  tenant_id: string | null;
  payload: unknown;
  intake: unknown;
  attempts: number;
  max_attempts: number;
};

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export class ColaDeTrabajos {
  readonly identidad: string;
  private readonly servicios: readonly string[] | null;
  private readonly arriendoMs: number;
  private readonly esperaBaseMs: number;
  private readonly esperaMaximaMs: number;

  constructor(
    private readonly db: Pick<DbJobsClient, "query" | "withTransaction">,
    opciones: OpcionesDeCola = {},
  ) {
    this.identidad = opciones.identidad ?? `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
    this.servicios =
      opciones.serviciosQueAtiende && opciones.serviciosQueAtiende.length > 0
        ? [...opciones.serviciosQueAtiende]
        : null;
    this.arriendoMs = opciones.arriendoMs ?? 5 * 60_000;
    this.esperaBaseMs = opciones.esperaBaseMs ?? 30_000;
    this.esperaMaximaMs = opciones.esperaMaximaMs ?? 15 * 60_000;
  }

  /**
   * Espera antes del siguiente intento. Crece exponencialmente y tiene tope.
   * Sin aleatoriedad: es predecible a propósito, para poder probarlo.
   */
  esperaDelIntento(intento: number): number {
    const crecida = this.esperaBaseMs * 2 ** Math.max(0, intento - 1);
    return Math.min(crecida, this.esperaMaximaMs);
  }

  /**
   * Reclama hasta `cuantos` trabajos, de forma atómica.
   *
   * `FOR UPDATE SKIP LOCKED` es lo que permite que varios trabajadores tiren de
   * la misma cola sin coordinarse y sin bloquearse entre ellos: cada uno se
   * lleva filas distintas y ninguno espera.
   */
  async reclamar(cuantos = 1): Promise<TrabajoReclamado[]> {
    if (cuantos <= 0) return [];
    return this.db.withTransaction(async (cliente) => {
      const { rows } = await cliente.query<Fila>(
        `WITH elegidos AS (
           SELECT job_id
             FROM os_jobs
            WHERE status = ANY($1::text[])
              AND run_after <= NOW()
              AND dead_lettered_at IS NULL
              AND attempts < max_attempts
              AND ($5::text[] IS NULL OR service_id = ANY($5::text[]))
            ORDER BY run_after ASC, created_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
         )
         UPDATE os_jobs j
            SET status           = 'running',
                attempts         = j.attempts + 1,
                locked_by        = $3,
                locked_at        = NOW(),
                lease_expires_at = NOW() + ($4::int || ' milliseconds')::interval,
                updated_at       = NOW()
           FROM elegidos e
          WHERE j.job_id = e.job_id
        RETURNING j.job_id, j.service_id, j.client_id, j.tenant_id,
                  j.payload, j.intake, j.attempts, j.max_attempts`,
        [[...RECLAMABLES], cuantos, this.identidad, this.arriendoMs, this.servicios],
      );
      return rows.map((r) => ({
        jobId: r.job_id,
        serviceId: r.service_id,
        clientId: r.client_id,
        tenantId: r.tenant_id,
        payload: objeto(r.payload),
        intake: r.intake === null || r.intake === undefined ? null : objeto(r.intake),
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
      }));
    });
  }

  /**
   * Alarga el arriendo de un trabajo en curso. Sin esto, un trabajo legítimo
   * que tarde más que el arriendo sería rescatado y ejecutado dos veces.
   */
  async latir(jobId: string): Promise<boolean> {
    const filas = await this.db.query<{ job_id: string }>(
      `UPDATE os_jobs
          SET lease_expires_at = NOW() + ($2::int || ' milliseconds')::interval,
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'running'
          AND locked_by = $3
      RETURNING job_id`,
      [jobId, this.arriendoMs, this.identidad],
    );
    return filas.length === 1;
  }

  async completar(jobId: string, resultado: unknown, duracionMs: number): Promise<void> {
    await this.db.query(
      `UPDATE os_jobs
          SET status = 'completed',
              progress = 100,
              result = $2::jsonb,
              error = NULL,
              last_error = NULL,
              duration_ms = $3,
              locked_by = NULL,
              locked_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'running'
          AND locked_by = $4`,
      [jobId, JSON.stringify(resultado ?? null), Math.max(0, Math.round(duracionMs)), this.identidad],
    );
  }

  /**
   * Deja el trabajo esperando a una persona. NO consume un intento adicional ni
   * programa reintento: no está fallando, está esperando.
   */
  async dejarEsperandoAprobacion(jobId: string, motivo: string): Promise<void> {
    await this.db.query(
      `UPDATE os_jobs
          SET status = 'waiting_approval',
              last_error = NULL,
              error = NULL,
              result = COALESCE(result, '{}'::jsonb) || jsonb_build_object('waiting_reason', $2::text),
              locked_by = NULL,
              locked_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'running'
          AND locked_by = $3`,
      [jobId, motivo.slice(0, 500), this.identidad],
    );
  }

  /**
   * Los trabajos que esperan a que los mire una persona.
   *
   * ── POR QUÉ HACÍA FALTA ───────────────────────────────────────────────────
   *
   * `waiting_approval` sólo se escribía en un sitio —`dejarEsperandoAprobacion`—
   * y NADA lo escribía de vuelta. Medido: una sola sentencia en todo el árbol
   * ponía ese estado y cero lo quitaban. Un trabajo que entraba ahí se quedaba
   * para siempre.
   *
   * `SalaDeMaquinas` los enseñaba, pero sólo pasadas unas horas y como
   * «atasco». Eso es un detector de olvidos, no una bandeja: para cuando algo
   * aparece ahí, ya se ha perdido tiempo del cliente.
   *
   * La puerta de calidad multiplicó la frecuencia con la que se entra en ese
   * estado, así que dejarlo sin salida habría convertido una mejora en un
   * agujero.
   */
  async listarEsperandoAprobacion(limite = 50): Promise<
    Array<{
      jobId: string;
      serviceId: string;
      clientId: string;
      motivo: string | null;
      desde: string;
    }>
  > {
    const filas = await this.db.query<{
      job_id: string;
      service_id: string;
      client_id: string;
      motivo: string | null;
      desde: string;
    }>(
      `SELECT job_id, service_id, client_id,
              result->>'waiting_reason' AS motivo,
              updated_at::text AS desde
         FROM os_jobs
        WHERE status = 'waiting_approval'
        ORDER BY updated_at ASC
        LIMIT $1`,
      [Math.max(1, Math.min(limite, 200))],
    );
    return filas.map((f) => ({
      jobId: f.job_id,
      serviceId: f.service_id,
      clientId: f.client_id,
      motivo: f.motivo,
      desde: f.desde,
    }));
  }

  /**
   * Una persona ha mirado el trabajo y lo da por bueno.
   *
   * NO vuelve a ejecutarlo. El resultado ya está en la fila: aprobar significa
   * «esto vale», no «hazlo otra vez». Reejecutar costaría otra llamada al
   * modelo y produciría algo DISTINTO de lo que la persona acaba de aprobar,
   * que es justo lo que no puede pasar.
   *
   * Deja constancia de quién y cuándo, y CONSERVA el motivo por el que se
   * retuvo: saber que algo se aprobó a pesar de una advertencia de calidad es
   * la mitad interesante del dato.
   */
  async aprobar(jobId: string, quien: string): Promise<boolean> {
    const filas = await this.db.query<{ job_id: string }>(
      `UPDATE os_jobs
          SET status = 'completed',
              progress = 100,
              result = COALESCE(result, '{}'::jsonb)
                       || jsonb_build_object('approved_by', $2::text, 'approved_at', NOW()::text),
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'waiting_approval'
        RETURNING job_id`,
      [jobId, quien],
    );
    return filas.length > 0;
  }

  /**
   * Una persona lo ha mirado y no vale.
   *
   * Va a `dead_letter` con el motivo humano, no a la cola: si volviera a
   * ejecutarse produciría lo mismo que se acaba de rechazar. Rehacerlo es una
   * decisión aparte, y se toma encolando un trabajo nuevo.
   */
  async rechazar(jobId: string, quien: string, motivo: string): Promise<boolean> {
    const filas = await this.db.query<{ job_id: string }>(
      `UPDATE os_jobs
          SET status = 'dead_letter',
              error = $3,
              last_error = $3,
              result = COALESCE(result, '{}'::jsonb)
                       || jsonb_build_object('rejected_by', $2::text, 'rejected_at', NOW()::text),
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'waiting_approval'
        RETURNING job_id`,
      [jobId, quien, motivo.slice(0, 500)],
    );
    return filas.length > 0;
  }

  /**
   * Falla un trabajo. Vuelve a la cola con espera creciente mientras le queden
   * intentos; agotados, va a `dead_letter` y ahí se queda hasta que alguien
   * mire. Rendirse en silencio y rendirse ruidosamente no son lo mismo.
   */
  async fallar(jobId: string, error: unknown, intentos: number, maxIntentos: number): Promise<"reintenta" | "dead_letter"> {
    /**
     * EL MENSAJE SE REDACTA ANTES DE GUARDARLO, y éste es el sitio donde hay
     * que hacerlo: por aquí pasa TODO error antes de convertirse en una fila de
     * `os_jobs.error` y `os_jobs.last_error`.
     *
     * QUÉ LO MOTIVA, y no es hipotético. `LlmClient` construye el mensaje de un
     * fallo del proveedor así:
     *
     *     `OpenAI returned non-JSON (HTTP ${res.status}). First bytes: ${raw.slice(0, 200)}`
     *
     * Los primeros bytes CRUDOS de la respuesta. Un proxy, una pasarela o un
     * cortafuegos que devuelva una página en vez de JSON suele **devolver la
     * petición** — cabeceras incluidas, y ahí viaja `Authorization: Bearer …`.
     * Ese texto acababa escrito en la base de datos.
     *
     * Y es otra vez la misma lección: `slice(0, 200)` es un recorte, y recortar
     * no protege. Un secreto truncado sigue siendo material sensible.
     *
     * SE REDACTA AQUÍ Y TAMBIÉN EN EL ORIGEN. En el origen para que el valor no
     * viaje; aquí porque este método persiste errores de CUALQUIER procedencia,
     * no sólo del modelo, y quien escriba mañana un `throw` nuevo no tiene por
     * qué acordarse.
     *
     * `redactar` sólo sustituye lo que tiene FORMA de secreto. Un mensaje de
     * error normal sale intacto, y hay una prueba de control que lo fija: una
     * redacción que borrara todo dejaría los fallos indiagnosticables, que es
     * el problema contrario y no una solución.
     */
    const crudo = error instanceof Error ? error.message : String(error ?? "");
    const mensaje = redactar(crudo).slice(0, 2000);
    const agotado = intentos >= maxIntentos;

    if (agotado) {
      await this.db.query(
        `UPDATE os_jobs
            SET status = 'dead_letter',
                error = $2,
                last_error = $2,
                dead_lettered_at = NOW(),
                locked_by = NULL,
                locked_at = NULL,
                lease_expires_at = NULL,
                updated_at = NOW()
          WHERE job_id = $1
            AND status = 'running'
            AND locked_by = $3`,
        [jobId, mensaje, this.identidad],
      );
      return "dead_letter";
    }

    await this.db.query(
      `UPDATE os_jobs
          SET status = 'queued',
              last_error = $2,
              run_after = NOW() + ($3::int || ' milliseconds')::interval,
              locked_by = NULL,
              locked_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE job_id = $1
          AND status = 'running'
          AND locked_by = $4`,
      [jobId, mensaje, this.esperaDelIntento(intentos), this.identidad],
    );
    return "reintenta";
  }

  /**
   * Devuelve a la cola los trabajos cuyo arriendo venció: su trabajador murió
   * sin decir nada.
   *
   * La condición es `status = 'running'` Y arriendo vencido. Nunca toca
   * `waiting_approval`, que es la garantía de que un reinicio no ejecuta algo
   * que estaba esperando a una persona. Y si al trabajo ya no le quedan
   * intentos, va a `dead_letter` en vez de volver a la cola: rescatar en bucle
   * un trabajo que mata al trabajador es un bucle infinito con otro nombre.
   */
  async rescatarArriendosVencidos(): Promise<{ devueltos: number; agotados: number }> {
    const devueltos = await this.db.query<{ job_id: string }>(
      `UPDATE os_jobs
          SET status = 'queued',
              last_error = COALESCE(last_error, 'arriendo vencido: el trabajador no respondio'),
              run_after = NOW(),
              locked_by = NULL,
              locked_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE status = 'running'
          AND lease_expires_at IS NOT NULL
          AND lease_expires_at < NOW()
          AND attempts < max_attempts
      RETURNING job_id`,
    );
    const agotados = await this.db.query<{ job_id: string }>(
      `UPDATE os_jobs
          SET status = 'dead_letter',
              error = COALESCE(error, 'arriendo vencido sin intentos restantes'),
              last_error = COALESCE(last_error, 'arriendo vencido sin intentos restantes'),
              dead_lettered_at = NOW(),
              locked_by = NULL,
              locked_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE status = 'running'
          AND lease_expires_at IS NOT NULL
          AND lease_expires_at < NOW()
          AND attempts >= max_attempts
      RETURNING job_id`,
    );
    return { devueltos: devueltos.length, agotados: agotados.length };
  }

  /** Estado de la cola, para poder mirarla sin abrir una consola de SQL. */
  async resumen(): Promise<Record<string, number>> {
    const filas = await this.db.query<{ status: string; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM os_jobs GROUP BY status`,
    );
    const out: Record<string, number> = {};
    for (const f of filas) out[f.status] = Number(f.n);
    return out;
  }
}
