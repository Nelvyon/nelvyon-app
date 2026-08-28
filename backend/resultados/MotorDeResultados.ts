/**
 * EL MOTOR DE RESULTADOS.
 *
 * NELVYON ha entregado 5.050 entregables y no sabe de ninguno si sirvió de
 * algo. Optimizar «cantidad de entregables» es fácil y no es el negocio; el
 * negocio es que al cliente le vaya mejor.
 *
 * Este módulo cierra el círculo:
 *
 *     objetivo → línea base → acción → medición → resultado → aprendizaje
 *
 * TRES REGLAS, y las tres existen porque romperlas es cómo se acaba con un
 * informe bonito que no significa nada.
 *
 * 1. SIN LÍNEA BASE NO HAY RESULTADO. Un número posterior sin uno anterior es
 *    una cifra suelta. Se devuelve `desconocido`, no cero, no «bien».
 *
 * 2. LA DIRECCIÓN IMPORTA. Bajar el coste por lead es un éxito; bajar los leads
 *    es un desastre. El mismo -20 % significa lo contrario según la métrica, y
 *    un motor que no lo sepa presentará desastres como logros.
 *
 * 3. COINCIDIR EN EL TIEMPO NO ES CAUSAR. La atribución es un juicio con método
 *    declarado, y `coincidencia_temporal` es su nivel más débil precisamente
 *    para poder distinguirlo de los demás. La mayoría de los informes de
 *    agencia presentan ese nivel como si fuera causa.
 */

export type Direccion = "subir" | "bajar";

export type FuenteDeMedicion =
  | "google_analytics"
  | "search_console"
  | "google_ads"
  | "meta_ads"
  | "crm_propio"
  | "declarado_por_el_cliente"
  | "calculado";

export type ConfianzaDeAtribucion =
  | "desconocida"
  | "coincidencia_temporal"
  | "correlacion"
  | "experimento";

export interface Objetivo {
  id: string;
  metrica: string;
  direccion: Direccion;
  valorObjetivo: number | null;
  unidad: string | null;
  plazo: Date | null;
  estado: string;
}

export interface Medicion {
  id: string;
  metrica: string;
  valor: number;
  desde: Date;
  hasta: Date;
  fuente: FuenteDeMedicion;
  esLineaBase: boolean;
}

/**
 * El veredicto sobre un objetivo. `desconocido` es un resultado legítimo y
 * frecuente, y tiene que poder decirse: un motor que siempre da un veredicto
 * acaba inventándolo.
 */
export type Veredicto =
  | {
      estado: "desconocido";
      motivo: "sin_linea_base" | "sin_medicion_posterior" | "sin_objetivo";
      explicacion: string;
    }
  | {
      estado: "medido";
      lineaBase: number;
      actual: number;
      /** Positivo = mejor, negativo = peor. YA interpretado según la dirección. */
      mejoraPorcentual: number;
      /** `null` si el objetivo no tiene valor diana. */
      progresoHaciaObjetivo: number | null;
      cumplido: boolean;
      /** Cuántas acciones hubo entre la línea base y la medición actual. */
      accionesEnMedio: number;
      /** Lo más fuerte que se puede afirmar con lo que hay. */
      atribucionMaxima: ConfianzaDeAtribucion;
    };

export interface AlmacenDeResultados {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export class ErrorDeResultados extends Error {
  constructor(
    readonly codigo: "SIN_ALCANCE" | "OBJETIVO_DESCONOCIDO" | "LINEA_BASE_DUPLICADA",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeResultados";
  }
}

/**
 * Cuánto ha mejorado, interpretado según la dirección.
 *
 * Devuelve `null` si la línea base es cero: dividir entre cero no es infinito,
 * es «no se puede expresar como porcentaje». Presentar «+∞ %» o «+100 %»
 * cuando se pasa de 0 a 5 leads es exactamente el tipo de cifra que hace que un
 * informe deje de creerse.
 */
export function mejoraPorcentual(
  lineaBase: number,
  actual: number,
  direccion: Direccion,
): number | null {
  if (lineaBase === 0) return null;
  const cambio = ((actual - lineaBase) / Math.abs(lineaBase)) * 100;
  return direccion === "subir" ? cambio : -cambio;
}

/**
 * Lo más fuerte que se puede afirmar sobre la causa, con lo que hay.
 *
 * Deliberadamente conservador. Una acción y una mejora que coinciden en el
 * tiempo son dos cosas que coinciden en el tiempo, y llamarlo «correlación» ya
 * es decir más de lo que se sabe.
 */
export function atribucionMaxima(params: {
  acciones: number;
  huboExperimento: boolean;
  periodosMedidos: number;
}): ConfianzaDeAtribucion {
  if (params.huboExperimento) return "experimento";
  if (params.acciones === 0) return "desconocida";
  // Con un solo periodo medido después de la acción, lo único que se sabe es
  // que pasó después. Hacen falta varios para hablar de correlación.
  if (params.periodosMedidos >= 3) return "correlacion";
  return "coincidencia_temporal";
}

export class MotorDeResultados {
  constructor(private readonly db: AlmacenDeResultados) {}

