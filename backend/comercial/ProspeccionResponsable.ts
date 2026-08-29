/**
 * LA MÁQUINA COMERCIAL DE NELVYON.
 *
 * QUÉ ES ESTO Y QUÉ NO ES. NELVYON es una agencia: un cliente la descubre,
 * habla con ella, explica qué necesita y NELVYON hace el trabajo. Para que ese
 * ciclo empiece, alguien tiene que llegar hasta el cliente. Eso es lo que hay
 * aquí.
 *
 * Lo que NO hay aquí, y no por descuido:
 *
 *     NO SE ENVÍA NADA. Ni un correo, ni un mensaje, ni una llamada. Este
 *     módulo PREPARA. Enviar es otra decisión, con autorización explícita, y
 *     hoy no la tiene.
 *
 * LA LÍNEA ENTRE PROSPECCIÓN Y SPAM, que es fina y hay que escribirla:
 *
 *   spam           el mismo mensaje a mucha gente, sin motivo para escribir a
 *                  ninguna en concreto y sin forma fácil de que pare.
 *   prospección    un mensaje a UNA empresa, por UN motivo que se puede
 *                  enseñar, con base legal declarada y baja inmediata.
 *
 * La diferencia no es el volumen: es si cada mensaje tiene una razón propia.
 * Por eso aquí una preparación sin `porQueEstaEmpresa` no se puede crear —no es
 * una validación que se pueda saltar, es que el estado no existe sin ese campo.
 *
 * LAS CUATRO PUERTAS, y ninguna es opcional:
 *
 *   1. ¿HAY BASE LEGAL?         interés legítimo o consentimiento, declarado y
 *                               con fecha. Sin base legal no se prepara nada.
 *   2. ¿SE HA DADO DE BAJA?     una baja es para siempre y vale para todos los
 *                               canales, no sólo para el que la pidió.
 *   3. ¿YA SE LE ESCRIBIÓ?      insistir a quien no contestó no es persistencia
 *                               comercial: es acoso con hoja de cálculo.
 *   4. ¿HAY MOTIVO PROPIO?      algo observado de ESA empresa. No «vi tu web».
 *
 * TRAZABILIDAD. Cada preparación guarda de dónde salió cada afirmación. Si
 * mañana alguien pregunta «¿por qué me escribís?», la respuesta tiene que poder
 * enseñarse, no reconstruirse.
 */

export type BaseLegal = "interes_legitimo" | "consentimiento" | "relacion_previa";

export type EstadoDePreparacion =
  | "investigando"
  | "lista_para_revision"
  /** Una persona la ha aprobado. Sigue SIN enviarse. */
  | "aprobada_para_enviar"
  | "descartada";

export interface Observacion {
  /** Qué se ha visto. Un hecho, no una impresión. */
  hecho: string;
  /** Dónde se ha visto. Sin fuente, no entra. */
  fuente: string;
  /** Cuándo se vio. Un hecho de hace un año no justifica escribir hoy. */
  vistoEn: string;
}

export interface Prospecto {
  empresa: string;
  /** El dominio identifica; el nombre puede repetirse. */
  dominio: string;
  sector?: string;
  /** Qué se ha observado. Vacío = no hay motivo para escribir. */
  observaciones: readonly Observacion[];
}

export interface Preparacion {
  id: string;
  prospecto: Prospecto;
  baseLegal: BaseLegal;
  /** Cuándo se estableció la base legal. Una base legal sin fecha no se sostiene. */
  baseLegalDesde: string;
  /**
   * POR QUÉ ESTA EMPRESA Y NO OTRA. Es lo que separa un mensaje de un envío
   * masivo, y por eso el tipo lo exige: sin él no hay preparación que crear.
   */
  porQueEstaEmpresa: string;
  /** En qué observaciones se apoya. Cada afirmación, con su fuente. */
  seApoyaEn: readonly Observacion[];
  estado: EstadoDePreparacion;
  /** El borrador. Nunca se envía desde aquí. */
  borrador: { asunto: string; cuerpo: string } | null;
  creadaEn: string;
}

