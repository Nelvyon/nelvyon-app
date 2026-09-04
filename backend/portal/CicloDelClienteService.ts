/**
 * EL CICLO DEL CLIENTE: pedir, contar, conectar.
 *
 * Cierra las tres cosas que el portal no permitía hacer y que obligaban a que
 * cada alta la hiciera una persona de NELVYON a mano:
 *
 *   - pedir un servicio;
 *   - contestar lo que hace falta saber (el intake, contra el cerebro);
 *   - declarar y seguir el estado de sus cuentas.
 *
 * LO QUE ESTE SERVICIO NO HACE, y es deliberado:
 *
 *   No pone precios. Una solicitud no es una compra: el cliente dice qué
 *   necesita y NELVYON responde con alcance y precio. El precio es una decisión
 *   comercial; lo que sí puede hacer el código es que la petición exista, quede
 *   registrada y no se pierda en un correo.
 *
 *   No dispara OAuth. Registra qué cuentas hacen falta, por qué, y en qué
 *   estado están. Conectar de verdad es otro paso, con credenciales reales.
 */

import { OS_PREMIUM_SERVICE_IDS } from "../os-agents/constants";
import type { CerebroDeNegocioService, EstadoDeCompletitud } from "../cerebro/CerebroDeNegocioService";
import { dimension, dimensionesDeServicio } from "../cerebro/dimensiones";

const SERVICIOS = new Set<string>(OS_PREMIUM_SERVICE_IDS);

/**
 * Qué cuentas necesita cada servicio, y POR QUÉ en el idioma del cliente.
 *
 * Pedir acceso a las cuentas de alguien sin explicar para qué es la forma más
 * rápida de que diga que no. Y pedirle todas las cuentas cuando sólo hacen
 * falta dos es la forma más rápida de que no conecte ninguna.
 */
export const CONEXIONES_POR_SERVICIO: Readonly<
  Record<string, ReadonlyArray<{ proveedor: string; paraQue: string }>>
> = {
  seo_premium: [
    { proveedor: "search_console", paraQue: "Ver por qué palabras te encuentran hoy en Google y cuáles se pueden ganar." },
    { proveedor: "google_analytics", paraQue: "Saber qué páginas traen visitas y cuáles no, para arreglar las que fallan." },
  ],
  ads_premium: [
    { proveedor: "google_ads", paraQue: "Crear y ajustar tus campañas sin que tengas que hacerlo tú." },
    { proveedor: "meta_ads", paraQue: "Lo mismo en Facebook e Instagram." },
    { proveedor: "google_analytics", paraQue: "Medir qué campañas traen clientes de verdad y no sólo clics." },
  ],
  social_media_premium: [
    { proveedor: "meta_pages", paraQue: "Publicar en tu Facebook e Instagram y responder comentarios." },
    { proveedor: "linkedin_pages", paraQue: "Publicar en tu LinkedIn si tus clientes están ahí." },
  ],
  email_marketing_premium: [
    { proveedor: "email_provider", paraQue: "Enviar los correos desde tu dominio, para que lleguen y no acaben en spam." },
  ],
  ecommerce_premium: [
    { proveedor: "shopify", paraQue: "Leer tu catálogo y tus ventas para saber qué promocionar." },
    { proveedor: "google_analytics", paraQue: "Ver dónde abandonan la compra tus visitantes." },
  ],
  reputacion_online_orm_premium: [
    { proveedor: "google_business", paraQue: "Ver y responder tus reseñas de Google." },
  ],
  mantenimiento_web_premium: [
    { proveedor: "hosting", paraQue: "Poder aplicar actualizaciones y arreglar lo que se rompa." },
  ],
};

export interface SolicitudDeServicio {
  id: string;
  serviceId: string;
  estado: string;
  motivo: string | null;
  precioCents: number | null;
  moneda: string | null;
  alcance: Record<string, unknown> | null;
  creada: Date;
}

