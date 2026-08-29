/**
 * DEL PROSPECTO AL CLIENTE.
 *
 * LO QUE FALTABA. La máquina comercial preparaba el contacto —con base legal,
 * baja comprobada y un motivo propio de esa empresa— y ahí se acababa. Si
 * alguien contestaba, no había dónde apuntarlo: la respuesta se quedaba en el
 * correo de una persona y el resto de la cadena no existía.
 *
 *   descubrir → investigar → cualificar → personalizar → contactar
 *     → SEGUIMIENTO → RESPUESTA → OPORTUNIDAD → CONTRATO → ALTA
 *
 * Este módulo es la segunda mitad. Y lo hace CONECTANDO lo que ya había: el
 * alta del cliente no se reimplementa aquí, se delega en el ciclo del cliente
 * que ya existe y que ya sabe pedir servicios, declarar accesos y arrancar el
 * intake.
 *
 * LAS TRES REGLAS QUE GOBIERNAN ESTE FICHERO:
 *
 *   1. UN «NO» ES UN «NO». Una respuesta negativa cierra la oportunidad, y si
 *      pidió la baja entra en `comercial_bajas` —que es de NELVYON entera, sin
 *      inquilino—. Insistir a quien ya dijo que no es exactamente lo que separa
 *      a una agencia de un pesado.
 *
 *   2. NO HAY OPORTUNIDAD SIN RESPUESTA. No se puede crear una oportunidad
 *      desde una preparación que nadie contestó. Un embudo lleno de
 *      oportunidades que nadie ha confirmado no es optimismo: es una previsión
 *      que miente.
 *
 *   3. NO HAY CLIENTE SIN CIERRE. Pasar de oportunidad a cliente exige persona
 *      y fecha. Lo impone el esquema, no una comprobación que se pueda saltar.
 *
 * NO SE ENVÍA NADA. Este módulo registra lo que llega; no habilita ningún
 * envío. `ProspeccionResponsable.enviar()` sigue lanzando siempre.
 */

export type SentidoDeRespuesta = "interesado" | "mas_adelante" | "no_interesado" | "pide_baja";
export type EstadoDeOportunidad = "conversando" | "propuesta_enviada" | "ganada" | "perdida";

export interface AlmacenComercial {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/** Lo mínimo que este módulo necesita del ciclo del cliente, para no acoplarse a todo él. */
export interface AltaDeCliente {
  pedirServicio(params: {
    workspaceId: number;
    clientId: string;
    serviceId: string;
    solicitadaPor: string;
    motivo?: string;
  }): Promise<{ id: string; yaExistia: boolean }>;
}

export class ErrorComercial extends Error {
  constructor(
    readonly codigo:
      | "SIN_PREPARACION"
      | "YA_CONTESTO"
      | "SIN_RESPUESTA"
      | "NO_SE_PUEDE_GANAR"
      | "SIN_SERVICIOS"
      | "YA_CERRADA",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorComercial";
  }
}

export interface Respuesta {
  id: string;
  preparacionId: string;
  sentido: SentidoDeRespuesta;
  literal: string | null;
}

export interface Oportunidad {
  id: string;
  empresa: string;
  dominio: string;
  estado: EstadoDeOportunidad;
  clientId: string | null;
}

export class CicloComercial {
  constructor(
    private readonly db: AlmacenComercial,
    private readonly alta: AltaDeCliente,
  ) {}

