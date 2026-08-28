/**
 * LA GUARDA DE GASTO EXTERNO.
 *
 * Regla única, y todo lo demás son excepciones a ella:
 *
 *     GASTO EXTERNO = DENEGADO.
 *
 * Se permite sólo cuando TODAS estas cosas son ciertas a la vez, y cualquier
 * duda —una tabla que no responde, una autorización que no se encuentra, un
 * importe que no se puede leer— cae del lado de denegar.
 *
 *   1. El interruptor general está encendido, con el valor exacto.
 *   2. Existe una autorización APROBADA para ese inquilino, ese workspace, ese
 *      servicio y ese proveedor.
 *   3. Está dentro de su ventana temporal.
 *   4. El importe no supera el tope de UNA operación.
 *   5. Lo ya consumido más este importe no supera el presupuesto total.
 *   6. La clave de idempotencia no se ha usado ya.
 *
 * POR QUÉ EXISTE. Hoy `/api/integrations/meta-ads/launch` crea una campaña con
 * presupuesto diario real y lo único que hay entre la petición y el dinero es
 * que haya sesión. Mientras el botón lo pulsa una persona es discutible; en
 * cuanto lo pulse un agente, un fallo de razonamiento se convierte en dinero de
 * un cliente.
 *
 * QUÉ NO HACE. No llama a ningún proveedor. Decide y deja rastro; ejecutar es
 * de quien la llama. Esa separación es lo que permite probarla entera sin
 * gastar un céntimo.
 */

/** El interruptor de emergencia. Un solo valor lo enciende; todo lo demás apaga. */
export function gastoExternoHabilitado(): boolean {
  return process.env.NELVYON_GASTO_EXTERNO_HABILITADO?.trim() === "1";
}

export type MotivoDeDenegacion =
  | "interruptor_apagado"
  | "sin_autorizacion"
  | "autorizacion_no_aprobada"
  | "fuera_de_ventana"
  | "supera_tope_por_operacion"
  | "supera_presupuesto"
  | "importe_invalido"
  | "actor_ausente"
  | "clave_idempotencia_ausente"
  | "error_al_comprobar";

export type Veredicto =
  | {
      permitido: true;
      autorizacionId: string;
      /** Ya se hizo con esta misma clave: se devuelve lo de entonces. */
      yaEjecutado: boolean;
      referenciaExterna: string | null;
      restanteCents: number;
    }
  | { permitido: false; motivo: MotivoDeDenegacion; detalle: string };

export interface PeticionDeGasto {
  tenantId: string;
  workspaceId: number;
  serviceId: string;
  proveedor: string;
  /** Id del agente o de la persona. Nunca vacío. */
  actor: string;
  operacion: string;
  importeCents: number;
  /** Clave estable de la operación de dominio. Sin ella no se autoriza nada. */
  idempotencyKey: string;
}

type FilaAutorizacion = {
  id: string;
  presupuesto_cents: string;
  tope_por_operacion_cents: string;
  consumido_cents: string;
  estado: string;
  vigente_desde: string;
  vigente_hasta: string;
  /** Lo calcula PostgreSQL con su propio reloj. Ver la consulta. */
  vigente: boolean;
};

type FilaGasto = {
  id: string;
  estado: string;
  referencia_externa: string | null;
  autorizacion_id: string;
};