export class ErrorDeProspeccion extends Error {
  constructor(
    readonly codigo:
      | "SIN_BASE_LEGAL"
      | "DADO_DE_BAJA"
      | "YA_CONTACTADO"
      | "SIN_MOTIVO_PROPIO"
      | "SIN_BAJA_EN_EL_MENSAJE"
      | "ENVIO_NO_AUTORIZADO",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeProspeccion";
  }
}

export interface AlmacenDeProspeccion {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Cuánto tiene que pasar para volver a escribir a quien no contestó.
 *
 * Noventa días. No es un número redondo por gusto: es lo bastante largo como
 * para que un segundo mensaje no sea insistencia, y lo bastante corto como para
 * que una empresa cuya situación ha cambiado pueda oír de nosotros otra vez.
 */
export const DIAS_ENTRE_INTENTOS = 90;

/** Cuántas veces, como mucho, en total. Después, silencio. */
export const INTENTOS_MAXIMOS = 2;

export class ProspeccionResponsable {
  constructor(private readonly db: AlmacenDeProspeccion) {}

  /**
   * Prepara un contacto. NO lo envía.
   *
   * Lanza en cuanto una puerta dice que no, y el código del error dice cuál:
   * una preparación a medias que «casi» cumple es exactamente lo que acaba
   * enviándose un viernes por la tarde.
   */
  async preparar(entrada: {
    prospecto: Prospecto;
    baseLegal: BaseLegal;
    baseLegalDesde: string;
    porQueEstaEmpresa: string;
    workspaceId: number;
  }): Promise<Preparacion> {
    const dominio = entrada.prospecto.dominio?.trim().toLowerCase();
    if (!dominio) {
      throw new ErrorDeProspeccion("SIN_MOTIVO_PROPIO", "un prospecto sin dominio no se puede identificar");
    }

    // ── 1 · base legal ──────────────────────────────────────────────────────
    if (!entrada.baseLegal || !entrada.baseLegalDesde) {
      throw new ErrorDeProspeccion(
        "SIN_BASE_LEGAL",
        `no hay base legal declarada para escribir a ${dominio}`,
      );
    }

    // ── 2 · ¿se ha dado de baja? ────────────────────────────────────────────
    //
    // La consulta NO filtra por canal a propósito. Quien pide no recibir más
    // correos no está pidiendo que le llamemos por teléfono: está pidiendo que
    // le dejemos en paz. Tratar cada canal por separado es el truco con el que
    // se convierte una baja en un permiso parcial.
    const bajas = await this.db.query<{ dominio: string }>(
      `SELECT dominio FROM comercial_bajas WHERE lower(dominio) = $1 LIMIT 1`,
      [dominio],
    );
    if (bajas.length > 0) {
      throw new ErrorDeProspeccion("DADO_DE_BAJA", `${dominio} pidió no recibir más comunicaciones`);
    }

    // ── 3 · ¿ya se le escribió? ─────────────────────────────────────────────
    const previos = await this.db.query<{ n: string; ultimo: string }>(
      `SELECT count(*) AS n, max(creada_en)::text AS ultimo
         FROM comercial_preparaciones
        WHERE lower(dominio) = $1 AND estado <> 'descartada'`,
      [dominio],
    );
    const n = Number(previos[0]?.n ?? 0);
    if (n >= INTENTOS_MAXIMOS) {
      throw new ErrorDeProspeccion(
        "YA_CONTACTADO",
        `ya se preparó contacto con ${dominio} ${n} veces; después de ${INTENTOS_MAXIMOS}, silencio`,
      );
    }
    if (n > 0 && previos[0]?.ultimo) {
      const dias = (Date.now() - new Date(previos[0].ultimo).getTime()) / 86_400_000;
      if (dias < DIAS_ENTRE_INTENTOS) {
        throw new ErrorDeProspeccion(
          "YA_CONTACTADO",
          `se contactó con ${dominio} hace ${Math.floor(dias)} días; hay que esperar ${DIAS_ENTRE_INTENTOS}`,
        );
      }
    }

    // ── 4 · ¿hay un motivo propio de ESTA empresa? ──────────────────────────
    const motivo = entrada.porQueEstaEmpresa?.trim();
    const observaciones = entrada.prospecto.observaciones ?? [];

    if (!motivo || motivo.length < 20) {
      throw new ErrorDeProspeccion(
        "SIN_MOTIVO_PROPIO",
        "el motivo para escribir a esta empresa no dice nada concreto de ella",
      );
    }
    if (observaciones.length === 0) {
      throw new ErrorDeProspeccion(
        "SIN_MOTIVO_PROPIO",
        `no hay ni una observación sobre ${dominio}: el motivo no se apoya en nada`,
      );
    }
    const sinFuente = observaciones.filter((o) => !o.fuente?.trim());
    if (sinFuente.length > 0) {
      throw new ErrorDeProspeccion(
        "SIN_MOTIVO_PROPIO",
        `${sinFuente.length} observación(es) sin fuente: una afirmación que no se puede enseñar no vale`,
      );
    }

    // Un motivo que serviría para cualquiera no es un motivo.
    if (esGenerico(motivo)) {
      throw new ErrorDeProspeccion(
        "SIN_MOTIVO_PROPIO",
        `«${motivo}» vale para cualquier empresa: eso es un envío masivo con otro nombre`,
      );
    }

    return {
      id: `prep_${dominio}_${Date.now().toString(36)}`,
      prospecto: { ...entrada.prospecto, dominio },
      baseLegal: entrada.baseLegal,
      baseLegalDesde: entrada.baseLegalDesde,
      porQueEstaEmpresa: motivo,
      seApoyaEn: observaciones,
      estado: "investigando",
      borrador: null,
      creadaEn: new Date().toISOString(),
    };
  }

