/**
 * LO QUE UN DEPARTAMENTO APRENDE Y A OTRO LE SIRVE.
 *
 * Los términos de búsqueda que convierten en Ads dicen qué contenido escribir.
 * Las objeciones que aparecen en ventas dicen qué responder en el copy. Las
 * reseñas dicen con qué palabras habla el cliente de verdad. Hoy todo eso se
 * pierde en el departamento donde ocurrió.
 *
 * CUATRO REGLAS, y cada una impide una forma concreta de que esto se convierta
 * en ruido:
 *
 * 1. UNA INFERENCIA NO ES UN HECHO. Todo insight lleva confianza, procedencia y
 *    evidencia. Un destinatario puede exigir un mínimo antes de actuar.
 *
 * 2. NO SE CRUZAN INQUILINOS. Lo que NELVYON aprende del negocio de un cliente
 *    es de ese cliente. No hay método que lea sin workspace.
 *
 * 3. NO HAY BUCLES. Un insight derivado de otro cuenta su profundidad, y
 *    pasada la tercera no se deriva más. Dos agentes reaccionando el uno al
 *    otro producen ruido creciente que parece actividad.
 *
 * 4. NO SE REPITE EL MISMO HALLAZGO. La huella se calcula del contenido, así
 *    que un agente que corre cada hora no mete veinte copias de lo mismo.
 */

import { createHash } from "node:crypto";

import { esDepartamentoConocido } from "../agentes/departamentos";

export type ProcedenciaDeInsight = "medido" | "derivado" | "observado" | "humano";

export interface Insight {
  id: string;
  origenDep: string;
  destinoDep: string;
  autor: string;
  afirmacion: string;
  evidencia: Record<string, unknown>;
  confianza: number;
  procedencia: ProcedenciaDeInsight;
  derivadoDe: string | null;
  profundidad: number;
  estado: string;
  vigenteHasta: Date;
}

/**
 * Las rutas que tienen sentido. Es una lista CERRADA a propósito: sin ella,
 * cualquier departamento podría mandarle cualquier cosa a cualquier otro, y la
 * bandeja de entrada de cada uno se llenaría de cosas que no sabe usar.
 *
 * Cada ruta dice qué tipo de aprendizaje viaja, porque el destinatario tiene
 * que saber qué está recibiendo para hacer algo con ello.
 */
export const RUTAS: Readonly<Record<string, ReadonlyArray<{ a: string; que: string }>>> = {
  paid_media: [
    { a: "seo", que: "términos de búsqueda que convierten y aún no se trabajan en orgánico" },
    { a: "contenido", que: "preguntas reales que la gente escribe antes de comprar" },
    { a: "creatividad", que: "qué creatividades rinden y cuáles se agotan" },
    { a: "copy", que: "qué mensajes convierten y cuáles no" },
  ],
  seo: [
    { a: "paid_media", que: "búsquedas donde ya se gana gratis y no hace falta pagar" },
    { a: "contenido", que: "huecos de contenido con demanda medida" },
  ],
  crm: [
    { a: "estrategia", que: "cómo es de verdad el cliente que compra, frente al que se declaró" },
    { a: "paid_media", que: "qué audiencias generan clientes y cuáles sólo contactos" },
    { a: "copy", que: "objeciones que aparecen una y otra vez en el proceso de venta" },
  ],
  reputacion: [
    { a: "copy", que: "las palabras con las que los clientes hablan del negocio" },
    { a: "estrategia", que: "qué se repite en lo que va mal" },
  ],
  email_lifecycle: [
    { a: "crm", que: "qué segmentos responden y cuáles están muertos" },
    { a: "contenido", que: "qué asuntos y temas se abren" },
  ],
  cro: [
    { a: "web", que: "dónde se abandona y qué lo arregló" },
    { a: "copy", que: "qué versión de un mensaje convierte mejor" },
  ],
  social: [
    { a: "contenido", que: "qué formatos y temas funcionan en cada red" },
    { a: "creatividad", que: "qué se comparte y qué se ignora" },
  ],
  customer_success: [
    { a: "estrategia", que: "qué bloquea a los clientes de forma repetida" },
  ],
  analitica: [
    { a: "estrategia", que: "qué acciones tuvieron resultado medido y cuáles no" },
    { a: "paid_media", que: "dónde el coste por resultado se está deteriorando" },
    { a: "seo", que: "qué páginas ganan o pierden tráfico" },
  ],
};

/** Profundidad máxima de derivación. Pasada, no se deriva más. */
export const PROFUNDIDAD_MAXIMA = 3;

/** Días que vive un insight por defecto. */
export const VIGENCIA_POR_DEFECTO_DIAS = 90;

export class ErrorDeInsight extends Error {
  constructor(
    readonly codigo:
      | "RUTA_DESCONOCIDA"
      | "DEPARTAMENTO_DESCONOCIDO"
      | "SIN_EVIDENCIA"
      | "BUCLE"
      | "SIN_ALCANCE",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeInsight";
  }
}