export interface Conexion {
  proveedor: string;
  estado: string;
  paraQue: string;
  servicios: string[];
  conectadaEn: Date | null;
}

/** Lo que el portal enseña en su HOME. Las cuatro preguntas, contestadas. */
export interface ResumenDelCliente {
  /** ¿Qué está haciendo NELVYON por mí? */
  serviciosActivos: string[];
  solicitudes: SolicitudDeServicio[];
  /** ¿Qué necesita NELVYON de mí? */
  loQueFalta: {
    datos: EstadoDeCompletitud["huecosDelCliente"];
    conexiones: Conexion[];
  };
  /** ¿Puedo empezar ya, o falta algo imprescindible? */
  listoParaOperar: boolean;
}

export class ErrorDelCiclo extends Error {
  constructor(
    readonly codigo:
      | "SERVICIO_DESCONOCIDO"
      | "YA_SOLICITADO"
      | "DIMENSION_NO_ES_DEL_CLIENTE"
      | "SIN_ALCANCE",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDelCiclo";
  }
}

export interface AlmacenDelCiclo {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export class CicloDelClienteService {
  constructor(
    private readonly db: AlmacenDelCiclo,
    private readonly cerebro: CerebroDeNegocioService,
  ) {}

  // ── Pedir un servicio ────────────────────────────────────────────────────

  /**
   * El cliente pide un servicio. NO se cobra ni se activa nada: queda pedido.
   *
   * El índice parcial de la migración impide una segunda petición viva del
   * mismo servicio, así que un doble clic no crea dos. Se traduce a un error
   * con nombre en vez de dejar salir el error de la base, que nadie entiende.
   */
  async pedirServicio(params: {
    workspaceId: number;
    clientId: string;
    serviceId: string;
    solicitadaPor: string;
    motivo?: string;
  }): Promise<{ id: string; yaExistia: boolean }> {
    if (!SERVICIOS.has(params.serviceId)) {
      throw new ErrorDelCiclo(
        "SERVICIO_DESCONOCIDO",
        `"${params.serviceId}" no está en el catálogo de servicios`,
      );
    }

    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_service_requests
         (workspace_id, client_id, service_id, solicitada_por, motivo, estado)
       VALUES ($1, $2, $3, $4, $5, 'solicitado')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.serviceId,
        params.solicitadaPor,
        params.motivo?.slice(0, 2000) ?? null,
      ],
    );

    if (filas.length > 0) {
      // Pedir un servicio declara qué cuentas van a hacer falta. Enseñárselo al
      // cliente el primer día es lo que evita descubrirlo tres semanas después.
      await this.declararConexionesNecesarias(params.workspaceId, params.clientId, params.serviceId);
      return { id: filas[0].id, yaExistia: false };
    }

    const vivas = await this.db.query<{ id: string }>(
      `SELECT id FROM os_service_requests
        WHERE workspace_id = $1 AND client_id = $2 AND service_id = $3
          AND estado IN ('solicitado', 'en_revision', 'propuesto')
        LIMIT 1`,
      [params.workspaceId, params.clientId, params.serviceId],
    );
    if (vivas.length > 0) return { id: vivas[0].id, yaExistia: true };

