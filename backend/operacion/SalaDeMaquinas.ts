/**
 * LA SALA DE MÁQUINAS.
 *
 * LA PREGUNTA QUE NADIE PODÍA CONTESTAR, y que costó dos meses. En producción
 * había doce trabajos encolados desde junio que nunca se ejecutaron. Nadie se
 * enteró hasta agosto. No fue por falta de datos —los doce estaban en la tabla,
 * con su fecha— sino porque no había ni una pantalla que preguntara:
 *
 *     ¿QUÉ LLEVA PARADO MÁS TIEMPO DEL QUE DEBERÍA?
 *
 * Ésa es la única pregunta que este módulo contesta. Todo lo demás —cuántos
 * clientes hay, cuántos entregables se hicieron— ya lo enseñan noventa y una
 * pantallas, y añadir la número noventa y dos con los mismos números no habría
 * evitado nada.
 *
 * CÓMO SE MIDE «PARADO», porque es donde está la trampa. Un trabajo encolado
 * hace diez minutos no está parado: está esperando su turno. Uno encolado hace
 * seis semanas no está esperando, está olvidado. La diferencia es un umbral, y
 * un umbral mal puesto convierte esta pantalla en ruido — que es cómo muere una
 * alerta.
 *
 * Los umbrales de abajo salen de lo que el propio sistema promete: si la cola
 * reintenta a los cinco minutos, algo que lleva una hora encolado ya ha
 * incumplido doce veces su propia promesa.
 *
 * LOS NOMBRES DE COLUMNA SALEN DEL ESQUEMA REAL, no del que uno supone. Es la
 * lección que ya se pagó con `SenalesDeCliente`, que consultaba una tabla
 * inexistente y habría devuelto cero para siempre sin dar un solo error. Aquí:
 * `os_jobs` identifica al inquilino con `tenant_id`, su estado en curso se
 * llama `running` y la marca de tiempo es `locked_at`. `os_deliverables` va por
 * `workspace_id`. Son distintos, y se tratan como distintos.
 *
 * LO QUE ESTE MÓDULO NO HACE:
 *
 *   · No arregla nada. No reencola, no cancela, no reintenta. Enseña.
 *     Un panel que además actúa es un panel que un día actúa por su cuenta.
 *   · No inventa cifras. Lo que no se puede medir sale en `noMedido` y la
 *     pantalla dice «no se sabe», nunca cero. Un cero es una afirmación.
 */

export interface AlmacenDeOperacion {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Cuánto puede llevar algo en cada estado antes de que sea un problema.
 *
 * No son números redondos por gusto: cada uno sale de lo que el sistema promete.
 */
export const UMBRALES = {
  /** La cola reintenta a los 5 min. Una hora son doce promesas incumplidas. */
  encoladoMinutos: 60,
  /** Un trabajo en curso más de 30 min o está atascado o alguien lo mató. */
  enCursoMinutos: 30,
  /** Esperar a una persona un día laborable es razonable; tres, no. */
  esperandoAprobacionHoras: 72,
  /** Un entregable en revisión más de una semana se ha caído de la mesa. */
  enRevisionDias: 7,
} as const;

export interface Atasco {
  tipo: "trabajo" | "aprobacion" | "entregable";
  id: string;
  /**
   * De quién.
   *
   * DOS CAMPOS Y NO UNO, porque el árbol tiene dos: `os_jobs` identifica al
   * inquilino por `tenant_id` (uuid) y `os_deliverables` por `workspace_id`
   * (entero). Unificarlos aquí obligaría a inventar una conversión, y una
   * conversión inventada entre identificadores de inquilino es la clase de
   * atajo que acaba enseñando los datos de otro cliente.
   */
  tenantId: string | null;
  workspaceId: number | null;
  clientId: string | null;
  estado: string;
  paradoDesde: string;
  horasParado: number;
  /** Qué debería pasar. Un atasco sin siguiente paso es una queja. */
  queHacer: string;
}

export interface Pulso {
  /** Cuándo se miró. Un panel sin hora es un panel que puede estar congelado. */
  medidoEn: string;
  /** Lo parado, de lo que más tiempo lleva a lo que menos. */
  atascos: Atasco[];
  /** Cuántos de cada tipo, para distinguir un caso de un patrón. */
  porTipo: Record<string, number>;
  /**
   * Lo que sí avanza. Va aquí para que la pantalla no sea sólo malas noticias:
   * sin este contraste, tres atascos parecen un sistema roto.
   */
  enMovimiento: {
    trabajosCompletadosUltimas24h: number | null;
    entregablesPublicadosUltimas24h: number | null;
  };
  /** Lo que NO se pudo medir, y por qué. Nunca se rellena con ceros. */
  noMedido: Array<{ que: string; porQue: string }>;
}

export class SalaDeMaquinas {
  constructor(private readonly db: AlmacenDeOperacion) {}