export interface AlmacenDeInsights {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Huella del contenido. Se calcula de la afirmación normalizada, no del objeto
 * entero: dos ejecuciones del mismo agente producen evidencias con marcas de
 * tiempo distintas y la misma conclusión, y eso es el mismo insight.
 */
export function huellaDe(afirmacion: string): string {
  return createHash("sha256")
    .update(afirmacion.toLowerCase().replace(/\s+/g, " ").trim())
    .digest("hex")
    .slice(0, 24);
}

export function rutaPermitida(origen: string, destino: string): boolean {
  return (RUTAS[origen] ?? []).some((r) => r.a === destino);
}

export class InteligenciaEntreDepartamentos {
  constructor(private readonly db: AlmacenDeInsights) {}

  private exigirAlcance(workspaceId: number): void {
    if (!Number.isInteger(workspaceId)) {
      throw new ErrorDeInsight("SIN_ALCANCE", "los insights no se leen sin workspace");
    }
  }

  /**
   * Publica un insight de un departamento hacia otro.
   *
   * Devuelve `duplicado` cuando ya existía uno vivo con la misma huella. No es
   * un error: es que ese hallazgo ya está sobre la mesa.
   */
  async publicar(params: {
    workspaceId: number;
    clientId: string;
    origenDep: string;
    destinoDep: string;
    autor: string;
    afirmacion: string;
    evidencia: Record<string, unknown>;
    confianza: number;
    procedencia: ProcedenciaDeInsight;
    derivadoDe?: string | null;
    vigenciaDias?: number;
  }): Promise<{ id: string; duplicado: boolean }> {
    this.exigirAlcance(params.workspaceId);

    if (!esDepartamentoConocido(params.origenDep) || !esDepartamentoConocido(params.destinoDep)) {
      throw new ErrorDeInsight(
        "DEPARTAMENTO_DESCONOCIDO",
        `"${params.origenDep}" → "${params.destinoDep}": alguno no existe`,
      );
    }
    if (!rutaPermitida(params.origenDep, params.destinoDep)) {
      throw new ErrorDeInsight(
        "RUTA_DESCONOCIDA",
        `no hay ruta declarada de "${params.origenDep}" a "${params.destinoDep}"; ` +
          `sin ruta, el destinatario no sabe qué está recibiendo`,
      );
    }
    if (Object.keys(params.evidencia ?? {}).length === 0) {
      throw new ErrorDeInsight(
        "SIN_EVIDENCIA",
        "un insight sin evidencia es una corazonada con formato de dato",
      );
    }

    // ── El corte de bucles ────────────────────────────────────────────────
    let profundidad = 0;
    if (params.derivadoDe) {
      const padres = await this.db.query<{ profundidad: number }>(
        `SELECT profundidad FROM os_insights WHERE id = $1::uuid AND workspace_id = $2`,
        [params.derivadoDe, params.workspaceId],
      );
      if (padres.length === 0) {
        throw new ErrorDeInsight("BUCLE", "el insight del que se deriva no existe en este workspace");
      }
      profundidad = padres[0].profundidad + 1;
      if (profundidad > PROFUNDIDAD_MAXIMA) {
        throw new ErrorDeInsight(
          "BUCLE",
          `profundidad ${profundidad}: dos agentes reaccionando el uno al otro producen ` +
            `ruido creciente que parece actividad`,
        );
      }
    }

    const huella = huellaDe(params.afirmacion);
    const vigencia = params.vigenciaDias ?? VIGENCIA_POR_DEFECTO_DIAS;

    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_insights
         (workspace_id, client_id, origen_dep, destino_dep, autor, afirmacion,
          evidencia, confianza, procedencia, derivado_de, profundidad, huella,
          vigente_hasta)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::uuid, $11, $12,
               NOW() + ($13::int || ' days')::interval)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.origenDep,
        params.destinoDep,
        params.autor,
        params.afirmacion,
        JSON.stringify(params.evidencia),
        params.confianza,
        params.procedencia,
        params.derivadoDe ?? null,
        profundidad,
        huella,
        vigencia,
      ],
    );

    if (filas.length > 0) return { id: filas[0].id, duplicado: false };

    const existentes = await this.db.query<{ id: string }>(
      `SELECT id FROM os_insights
        WHERE workspace_id = $1 AND client_id = $2::uuid
          AND origen_dep = $3 AND destino_dep = $4 AND huella = $5
          AND estado IN ('nuevo', 'consumido')
        LIMIT 1`,
      [params.workspaceId, params.clientId, params.origenDep, params.destinoDep, huella],
    );
    return { id: existentes[0]?.id ?? "", duplicado: true };
  }

  /**
   * La bandeja de entrada de un departamento: lo que otros han aprendido y le
   * sirve, sin caducar y por encima de la confianza que exija.
   *
   * `confianzaMinima` existe para que un departamento que va a gastar dinero
   * pueda exigir más certeza que uno que redacta un borrador.
   */
  async bandeja(params: {
    workspaceId: number;
    clientId: string;
    departamento: string;
    confianzaMinima?: number;
  }): Promise<Insight[]> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{
      id: string; origen_dep: string; destino_dep: string; autor: string;
      afirmacion: string; evidencia: Record<string, unknown>; confianza: string;
      procedencia: ProcedenciaDeInsight; derivado_de: string | null;
      profundidad: number; estado: string; vigente_hasta: string;
    }>(
      `SELECT id, origen_dep, destino_dep, autor, afirmacion, evidencia, confianza,
              procedencia, derivado_de, profundidad, estado, vigente_hasta
         FROM os_insights
        WHERE workspace_id = $1 AND client_id = $2::uuid
          AND destino_dep = $3
          AND estado = 'nuevo'
          AND vigente_hasta > NOW()
          AND confianza >= $4
        ORDER BY confianza DESC, created_at DESC`,
      [params.workspaceId, params.clientId, params.departamento, params.confianzaMinima ?? 0],
    );

    return filas.map((f) => ({
      id: f.id,
      origenDep: f.origen_dep,
      destinoDep: f.destino_dep,
      autor: f.autor,
      afirmacion: f.afirmacion,
      evidencia: f.evidencia,
      confianza: Number(f.confianza),
      procedencia: f.procedencia,
      derivadoDe: f.derivado_de,
      profundidad: f.profundidad,
      estado: f.estado,
      vigenteHasta: new Date(f.vigente_hasta),
    }));
  }

  /**
   * Marca un insight como usado, y por quién.
   *
   * Sin esto no se puede saber si la inteligencia compartida sirve de algo, y
   * un sistema que no lo sabe acumula insights para siempre.
   */
  async consumir(params: {
    workspaceId: number;
    clientId: string;
    insightId: string;
    consumidoPor: string;
    accionId?: string | null;
  }): Promise<boolean> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `UPDATE os_insights
          SET estado = 'consumido', consumido_por = $4, consumido_en = NOW(),
              accion_id = $5::uuid, updated_at = NOW()
        WHERE workspace_id = $1 AND client_id = $2::uuid AND id = $3::uuid
          AND estado = 'nuevo'
      RETURNING id`,
      [params.workspaceId, params.clientId, params.insightId, params.consumidoPor, params.accionId ?? null],
    );
    return filas.length === 1;
  }

  /** Se descarta con motivo: «no me sirve» es información sobre quien lo emitió. */
  async descartar(params: {
    workspaceId: number;
    clientId: string;
    insightId: string;
    porQue: string;
  }): Promise<boolean> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `UPDATE os_insights
          SET estado = 'descartado', resultado = $4, updated_at = NOW()
        WHERE workspace_id = $1 AND client_id = $2::uuid AND id = $3::uuid
          AND estado = 'nuevo'
      RETURNING id`,
      [params.workspaceId, params.clientId, params.insightId, params.porQue.slice(0, 500)],
    );
    return filas.length === 1;
  }

  /** Cierra el círculo: qué pasó con lo que se hizo a partir del insight. */
  async registrarResultado(params: {
    workspaceId: number;
    insightId: string;
    resultado: string;
  }): Promise<void> {
    this.exigirAlcance(params.workspaceId);
    await this.db.query(
      `UPDATE os_insights SET resultado = $3, updated_at = NOW()
        WHERE workspace_id = $1 AND id = $2::uuid`,
      [params.workspaceId, params.insightId, params.resultado.slice(0, 1000)],
    );
  }

  /** Marca como caducados los que pasaron su fecha. Idempotente. */
  async caducar(workspaceId: number): Promise<number> {
    this.exigirAlcance(workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `UPDATE os_insights SET estado = 'caducado', updated_at = NOW()
        WHERE workspace_id = $1 AND estado = 'nuevo' AND vigente_hasta <= NOW()
      RETURNING id`,
      [workspaceId],
    );
    return filas.length;
  }

  /**
   * Cuánto se usa lo que se comparte. Es la métrica que dice si esto sirve:
   * un flujo con 200 insights y 0 consumidos no es inteligencia compartida, es
   * un vertedero.
   */
  async utilidad(
    workspaceId: number,
  ): Promise<Array<{ ruta: string; publicados: number; consumidos: number; descartados: number }>> {
    this.exigirAlcance(workspaceId);
    const filas = await this.db.query<{
      ruta: string; publicados: string; consumidos: string; descartados: string;
    }>(
      `SELECT origen_dep || ' → ' || destino_dep AS ruta,
              COUNT(*)::text AS publicados,
              COUNT(*) FILTER (WHERE estado = 'consumido')::text AS consumidos,
              COUNT(*) FILTER (WHERE estado = 'descartado')::text AS descartados
         FROM os_insights
        WHERE workspace_id = $1
        GROUP BY 1
        ORDER BY 2 DESC`,
      [workspaceId],
    );
    return filas.map((f) => ({
      ruta: f.ruta,
      publicados: Number(f.publicados),
      consumidos: Number(f.consumidos),
      descartados: Number(f.descartados),
    }));
  }
}