    throw new ErrorDelCiclo("YA_SOLICITADO", "no se pudo registrar la solicitud");
  }

  /**
   * NELVYON acepta la solicitud y el servicio queda contratado.
   *
   * ── LA TRANSICIÓN QUE FALTABA ─────────────────────────────────────────────
   *
   * `os_service_requests` declara seis estados —solicitado, en_revisión,
   * propuesto, aceptado, rechazado, cancelado— y sólo se escribía el primero.
   * Medido: en todo el repositorio, ni una sentencia movía una solicitud a
   * `aceptado`.
   *
   * Un cliente pedía un servicio y se quedaba pedido para siempre. Y como
   * `SenalesDeCliente` sólo mira las aceptadas, la mitad de las señales de
   * salud del cliente no podían dispararse nunca: no había ninguna.
   *
   * ── Y EL CONTRATO ─────────────────────────────────────────────────────────
   *
   * `os_service_contracts` lo leen CUATRO módulos —comprobación de salud,
   * informes, analítica de administración y el cron de mantenimiento— y no lo
   * escribía nadie. `OsHealthCheck` recorría cero clientes y no informaba de
   * ningún problema: un verde falso, que es peor que un rojo.
   *
   * Una solicitud aceptada ES un contrato. Aquí es donde nace.
   *
   * ── IDEMPOTENTE ───────────────────────────────────────────────────────────
   *
   * Aceptar dos veces la misma solicitud no crea dos contratos. Y aceptar algo
   * que ya no está en un estado aceptable no hace nada: se dice y ya está, en
   * vez de reabrir algo cancelado.
   */
  async aceptarSolicitud(params: {
    workspaceId: number;
    clientId: string;
    solicitudId: string;
    aceptadaPor: string;
  }): Promise<{ aceptada: boolean; motivo?: string; contratoId?: string }> {
    const movidas = await this.db.query<{ service_id: string }>(
      `UPDATE os_service_requests
          SET estado = 'aceptado', decidida_en = NOW(), updated_at = NOW()
        WHERE id = $1::uuid
          AND workspace_id = $2
          AND client_id = $3::uuid
          AND estado IN ('solicitado', 'en_revision', 'propuesto')
        RETURNING service_id`,
      [params.solicitudId, params.workspaceId, params.clientId],
    );

    if (movidas.length === 0) {
      // O no existe, o es de otro cliente, o ya se decidió. En los tres casos
      // la respuesta correcta es no hacer nada y decirlo.
      const yaAceptada = await this.db.query<{ id: string }>(
        `SELECT id FROM os_service_requests
          WHERE id = $1::uuid AND workspace_id = $2 AND client_id = $3::uuid
            AND estado = 'aceptado' LIMIT 1`,
        [params.solicitudId, params.workspaceId, params.clientId],
      );
      return yaAceptada.length > 0
        ? { aceptada: true, motivo: "ya estaba aceptada" }
        : { aceptada: false, motivo: "la solicitud no existe o ya se decidió" };
    }

    const serviceId = movidas[0].service_id;
    const contratoId = await this.crearContrato(params.workspaceId, params.clientId, serviceId);
    return { aceptada: true, contratoId: contratoId ?? undefined };
  }

  /**
   * El contrato que leen la comprobación de salud, los informes y la analítica.
   *
   * `os_service_contracts` va por `tenant_id` y las solicitudes por
   * `workspace_id`. El puente es `saas_tenants`. Si el workspace no tiene
   * inquilino, NO se inventa uno: se deja constancia y el contrato no se crea —
   * meterlo con un inquilino equivocado se lo enseñaría a otra agencia.
   */
  private async crearContrato(
    workspaceId: number,
    clientId: string,
    serviceId: string,
  ): Promise<string | null> {
    const inquilinos = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_tenants WHERE workspace_id = $1 LIMIT 1`,
      [workspaceId],
    );
    const tenantId = inquilinos[0]?.id;
    if (!tenantId) {
      console.warn(
        `[ciclo] el workspace ${workspaceId} no tiene inquilino: `
          + `el servicio ${serviceId} queda aceptado sin contrato`,
      );
      return null;
    }

    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_service_contracts (tenant_id, service_id, client_id, status)
       VALUES ($1::uuid, $2, $3, 'active')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [tenantId, serviceId, clientId],
    );
    if (filas[0]) return filas[0].id;

    // Ya había uno. Se devuelve el que hay en vez de crear un segundo.
    const existentes = await this.db.query<{ id: string }>(
      `SELECT id FROM os_service_contracts
        WHERE tenant_id = $1::uuid AND service_id = $2 AND client_id = $3
        LIMIT 1`,
      [tenantId, serviceId, clientId],
    );
    return existentes[0]?.id ?? null;
  }

  async solicitudesDe(workspaceId: number, clientId: string): Promise<SolicitudDeServicio[]> {
    const filas = await this.db.query<{
      id: string; service_id: string; estado: string; motivo: string | null;
      precio_cents: string | null; moneda: string | null;
      alcance: Record<string, unknown> | null; created_at: string;
    }>(
      `SELECT id, service_id, estado, motivo, precio_cents, moneda, alcance, created_at
         FROM os_service_requests
        WHERE workspace_id = $1 AND client_id = $2
        ORDER BY created_at DESC`,
      [workspaceId, clientId],
    );
    return filas.map((f) => ({
      id: f.id,
      serviceId: f.service_id,
      estado: f.estado,
      motivo: f.motivo,
      precioCents: f.precio_cents === null ? null : Number(f.precio_cents),
      moneda: f.moneda,
      alcance: f.alcance,
      creada: new Date(f.created_at),
    }));
  }

  // ── Contar lo que hace falta saber ───────────────────────────────────────

  /**
   * Las preguntas que le tocan al CLIENTE para un servicio, con lo que ya ha
   * contestado marcado.
   *
   * Sólo las suyas: pedirle las que debemos deducir nosotros —sus keywords, sus
   * audiencias— es pedirle que haga nuestro trabajo.
   */
  async preguntasPendientes(
    workspaceId: number,
    clientId: string,
    serviceId?: string,
  ): Promise<{
    pendientes: Array<{ dimension: string; pregunta: string; forma: string; imprescindible: boolean }>;
    contestadas: number;
    total: number;
  }> {
    const estado = await this.cerebro.completitud(workspaceId, clientId, serviceId);
    const delCliente = (serviceId ? dimensionesDeServicio(serviceId) : []).filter(
      (d) => d.laAporta === "cliente",
    );

    const pendientes = estado.huecosDelCliente.map((h) => {
      const def = dimension(h.dimension);
      return {
        dimension: h.dimension,
        pregunta: h.pregunta,
        forma: def?.forma ?? "texto",
        imprescindible: h.imprescindible,
      };
    });

    const total = serviceId ? delCliente.length : estado.requeridas;
    return { pendientes, contestadas: Math.max(0, total - pendientes.length), total };
  }

  /**
   * El cliente contesta. Va al cerebro con procedencia `cliente_portal`.
   *
   * Se rechaza escribir dimensiones que NO le tocan al cliente: si el portal
   * pudiera escribir `resultados` o `analytics`, un cliente podría declarar sus
   * propios resultados y el motor de optimización se creería su propio ruido.
   */
  async contestar(params: {
    workspaceId: number;
    clientId: string;
    respuestas: Array<{ dimension: string; valor: Record<string, unknown> }>;
    quien: string;
  }): Promise<{ guardadas: string[] }> {
    const guardadas: string[] = [];
    for (const r of params.respuestas) {
      const def = dimension(r.dimension);
      if (!def) {
        throw new ErrorDelCiclo(
          "DIMENSION_NO_ES_DEL_CLIENTE",
          `"${r.dimension}" no existe`,
        );
      }
      if (def.laAporta !== "cliente") {
        throw new ErrorDelCiclo(
          "DIMENSION_NO_ES_DEL_CLIENTE",
          `"${r.dimension}" la aporta ${def.laAporta}, no el cliente`,
        );
      }
      await this.cerebro.escribir({
        workspaceId: params.workspaceId,
        clientId: params.clientId,
        dimension: r.dimension,
        valor: r.valor,
        procedencia: "cliente_portal",
        origen: params.quien,
      });
      guardadas.push(r.dimension);
    }
    return { guardadas };
  }

  // ── Conectar cuentas ─────────────────────────────────────────────────────

  /** Declara qué cuentas hacen falta para un servicio. Idempotente. */
  async declararConexionesNecesarias(
    workspaceId: number,
    clientId: string,
    serviceId: string,
  ): Promise<{ declaradas: string[] }> {
    const necesarias = CONEXIONES_POR_SERVICIO[serviceId] ?? [];
    const declaradas: string[] = [];
    for (const c of necesarias) {
      await this.db.query(
        `INSERT INTO os_client_connections
           (workspace_id, client_id, proveedor, estado, para_que, servicios)
         VALUES ($1, $2, $3, 'necesaria', $4, ARRAY[$5]::text[])
         ON CONFLICT (workspace_id, client_id, proveedor) DO UPDATE
           SET servicios = (
                 SELECT ARRAY(SELECT DISTINCT unnest(os_client_connections.servicios || ARRAY[$5]::text[]))
               ),
               updated_at = NOW()`,
        [workspaceId, clientId, c.proveedor, c.paraQue, serviceId],
      );
      declaradas.push(c.proveedor);
    }
    return { declaradas };
  }

  async conexionesDe(workspaceId: number, clientId: string): Promise<Conexion[]> {
    const filas = await this.db.query<{
      proveedor: string; estado: string; para_que: string;
      servicios: string[]; conectada_en: string | null;
    }>(
      `SELECT proveedor, estado, para_que, servicios, conectada_en
         FROM os_client_connections
        WHERE workspace_id = $1 AND client_id = $2
        ORDER BY estado, proveedor`,
      [workspaceId, clientId],
    );
    return filas.map((f) => ({
      proveedor: f.proveedor,
      estado: f.estado,
      paraQue: f.para_que,
      servicios: f.servicios ?? [],
      conectadaEn: f.conectada_en ? new Date(f.conectada_en) : null,
    }));
  }

  /**
   * El cliente dice que NO va a dar acceso a una cuenta.
   *
   * Es una respuesta legítima y hay que poder registrarla: una conexión
   * rechazada deja de perseguirse, y el servicio que dependía de ella se
   * replantea. Perseguir para siempre algo que el cliente ya ha dicho que no
   * da es la forma más rápida de que deje de leer los avisos.
   */
  async rechazarConexion(
    workspaceId: number,
    clientId: string,
    proveedor: string,
    motivo?: string,
  ): Promise<void> {
    await this.db.query(
      `UPDATE os_client_connections
          SET estado = 'rechazada', ultimo_error = $4, updated_at = NOW()
        WHERE workspace_id = $1 AND client_id = $2 AND proveedor = $3`,
      [workspaceId, clientId, proveedor, motivo?.slice(0, 500) ?? null],
    );
  }

  // ── El resumen del portal ────────────────────────────────────────────────

  /**
   * Las cuatro preguntas que el HOME del portal tiene que contestar, en una
   * sola llamada. Que estén juntas no es comodidad: es que un portal donde hay
   * que navegar para descubrir que falta algo es un portal donde no se descubre.
   */
  async resumen(
    workspaceId: number,
    clientId: string,
  ): Promise<ResumenDelCliente> {
    const [solicitudes, conexiones, completitud] = await Promise.all([
      this.solicitudesDe(workspaceId, clientId),
      this.conexionesDe(workspaceId, clientId),
      this.cerebro.completitud(workspaceId, clientId),
    ]);

    const serviciosActivos = solicitudes
      .filter((s) => s.estado === "aceptado")
      .map((s) => s.serviceId);

    return {
      serviciosActivos,
      solicitudes,
      loQueFalta: {
        datos: completitud.huecosDelCliente,
        // Sólo lo que de verdad bloquea. Una conexión ya rechazada o marcada
        // como no aplicable no es algo que el cliente tenga pendiente.
        conexiones: conexiones.filter((c) => c.estado === "necesaria" || c.estado === "invitada" || c.estado === "caducada"),
      },
      listoParaOperar: completitud.listoParaOperar,
    };
  }
}