  /**
   * Le pone borrador a una preparación.
   *
   * El borrador tiene que llevar la baja dentro. No en una plantilla que
   * alguien pueda quitar: en el texto, comprobado aquí.
   */
  redactar(p: Preparacion, borrador: { asunto: string; cuerpo: string }): Preparacion {
    if (!/\b(baja|dar de baja|no volver a|responde\s+STOP)\b/i.test(borrador.cuerpo)) {
      throw new ErrorDeProspeccion(
        "SIN_BAJA_EN_EL_MENSAJE",
        "el borrador no dice cómo dejar de recibir mensajes",
      );
    }
    return { ...p, borrador, estado: "lista_para_revision" };
  }

  /**
   * Enviar.
   *
   * No hace nada. Y no es un hueco pendiente de rellenar: es la puerta cerrada.
   * Enviar comunicaciones comerciales reales exige una autorización que hoy no
   * existe, y dejar aquí una implementación «por si acaso» es cómo un viernes
   * alguien la llama sin querer.
   */
  async enviar(_p: Preparacion): Promise<never> {
    throw new ErrorDeProspeccion(
      "ENVIO_NO_AUTORIZADO",
      "el envío real de comunicaciones comerciales no está autorizado. " +
      "Este módulo prepara y deja rastro; enviar es otra decisión, de una persona.",
    );
  }
}

/**
 * ¿Este motivo valdría para cualquier empresa?
 *
 * Es la comprobación más útil del fichero y la más fácil de escribir mal. No
 * intenta juzgar la calidad de la prosa: busca las fórmulas concretas con las
 * que se disfraza un envío masivo de mensaje personal.
 */
export function esGenerico(motivo: string): boolean {
  const m = motivo.toLowerCase();
  const formulas = [
    /^he visto (tu|vuestra) (web|página|pagina|empresa)\.?$/,
    /me ha (encantado|gustado) (tu|vuestra) (web|marca|empresa)/,
    /creo que podríamos ayudaros?/,
    /trabajamos con empresas como la (tuya|vuestra)/,
    /vi que est[aá]is? en el sector/,
    /somos (una )?agencia de marketing/,
  ];
  return formulas.some((f) => f.test(m.trim()));
}