  private exigirAlcance(workspaceId: number): void {
    if (!Number.isInteger(workspaceId)) {
      throw new ErrorDeResultados("SIN_ALCANCE", "los resultados no se leen sin workspace");
    }
  }

  async declararObjetivo(params: {
    workspaceId: number;
    clientId: string;
    metrica: string;
    direccion: Direccion;
    valorObjetivo?: number | null;
    unidad?: string | null;
    plazo?: Date | null;
  }): Promise<{ id: string }> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_objetivos
         (workspace_id, client_id, metrica, direccion, valor_objetivo, unidad, plazo)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::timestamptz)
       ON CONFLICT (workspace_id, client_id, metrica) DO UPDATE
         SET direccion = EXCLUDED.direccion,
             valor_objetivo = EXCLUDED.valor_objetivo,
             unidad = EXCLUDED.unidad,
             plazo = EXCLUDED.plazo,
             updated_at = NOW()
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.metrica,
        params.direccion,
        params.valorObjetivo ?? null,
        params.unidad ?? null,
        params.plazo?.toISOString() ?? null,
      ],
    );
    return { id: filas[0].id };
  }

  /**
   * Registra una medición. La línea base es una medición como las demás salvo
   * por su bandera; el índice único del esquema impide que haya dos.
   */
  async medir(params: {
    workspaceId: number;
    clientId: string;
    objetivoId: string;
    metrica: string;
    valor: number;
    desde: Date;
    hasta: Date;
    fuente: FuenteDeMedicion;
    esLineaBase?: boolean;
    derivadaDe?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_mediciones
         (workspace_id, client_id, objetivo_id, metrica, valor, desde, hasta,
          fuente, es_linea_base, derivada_de)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::timestamptz, $7::timestamptz,
               $8, $9, $10::jsonb)
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.objetivoId,
        params.metrica,
        params.valor,
        params.desde.toISOString(),
        params.hasta.toISOString(),
        params.fuente,
        params.esLineaBase ?? false,
        params.derivadaDe ? JSON.stringify(params.derivadaDe) : null,
      ],
    );
    return { id: filas[0].id };
  }

  async registrarAccion(params: {
    workspaceId: number;
    clientId: string;
    objetivoId?: string | null;
    descripcion: string;
    actor: string;
    serviceId?: string | null;
    efectivaDesde: Date;
  }): Promise<{ id: string }> {
    this.exigirAlcance(params.workspaceId);
    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_acciones
         (workspace_id, client_id, objetivo_id, descripcion, actor, service_id, efectiva_desde)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::timestamptz)
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.objetivoId ?? null,
        params.descripcion,
        params.actor,
        params.serviceId ?? null,
        params.efectivaDesde.toISOString(),
      ],
    );
    return { id: filas[0].id };
  }

  /**
   * EL VEREDICTO. Es la función que decide si NELVYON está sirviendo de algo.
   *
   * Devuelve `desconocido` siempre que no pueda demostrar lo contrario. Un
   * motor que siempre da un veredicto acaba inventándolo, y un informe con
   * cifras inventadas es peor que uno que dice «todavía no se puede saber».
   */
  async veredicto(
    workspaceId: number,
    clientId: string,
    objetivoId: string,
  ): Promise<Veredicto> {
    this.exigirAlcance(workspaceId);

    const objetivos = await this.db.query<{
      id: string; metrica: string; direccion: Direccion;
      valor_objetivo: string | null; estado: string;
    }>(
      `SELECT id, metrica, direccion, valor_objetivo, estado
         FROM os_objetivos
        WHERE workspace_id = $1 AND client_id = $2::uuid AND id = $3::uuid`,
      [workspaceId, clientId, objetivoId],
    );
    if (objetivos.length === 0) {
      return {
        estado: "desconocido",
        motivo: "sin_objetivo",
        explicacion: "no hay ningún objetivo con ese identificador para este cliente",
      };
    }
    const o = objetivos[0];

    const mediciones = await this.db.query<{
      id: string; valor: string; hasta: string; es_linea_base: boolean;
    }>(
      `SELECT id, valor, hasta, es_linea_base
         FROM os_mediciones
        WHERE workspace_id = $1 AND objetivo_id = $2::uuid
        ORDER BY hasta ASC`,
      [workspaceId, objetivoId],
    );

    const base = mediciones.find((m) => m.es_linea_base);
    if (!base) {
      return {
        estado: "desconocido",
        motivo: "sin_linea_base",
        explicacion:
          `no hay línea base de "${o.metrica}": sin saber cuánto valía antes, ` +
          `cualquier número posterior es una cifra suelta, no un resultado`,
      };
    }

    const posteriores = mediciones.filter(
      (m) => !m.es_linea_base && new Date(m.hasta) > new Date(base.hasta),
    );
    if (posteriores.length === 0) {
      return {
        estado: "desconocido",
        motivo: "sin_medicion_posterior",
        explicacion: `hay línea base de "${o.metrica}" pero nada medido después`,
      };
    }

    const actual = posteriores[posteriores.length - 1];
    const lineaBase = Number(base.valor);
    const valorActual = Number(actual.valor);

    const acciones = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM os_acciones
        WHERE workspace_id = $1 AND objetivo_id = $2::uuid
          AND efectiva_desde > $3::timestamptz
          AND efectiva_desde <= $4::timestamptz`,
      [workspaceId, objetivoId, base.hasta, actual.hasta],
    );
    const nAcciones = Number(acciones[0]?.n ?? 0);

    const mejora = mejoraPorcentual(lineaBase, valorActual, o.direccion);
    const diana = o.valor_objetivo === null ? null : Number(o.valor_objetivo);

    return {
      estado: "medido",
      lineaBase,
      actual: valorActual,
      // Cuando la línea base es cero no se puede expresar como porcentaje; se
      // devuelve 0 y el consumidor tiene el par de valores para explicarlo.
      mejoraPorcentual: mejora ?? 0,
      progresoHaciaObjetivo:
        diana === null || diana === lineaBase
          ? null
          : ((valorActual - lineaBase) / (diana - lineaBase)) * 100,
      cumplido:
        diana !== null &&
        (o.direccion === "subir" ? valorActual >= diana : valorActual <= diana),
      accionesEnMedio: nAcciones,
      atribucionMaxima: atribucionMaxima({
        acciones: nAcciones,
        huboExperimento: false,
        periodosMedidos: posteriores.length,
      }),
    };
  }

  /**
   * Guarda un aprendizaje. Exige método: una conclusión sin método declarado no
   * se puede revisar, y una conclusión que no se puede revisar es una opinión
   * con formato de dato.
   */
  async aprender(params: {
    workspaceId: number;
    clientId: string;
    objetivoId: string;
    conclusion: string;
    acciones: string[];
    mediciones: string[];
    confianza: ConfianzaDeAtribucion;
    metodo: string;
  }): Promise<{ id: string }> {
    this.exigirAlcance(params.workspaceId);
    if (!params.metodo.trim()) {
      throw new ErrorDeResultados(
        "OBJETIVO_DESCONOCIDO",
        "un aprendizaje sin método declarado no se puede revisar",
      );
    }
    const filas = await this.db.query<{ id: string }>(
      `INSERT INTO os_aprendizajes
         (workspace_id, client_id, objetivo_id, conclusion, acciones, mediciones,
          confianza_atribucion, metodo)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5::uuid[], $6::uuid[], $7, $8)
       RETURNING id`,
      [
        params.workspaceId,
        params.clientId,
        params.objetivoId,
        params.conclusion,
        params.acciones,
        params.mediciones,
        params.confianza,
        params.metodo,
      ],
    );
    return { id: filas[0].id };
  }

  /**
   * Todos los objetivos de un cliente con su veredicto. Es lo que alimenta el
   * informe del portal y la señal de «resultados a la baja».
   */
  async panel(
    workspaceId: number,
    clientId: string,
  ): Promise<Array<{ objetivo: Objetivo; veredicto: Veredicto }>> {
    this.exigirAlcance(workspaceId);
    const filas = await this.db.query<{
      id: string; metrica: string; direccion: Direccion;
      valor_objetivo: string | null; unidad: string | null;
      plazo: string | null; estado: string;
    }>(
      `SELECT id, metrica, direccion, valor_objetivo, unidad, plazo, estado
         FROM os_objetivos
        WHERE workspace_id = $1 AND client_id = $2::uuid AND estado = 'activo'
        ORDER BY created_at ASC`,
      [workspaceId, clientId],
    );

    const salida: Array<{ objetivo: Objetivo; veredicto: Veredicto }> = [];
    for (const f of filas) {
      salida.push({
        objetivo: {
          id: f.id,
          metrica: f.metrica,
          direccion: f.direccion,
          valorObjetivo: f.valor_objetivo === null ? null : Number(f.valor_objetivo),
          unidad: f.unidad,
          plazo: f.plazo ? new Date(f.plazo) : null,
          estado: f.estado,
        },
        veredicto: await this.veredicto(workspaceId, clientId, f.id),
      });
    }
    return salida;
  }
}