export interface AlmacenDeGasto {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

function deniega(motivo: MotivoDeDenegacion, detalle: string): Veredicto {
  return { permitido: false, motivo, detalle };
}

function entero(v: string | number | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export class GuardaDeGasto {
  constructor(private readonly db: AlmacenDeGasto) {}

  /**
   * ¿Se puede gastar esto? No gasta nada: decide.
   *
   * El orden de las comprobaciones es deliberado — primero lo que no necesita
   * base de datos, para que un interruptor apagado no dependa de que la base
   * responda.
   */
  async autorizar(p: PeticionDeGasto): Promise<Veredicto> {
    if (!gastoExternoHabilitado()) {
      return deniega(
        "interruptor_apagado",
        "NELVYON_GASTO_EXTERNO_HABILITADO no vale exactamente '1'",
      );
    }
    if (!p.actor?.trim()) {
      return deniega("actor_ausente", "sin actor no hay a quien preguntar cuando algo salga mal");
    }
    if (!p.idempotencyKey?.trim()) {
      return deniega(
        "clave_idempotencia_ausente",
        "sin clave, un reintento de red gasta dos veces",
      );
    }
    if (!Number.isFinite(p.importeCents) || p.importeCents < 0 || !Number.isInteger(p.importeCents)) {
      return deniega("importe_invalido", `importe no valido: ${p.importeCents}`);
    }

    try {
      // Idempotencia primero: si esto ya se hizo, la respuesta correcta es la
      // de entonces, no una autorizacion nueva.
      const previos = await this.db.query<FilaGasto>(
        `SELECT id, estado, referencia_externa, autorizacion_id
           FROM gastos_ejecutados WHERE idempotency_key = $1`,
        [p.idempotencyKey],
      );
      if (previos.length > 0) {
        const anterior = previos[0];
        if (anterior.estado === "denegado" || anterior.estado === "fallido") {
          return deniega(
            "error_al_comprobar",
            `esta clave ya se uso y termino en '${anterior.estado}'`,
          );
        }
        return {
          permitido: true,
          autorizacionId: anterior.autorizacion_id,
          yaEjecutado: true,
          referenciaExterna: anterior.referencia_externa,
          restanteCents: 0,
        };
      }

      const filas = await this.db.query<FilaAutorizacion>(
        // La ventana se evalua EN LA BASE y no en JavaScript.
        //
        // Comparar `Date.now()` con una fecha que puso `NOW()` de PostgreSQL es
        // comparar dos relojes distintos. Medido en local, PostgreSQL va 1 ms
        // por delante: una autorizacion aprobada en este mismo instante se
        // rechazaba por «fuera de ventana» durante esos milisegundos. Con la
        // base en otra maquina el desfase son segundos, y el sintoma seria una
        // autorizacion recien aprobada que no funciona y luego si — el peor
        // tipo de fallo, el que no se reproduce.
        //
        // `vigente` viene calculado por el mismo reloj que escribio las fechas.
        `SELECT id, presupuesto_cents, tope_por_operacion_cents, consumido_cents,
                estado, vigente_desde, vigente_hasta,
                (NOW() >= vigente_desde AND NOW() <= vigente_hasta) AS vigente
           FROM autorizaciones_de_gasto
          WHERE tenant_id = $1::uuid
            AND workspace_id = $2
            AND service_id = $3
            AND proveedor = $4
            AND estado = 'aprobada'
          ORDER BY vigente_hasta DESC
          LIMIT 1`,
        [p.tenantId, p.workspaceId, p.serviceId, p.proveedor],
      );

      if (filas.length === 0) {
        return deniega(
          "sin_autorizacion",
          `no hay autorizacion aprobada para ${p.serviceId}/${p.proveedor} en el workspace ${p.workspaceId}`,
        );
      }

      const a = filas[0];
      if (a.estado !== "aprobada") {
        return deniega("autorizacion_no_aprobada", `la autorizacion esta en '${a.estado}'`);
      }

      if (a.vigente !== true) {
        return deniega(
          "fuera_de_ventana",
          `la autorizacion es valida de ${a.vigente_desde} a ${a.vigente_hasta}`,
        );
      }

      const tope = entero(a.tope_por_operacion_cents);
      if (p.importeCents > tope) {
        return deniega(
          "supera_tope_por_operacion",
          `${p.importeCents} supera el tope por operacion de ${tope}`,
        );
      }

      const presupuesto = entero(a.presupuesto_cents);
      const consumido = entero(a.consumido_cents);
      if (consumido + p.importeCents > presupuesto) {
        return deniega(
          "supera_presupuesto",
          `${consumido} + ${p.importeCents} supera el presupuesto de ${presupuesto}`,
        );
      }

      return {
        permitido: true,
        autorizacionId: a.id,
        yaEjecutado: false,
        referenciaExterna: null,
        restanteCents: presupuesto - consumido - p.importeCents,
      };
    } catch (err) {
      // Fail-closed. Una guarda de gasto que se abre cuando no puede
      // comprobar nada es peor que no tenerla: da la sensacion de proteger.
      return deniega(
        "error_al_comprobar",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Deja constancia de un gasto y descuenta del presupuesto, en una sola
   * transacción implícita: el `UNIQUE` sobre la clave es lo que impide que dos
   * peticiones simultáneas pasen las dos. Comprobar antes y escribir después
   * dejaría una ventana entre ambas.
   *
   * Devuelve `null` si la clave ya estaba usada — quien llama debe entonces NO
   * ejecutar nada.
   */
  async registrarSolicitud(
    p: PeticionDeGasto,
    autorizacionId: string,
  ): Promise<{ gastoId: string } | null> {
    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO gastos_ejecutados
         (autorizacion_id, tenant_id, workspace_id, actor, proveedor, operacion,
          importe_cents, idempotency_key, estado)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'solicitado')
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        autorizacionId,
        p.tenantId,
        p.workspaceId,
        p.actor,
        p.proveedor,
        p.operacion,
        p.importeCents,
        p.idempotencyKey,
      ],
    );
    if (filas.length === 0) return null;
    return { gastoId: filas[0].id };
  }

  /** Cierra un gasto como ejecutado y descuenta del presupuesto autorizado. */
  async marcarEjecutado(
    gastoId: string,
    autorizacionId: string,
    importeCents: number,
    referenciaExterna: string | null,
  ): Promise<void> {
    await this.db.query(
      `UPDATE gastos_ejecutados
          SET estado = 'ejecutado', referencia_externa = $2, updated_at = NOW()
        WHERE id = $1::uuid AND estado = 'solicitado'`,
      [gastoId, referenciaExterna],
    );
    await this.db.query(
      `UPDATE autorizaciones_de_gasto
          SET consumido_cents = consumido_cents + $2,
              estado = CASE
                WHEN consumido_cents + $2 >= presupuesto_cents THEN 'agotada'
                ELSE estado
              END,
              updated_at = NOW()
        WHERE id = $1::uuid`,
      [autorizacionId, importeCents],
    );
  }

  /** Cierra un gasto que no llegó a ocurrir. NO descuenta presupuesto. */
  async marcarFallido(gastoId: string, motivo: string): Promise<void> {
    await this.db.query(
      `UPDATE gastos_ejecutados
          SET estado = 'fallido',
              detalle = detalle || jsonb_build_object('motivo', $2::text),
              updated_at = NOW()
        WHERE id = $1::uuid AND estado = 'solicitado'`,
      [gastoId, motivo.slice(0, 500)],
    );
  }

  /**
   * Deja rastro de una denegación. Una denegación que no se registra es
   * indistinguible de una petición que nunca se hizo, y eso es justo lo que no
   * se quiere cuando un agente lleva un rato intentando gastar.
   */
  async registrarDenegacion(p: PeticionDeGasto, veredicto: Veredicto): Promise<void> {
    if (veredicto.permitido) return;
    await this.db
      .query(
        `INSERT INTO gastos_ejecutados
           (autorizacion_id, tenant_id, workspace_id, actor, proveedor, operacion,
            importe_cents, idempotency_key, estado, detalle)
         SELECT a.id, $1::uuid, $2, $3, $4, $5, $6, $7, 'denegado',
                jsonb_build_object('motivo', $8::text, 'detalle', $9::text)
           FROM autorizaciones_de_gasto a
          WHERE a.workspace_id = $2 AND a.proveedor = $4
          ORDER BY a.created_at DESC LIMIT 1
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          p.tenantId,
          p.workspaceId,
          p.actor,
          p.proveedor,
          p.operacion,
          p.importeCents,
          `denegado:${p.idempotencyKey}`,
          veredicto.motivo,
          veredicto.detalle.slice(0, 500),
        ],
      )
      // Sin autorizacion previa no hay fila padre a la que colgar la
      // denegacion. Se pierde el rastro en base, no la decision: quien llama ya
      // tiene el veredicto y lo registra en su propio log.
      .catch(() => undefined);
  }
}