  /**
   * Alguien ha contestado.
   *
   * Si dice que no quiere saber más, la baja se registra AQUÍ MISMO y no en un
   * proceso posterior. Una baja que depende de que alguien se acuerde de
   * apuntarla es una baja que un día no se apunta.
   */
  async registrarRespuesta(params: {
    workspaceId: number;
    preparacionId: string;
    sentido: SentidoDeRespuesta;
    canal: string;
    literal?: string;
    registradaPor: string;
  }): Promise<Respuesta> {
    const prep = await this.db.query<{ id: string; dominio: string; empresa: string }>(
      `SELECT id, dominio, empresa FROM comercial_preparaciones
        WHERE id = $1::uuid AND workspace_id = $2 LIMIT 1`,
      [params.preparacionId, params.workspaceId],
    );
    if (prep.length === 0) {
      throw new ErrorComercial(
        "SIN_PREPARACION",
        "no existe esa preparación: una respuesta sin contacto previo es un contacto entrante, y ése entra por otro sitio",
      );
    }

    // ── LA BAJA, ANTES QUE NADA ──────────────────────────────────────────
    //
    // Sin `workspace_id`: la tabla de bajas no lo tiene a propósito. Quien dice
    // que no quiere saber más se lo dice a NELVYON, no a un espacio de trabajo.
    if (params.sentido === "pide_baja") {
      await this.db.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por, literal)
         VALUES (lower($1), $2, $3)
         ON CONFLICT (dominio) DO NOTHING`,
        [prep[0].dominio, params.canal, params.literal ?? null],
      );
    }

    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO comercial_respuestas
         (workspace_id, preparacion_id, sentido, literal, canal, registrada_por)
       VALUES ($1, $2::uuid, $3, $4, $5, $6)
       ON CONFLICT (preparacion_id) DO NOTHING
       RETURNING id`,
      [
        params.workspaceId,
        params.preparacionId,
        params.sentido,
        params.literal ?? null,
        params.canal,
        params.registradaPor,
      ],
    );

    if (filas.length === 0) {
      throw new ErrorComercial(
        "YA_CONTESTO",
        "esa preparación ya tiene respuesta. Si la persona vuelve a escribir, es la conversación de la oportunidad",
      );
    }

    return {
      id: filas[0].id,
      preparacionId: params.preparacionId,
      sentido: params.sentido,
      literal: params.literal ?? null,
    };
  }

  /**
   * Abre una oportunidad a partir de una respuesta.
   *
   * Sólo si la respuesta da pie: de un «no me interesa» no sale una
   * oportunidad, por mucho que el embudo quede más bonito.
   */
  async abrirOportunidad(params: {
    workspaceId: number;
    respuestaId: string;
    serviciosDeInteres?: string[];
  }): Promise<Oportunidad> {
    const r = await this.db.query<{ sentido: SentidoDeRespuesta; empresa: string; dominio: string }>(
      `SELECT r.sentido, p.empresa, p.dominio
         FROM comercial_respuestas r
         JOIN comercial_preparaciones p ON p.id = r.preparacion_id
        WHERE r.id = $1::uuid AND r.workspace_id = $2
        LIMIT 1`,
      [params.respuestaId, params.workspaceId],
    );
    if (r.length === 0) {
      throw new ErrorComercial("SIN_RESPUESTA", "no existe esa respuesta");
    }

    if (r[0].sentido === "no_interesado" || r[0].sentido === "pide_baja") {
      throw new ErrorComercial(
        "SIN_RESPUESTA",
        `la respuesta fue «${r[0].sentido}»: de ahí no sale una oportunidad, por mucho que el embudo quede mejor`,
      );
    }

    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO comercial_oportunidades
         (workspace_id, respuesta_id, empresa, dominio, servicios_de_interes)
       VALUES ($1, $2::uuid, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        params.workspaceId,
        params.respuestaId,
        r[0].empresa,
        r[0].dominio,
        JSON.stringify(params.serviciosDeInteres ?? []),
      ],
    );

