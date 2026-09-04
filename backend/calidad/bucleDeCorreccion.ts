/**
 * Cuando calidad suspende, se intenta arreglarlo antes de molestar a nadie.
 *
 * ── POR QUÉ ─────────────────────────────────────────────────────────────────
 *
 * Hasta ahora una pieza que suspendía iba directa a la bandeja de aprobación.
 * Eso está bien para lo que no tiene arreglo automático —una afirmación
 * inventada, una mezcla de clientes— pero es un desperdicio para lo que sí:
 * «se pidió en «es» y está escrita en «en»» no necesita una persona, necesita
 * rehacerla en español.
 *
 * Una bandeja llena de cosas que el sistema podría haber arreglado solo se
 * acaba mirando por encima, y entonces también se pasan por alto las que sí
 * necesitaban un ojo humano.
 *
 * ── LA PARTE QUE HACE QUE FUNCIONE ──────────────────────────────────────────
 *
 * El diagnóstico. Reintentar con la misma instrucción produce lo mismo: si el
 * modelo escribió en inglés fue porque nada le dijo que no. Lo que se le manda
 * en el segundo intento no es «hazlo mejor», es la lista concreta de lo que
 * falló, con las palabras del propio motor de calidad.
 *
 * `«no cumple los criterios»` no permite arreglar nada.
 * `«dice desde 1985 y el año que consta es 2019»` sí.
 *
 * ── LÍMITES, Y POR QUÉ CADA UNO ─────────────────────────────────────────────
 *
 * · UN solo reintento. Dos ya es un patrón: si la corrección dirigida no lo
 *   arregla, el problema no está en la redacción y una tercera pasada sólo
 *   gasta. Escala.
 * · CADA reintento pasa por la puerta de gasto. Producir otra vez cuesta una
 *   llamada al modelo, y una capacidad que se activa sola y multiplica la
 *   factura es exactamente lo que no puede pasar aquí.
 * · SE PARA SI NO MEJORA. Si el segundo intento suspende por lo mismo, escala
 *   igual: repetir el ciclo esperando otro resultado es la definición de un
 *   bucle que no termina.
 * · TODO QUEDA REGISTRADO. Cuántos intentos, qué falló en cada uno y con qué
 *   se corrigió. Un ciclo que arregla en silencio impide saber qué produce mal
 *   el sistema — y eso es justo lo que hay que aprender.
 */

/** Lo que calidad dice de una pieza. */
export type VeredictoDeCalidad = {
  aprobada: boolean;
  /** Motivo legible, para escalar y para registrar. */
  motivo: string;
  /** Los hallazgos concretos. Es lo que hace posible corregir. */
  hallazgos: ReadonlyArray<{ id: string; quePasa: string }>;
};

export type IntentoDelBucle = {
  intento: number;
  aprobada: boolean;
  motivo: string;
  /** La instrucción de corrección que se mandó ANTES de este intento. */
  correccionPedida: string | null;
};

export type ResultadoDelBucle<T> = {
  resultado: T;
  /** `true` si acabó aprobada; `false` si hay que escalar. */
  aprobada: boolean;
  /** Por qué se escala, cuando se escala. */
  motivo: string;
  intentos: number;
  historial: IntentoDelBucle[];
  /** Por qué no se reintentó, si no se reintentó. */
  porQueNoSeReintento: string | null;
};

/**
 * Convierte los hallazgos de calidad en algo que un agente pueda arreglar.
 *
 * Se le dan las palabras del motor tal cual. Reformularlas perdería el detalle
 * que las hace accionables, y ese detalle es lo único que distingue esto de un
 * «inténtalo otra vez».
 */
export function pedirCorreccion(v: VeredictoDeCalidad): string {
  const lista = v.hallazgos.filter((h) => h.quePasa.trim().length > 0);
  if (lista.length === 0) {
    // Sin hallazgos concretos no hay corrección que pedir: decir «mejóralo»
    // produce otra pieza distinta, no la misma arreglada.
    return "";
  }
  return (
    "La revisión de calidad ha rechazado la versión anterior. Corrige EXACTAMENTE "
    + "esto y no cambies nada más:\n"
    + lista.map((h) => `- ${h.quePasa}`).join("\n")
    + "\n\nDevuelve la pieza completa ya corregida, no un comentario sobre los cambios."
  );
}

export type OpcionesDelBucle<T> = {
  /** Produce la pieza. Recibe la corrección pedida, si es un reintento. */
  producir: (correccion: string | null) => Promise<T>;
  /** La juzga. */
  revisar: (resultado: T) => Promise<VeredictoDeCalidad>;
  /**
   * ¿Se puede pagar otro intento? Se pregunta ANTES de producir.
   *
   * Es una función y no un booleano porque la respuesta depende del momento:
   * el presupuesto del día puede agotarse entre el primer intento y el segundo.
   */
  sePuedeReintentar: () => Promise<{ si: boolean; porQue: string }>;
  /** Cuántas veces se produce en total. Uno = sin corrección. */
  maxIntentos?: number;
};

/**
 * Produce, revisa y —si hace falta y se puede— corrige una vez.
 *
 * Devuelve SIEMPRE la última pieza producida, aprobada o no. Perder el trabajo
 * de un intento fallido obligaría a rehacerlo para poder mirarlo, y quien lo
 * mira necesita ver justamente lo que falló.
 */
export async function conCorreccion<T>(
  opciones: OpcionesDelBucle<T>,
): Promise<ResultadoDelBucle<T>> {
  const maxIntentos = Math.max(1, Math.min(opciones.maxIntentos ?? 2, 3));
  const historial: IntentoDelBucle[] = [];

  let correccion: string | null = null;
  let resultado = await opciones.producir(null);
  let veredicto = await opciones.revisar(resultado);
  historial.push({
    intento: 1,
    aprobada: veredicto.aprobada,
    motivo: veredicto.motivo,
    correccionPedida: null,
  });

  let porQueNoSeReintento: string | null = null;

  for (let intento = 2; intento <= maxIntentos && !veredicto.aprobada; intento += 1) {
    correccion = pedirCorreccion(veredicto);
    if (!correccion) {
      // Sin hallazgos concretos, un reintento es una tirada de dados que además
      // se paga.
      porQueNoSeReintento = "el veredicto no trae hallazgos concretos que corregir";
      break;
    }

    const permiso = await opciones.sePuedeReintentar();
    if (!permiso.si) {
      porQueNoSeReintento = permiso.porQue;
      break;
    }

    const anterior = veredicto;
    resultado = await opciones.producir(correccion);
    veredicto = await opciones.revisar(resultado);
    historial.push({
      intento,
      aprobada: veredicto.aprobada,
      motivo: veredicto.motivo,
      correccionPedida: correccion,
    });

    if (!veredicto.aprobada && mismoFallo(anterior, veredicto)) {
      // Falla por lo mismo. Insistir es la definición de un bucle que no
      // termina, y cada vuelta cuesta dinero.
      porQueNoSeReintento = "el segundo intento falla por lo mismo que el primero";
      break;
    }
  }

  return {
    resultado,
    aprobada: veredicto.aprobada,
    motivo: veredicto.motivo,
    intentos: historial.length,
    historial,
    porQueNoSeReintento,
  };
}

/** ¿Los dos veredictos suspenden por las mismas comprobaciones? */
function mismoFallo(a: VeredictoDeCalidad, b: VeredictoDeCalidad): boolean {
  const ids = (v: VeredictoDeCalidad) => v.hallazgos.map((h) => h.id).sort().join("|");
  return ids(a) === ids(b) && ids(a).length > 0;
}