  /**
   * El pulso del sistema.
   *
   * Cada medición va en su propio `try`. Si una tabla no existe en esta
   * instalación, se anota en `noMedido` y las demás siguen: un panel que se cae
   * entero porque falta una tabla opcional es un panel que nadie abre.
   */
  async pulso(): Promise<Pulso> {
    const atascos: Atasco[] = [];
    const noMedido: Array<{ que: string; porQue: string }> = [];

    // ── Trabajos encolados que nadie ha reclamado ───────────────────────────
    await this.medir("trabajos encolados sin arrancar", noMedido, async () => {
      const filas = await this.db.query<{
        job_id: string; tenant_id: string | null; client_id: string | null;
        run_after: string; horas: string;
      }>(
        `SELECT job_id, tenant_id::text AS tenant_id, client_id, run_after::text AS run_after,
                EXTRACT(EPOCH FROM (NOW() - run_after)) / 3600 AS horas
           FROM os_jobs
          WHERE status = 'queued'
            AND run_after < NOW() - ($1 || ' minutes')::interval
          ORDER BY run_after ASC
          LIMIT 50`,
        [UMBRALES.encoladoMinutos],
      );
      for (const f of filas) {
        atascos.push({
          tipo: "trabajo",
          id: f.job_id,
          tenantId: f.tenant_id,
          workspaceId: null,
          clientId: f.client_id,
          estado: "encolado sin arrancar",
          paradoDesde: f.run_after,
          horasParado: redondear(f.horas),
          queHacer:
            "comprobar que hay un trabajador vivo y que atiende este servicio. " +
            "Un trabajo encolado sin nadie que lo reclame no da error: se queda.",
        });
      }
    });

    // ── Trabajos que alguien reclamó y nunca terminó ────────────────────────
    await this.medir("trabajos en curso demasiado tiempo", noMedido, async () => {
      const filas = await this.db.query<{
        job_id: string; tenant_id: string | null; client_id: string | null;
        locked_at: string; horas: string;
      }>(
        `SELECT job_id, tenant_id::text AS tenant_id, client_id, locked_at::text AS locked_at,
                EXTRACT(EPOCH FROM (NOW() - locked_at)) / 3600 AS horas
           FROM os_jobs
          WHERE status = 'running'
            AND locked_at IS NOT NULL
            AND locked_at < NOW() - ($1 || ' minutes')::interval
          ORDER BY locked_at ASC
          LIMIT 50`,
        [UMBRALES.enCursoMinutos],
      );
      for (const f of filas) {
        atascos.push({
          tipo: "trabajo",
          id: f.job_id,
          tenantId: f.tenant_id,
          workspaceId: null,
          clientId: f.client_id,
          estado: "en curso, sin terminar",
          paradoDesde: f.locked_at,
          horasParado: redondear(f.horas),
          queHacer:
            "probablemente murió el proceso que lo reclamó. El rescate debería " +
            "devolverlo a la cola; si no lo hace, el rescate es lo que hay que mirar.",
        });
      }
    });

    // ── Cosas esperando a una persona ───────────────────────────────────────
    await this.medir("cosas esperando a una persona", noMedido, async () => {
      const filas = await this.db.query<{
        job_id: string; tenant_id: string | null; client_id: string | null;
        updated_at: string; horas: string;
      }>(
        `SELECT job_id, tenant_id::text AS tenant_id, client_id, updated_at::text AS updated_at,
                EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS horas
           FROM os_jobs
          WHERE status = 'waiting_approval'
            AND updated_at < NOW() - ($1 || ' hours')::interval
          ORDER BY updated_at ASC
          LIMIT 50`,
        [UMBRALES.esperandoAprobacionHoras],
      );
      for (const f of filas) {
        atascos.push({
          tipo: "aprobacion",
          id: f.job_id,
          tenantId: f.tenant_id,
          workspaceId: null,
          clientId: f.client_id,
          estado: "esperando que alguien apruebe",
          paradoDesde: f.updated_at,
          horasParado: redondear(f.horas),
          queHacer:
            "alguien tiene que decir que sí o que no. Esperar no es un estado " +
            "estable: mientras tanto el cliente cree que se está trabajando.",
        });
      }
    });

    // ── Entregables encallados ──────────────────────────────────────────────
    await this.medir("entregables encallados en revisión", noMedido, async () => {
      const filas = await this.db.query<{
        id: string; workspace_id: number; client_id: string | null;
        status: string; updated_at: string; horas: string;
      }>(
        `SELECT id, workspace_id, client_id, status, updated_at::text AS updated_at,
                EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS horas
           FROM os_deliverables
          WHERE status IN ('in_review', 'draft')
            AND updated_at < NOW() - ($1 || ' days')::interval
          ORDER BY updated_at ASC
          LIMIT 50`,
        [UMBRALES.enRevisionDias],
      );
      for (const f of filas) {
        atascos.push({
          tipo: "entregable",
          id: f.id,
          tenantId: null,
          workspaceId: f.workspace_id,
          clientId: f.client_id,
          estado: `${f.status} sin moverse`,
          paradoDesde: f.updated_at,
          horasParado: redondear(f.horas),
          queHacer: "o se publica o se archiva. Un borrador eterno es trabajo pagado que no llegó.",
        });
      }
    });

    // ── Lo que sí avanza ────────────────────────────────────────────────────
    //
    // `null` de partida, no cero. Si la consulta falla, la pantalla dice «no se
    // sabe». Un cero afirmaría que se miró y no había nada — que es justo la
    // mentira que este módulo existe para no contar.
    const enMovimiento: Pulso["enMovimiento"] = {
      trabajosCompletadosUltimas24h: null,
      entregablesPublicadosUltimas24h: null,
    };

    await this.medir("trabajos completados en 24 h", noMedido, async () => {
      const r = await this.db.query<{ n: string }>(
        `SELECT count(*) AS n FROM os_jobs
          WHERE status = 'completed' AND updated_at > NOW() - interval '24 hours'`,
      );
      enMovimiento.trabajosCompletadosUltimas24h = Number(r[0]?.n ?? 0);
    });

    await this.medir("entregables publicados en 24 h", noMedido, async () => {
      const r = await this.db.query<{ n: string }>(
        `SELECT count(*) AS n FROM os_deliverables
          WHERE status IN ('published', 'delivered', 'approved')
            AND updated_at > NOW() - interval '24 hours'`,
      );
      enMovimiento.entregablesPublicadosUltimas24h = Number(r[0]?.n ?? 0);
    });

    atascos.sort((a, b) => b.horasParado - a.horasParado);

    const porTipo: Record<string, number> = {};
    for (const a of atascos) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;

    return { medidoEn: new Date().toISOString(), atascos, porTipo, enMovimiento, noMedido };
  }

  /**
   * Ejecuta una medición y, si falla, lo anota en vez de tumbar el panel.
   *
   * `noMedido` NO es lo mismo que cero, y la diferencia es todo el propósito de
   * este módulo: un cero dice «he mirado y no hay nada», y un fallo silencioso
   * convertido en cero dice exactamente lo mismo siendo mentira.
   */
  private async medir(
    que: string,
    noMedido: Array<{ que: string; porQue: string }>,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (e) {
      noMedido.push({ que, porQue: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
}

const redondear = (horas: string): number => Math.round(Number(horas) * 10) / 10;