    return {
      id: filas[0].id,
      empresa: r[0].empresa,
      dominio: r[0].dominio,
      estado: "conversando",
      clientId: null,
    };
  }

  /**
   * La oportunidad se gana: nace el cliente.
   *
   * Aquí es donde la máquina comercial se conecta con el resto de NELVYON. NO
   * se reimplementa el alta: se crea el cliente y se delega en el ciclo que ya
   * existe, que ya sabe declarar los accesos que harán falta y arrancar el
   * intake de cada servicio.
   *
   * Duplicar esa lógica aquí habría creado un segundo camino de alta, y dos
   * caminos de alta significan que un día uno de los dos deja de declarar
   * accesos y nadie se entera.
   */
  async ganar(params: {
    workspaceId: number;
    oportunidadId: string;
    servicios: string[];
    cerradaPor: string;
    creadaPorUsuario: string;
    sector?: string;
  }): Promise<{ clientId: string; serviciosPedidos: string[] }> {
    if (!params.servicios || params.servicios.length === 0) {
      throw new ErrorComercial(
        "SIN_SERVICIOS",
        "una oportunidad ganada sin servicios es un cliente que no ha contratado nada",
      );
    }

    const o = await this.db.query<{ empresa: string; estado: EstadoDeOportunidad }>(
      `SELECT empresa, estado FROM comercial_oportunidades
        WHERE id = $1::uuid AND workspace_id = $2 LIMIT 1`,
      [params.oportunidadId, params.workspaceId],
    );
    if (o.length === 0) {
      throw new ErrorComercial("NO_SE_PUEDE_GANAR", "no existe esa oportunidad");
    }
    if (o[0].estado === "ganada" || o[0].estado === "perdida") {
      throw new ErrorComercial("YA_CERRADA", `la oportunidad ya está ${o[0].estado}`);
    }

    const cliente = await this.db.query<{ id: string }>(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, sector, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [params.workspaceId, params.creadaPorUsuario, o[0].empresa, params.sector ?? null],
    );
    const clientId = cliente[0].id;

    await this.db.query(
      `UPDATE comercial_oportunidades
          SET estado = 'ganada', cerrada_por = $1, cerrada_en = NOW(),
              client_id = $2::uuid, servicios_de_interes = $3::jsonb, updated_at = NOW()
        WHERE id = $4::uuid`,
      [params.cerradaPor, clientId, JSON.stringify(params.servicios), params.oportunidadId],
    );

    // El alta de verdad: la hace quien ya sabía hacerla.
    const pedidos: string[] = [];
    for (const s of params.servicios) {
      await this.alta.pedirServicio({
        workspaceId: params.workspaceId,
        clientId,
        serviceId: s,
        solicitadaPor: `comercial:${params.cerradaPor}`,
        motivo: `contratado tras la oportunidad ${params.oportunidadId}`,
      });
      pedidos.push(s);
    }

    return { clientId, serviciosPedidos: pedidos };
  }

  /**
   * La oportunidad se pierde, y se dice por qué.
   *
   * El motivo es obligatorio y con longitud mínima. Un embudo sin motivos de
   * pérdida no enseña nada: al mes siguiente se cometen los mismos errores
   * porque nadie apuntó cuáles fueron.
   */
  async perder(params: {
    workspaceId: number;
    oportunidadId: string;
    motivo: string;
    cerradaPor: string;
  }): Promise<void> {
    const filas = await this.db.query<{ id: string }>(
      `UPDATE comercial_oportunidades
          SET estado = 'perdida', motivo_de_perdida = $1,
              cerrada_por = $2, cerrada_en = NOW(), updated_at = NOW()
        WHERE id = $3::uuid AND workspace_id = $4
          AND estado NOT IN ('ganada', 'perdida')
        RETURNING id`,
      [params.motivo, params.cerradaPor, params.oportunidadId, params.workspaceId],
    );
    if (filas.length === 0) {
      throw new ErrorComercial("YA_CERRADA", "esa oportunidad no existe o ya estaba cerrada");
    }
  }

  /** Lo que hay abierto ahora mismo, para que nadie se quede sin seguimiento. */
  async embudo(workspaceId: number): Promise<Array<{ estado: string; cuantas: number }>> {
    const filas = await this.db.query<{ estado: string; n: string }>(
      `SELECT estado, count(*) AS n FROM comercial_oportunidades
        WHERE workspace_id = $1 GROUP BY estado ORDER BY estado`,
      [workspaceId],
    );
    return filas.map((f) => ({ estado: f.estado, cuantas: Number(f.n) }));
  }
}
