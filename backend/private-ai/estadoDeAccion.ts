/**
 * BLOQUE 3 · el contrato de estados de una acción de agente.
 *
 * La regla, que es una sola:
 *
 *   **NELVYON no puede decir que hizo algo que solo propuso, simuló o preparó.**
 *
 * Antes de esto no había forma de decirlo. `runAgent` devolvía `output` con un
 * `mock: boolean` al lado, y esa era toda la distinción: un texto redactado por
 * un sustituto cuando no hay proveedor viajaba en el mismo campo, con la misma
 * forma, que un resultado real. Quien consumiera la respuesta sin mirar `mock`
 * —una pantalla, un informe, otro agente— leía una propuesta como un hecho.
 *
 * Los cinco estados, ordenados por lo que hace falta para llegar a ellos:
 *
 *   PROPOSED            hay una propuesta. No se ha tocado nada.
 *   SIMULATED           hay un resultado calculado sin acción real. Un borrador,
 *                       una previsión, un texto de un sustituto: sirve para
 *                       enseñar, no para afirmar.
 *   READY_FOR_APPROVAL  técnicamente listo y detenido a propósito, esperando a
 *                       una persona. No es un fallo: es el sistema respetando
 *                       una puerta.
 *   EXECUTED            hay CONSTANCIA de que la acción se ejecutó.
 *   VERIFIED            además hay constancia POSTERIOR de que el efecto que se
 *                       esperaba ocurrió de verdad.
 *
 * La diferencia entre EXECUTED y VERIFIED no es burocracia. «He publicado el
 * post» y «el post está publicado y lo he vuelto a leer» son afirmaciones
 * distintas, y confundirlas es exactamente como un producto acaba diciendo que
 * envió correos que nadie recibió.
 *
 * Ninguno de los cinco se alcanza por descuido: `EXECUTED` y `VERIFIED` exigen
 * una prueba —un identificador, una fila, una respuesta del tercero— y las
 * funciones de abajo se niegan a construirlos sin ella.
 */

export const ESTADOS_DE_ACCION = [
  "PROPOSED",
  "SIMULATED",
  "READY_FOR_APPROVAL",
  "EXECUTED",
  "VERIFIED",
] as const;

export type EstadoDeAccion = (typeof ESTADOS_DE_ACCION)[number];

/** Los estados en los que NO ha ocurrido nada en el mundo real. */
export const ESTADOS_SIN_EFECTO: readonly EstadoDeAccion[] = [
  "PROPOSED",
  "SIMULATED",
  "READY_FOR_APPROVAL",
] as const;

export type ResultadoDeAccion = {
  estado: EstadoDeAccion;
  /** Qué se hizo o se propuso hacer, en una línea. */
  resumen: string;
  /**
   * La CONSTANCIA. Obligatoria en `EXECUTED` y `VERIFIED`, prohibida en el
   * resto: si un estado sin efecto trajera evidencia, alguien la leería como
   * prueba de algo que no pasó.
   */
  evidencia?: {
    /** Qué demuestra la ejecución: un id de envío, una fila, un código HTTP… */
    referencia: string;
    /** Dónde vive esa referencia, para poder ir a mirarla. */
    origen: string;
    /** Solo en VERIFIED: la comprobación POSTERIOR del efecto. */
    comprobacionPosterior?: string;
  };
  /** Por qué se quedó donde se quedó. Obligatorio si no llegó a ejecutarse. */
  motivo?: string;
};

/** ¿Puede este estado presentarse como algo que NELVYON hizo? */
export function afirmaAccionRealizada(estado: EstadoDeAccion): boolean {
  return estado === "EXECUTED" || estado === "VERIFIED";
}

export function tuvoEfectoReal(estado: EstadoDeAccion): boolean {
  return afirmaAccionRealizada(estado);
}

function exigir(condicion: boolean, mensaje: string): void {
  if (!condicion) throw new Error(`contrato de estados: ${mensaje}`);
}

export function propuesta(resumen: string, motivo?: string): ResultadoDeAccion {
  return { estado: "PROPOSED", resumen, motivo };
}

export function simulada(resumen: string, motivo: string): ResultadoDeAccion {
  // El motivo es obligatorio: un resultado simulado sin decir POR QUE es
  // indistinguible de uno real para quien lo lee.
  exigir(Boolean(motivo?.trim()), "SIMULATED necesita decir por que no fue real");
  return { estado: "SIMULATED", resumen, motivo };
}

export function listaParaAprobar(resumen: string, motivo: string): ResultadoDeAccion {
  exigir(Boolean(motivo?.trim()), "READY_FOR_APPROVAL necesita decir que aprobacion espera");
  return { estado: "READY_FOR_APPROVAL", resumen, motivo };
}

export function ejecutada(
  resumen: string,
  evidencia: { referencia: string; origen: string },
): ResultadoDeAccion {
  // Aqui esta el nudo de todo el contrato. `EXECUTED` es la palabra con la que
  // NELVYON afirma haber actuado, asi que no se puede construir sin algo que
  // alguien pueda ir a mirar.
  exigir(Boolean(evidencia?.referencia?.trim()), "EXECUTED sin referencia de evidencia");
  exigir(Boolean(evidencia?.origen?.trim()), "EXECUTED sin origen de la evidencia");
  return { estado: "EXECUTED", resumen, evidencia };
}

export function verificada(
  resumen: string,
  evidencia: { referencia: string; origen: string; comprobacionPosterior: string },
): ResultadoDeAccion {
  exigir(Boolean(evidencia?.referencia?.trim()), "VERIFIED sin referencia de evidencia");
  exigir(Boolean(evidencia?.origen?.trim()), "VERIFIED sin origen de la evidencia");
  exigir(
    Boolean(evidencia?.comprobacionPosterior?.trim()),
    "VERIFIED sin comprobacion posterior: eso es EXECUTED, no VERIFIED",
  );
  return { estado: "VERIFIED", resumen, evidencia };
}

/**
 * Guardián de salida. Se llama justo antes de entregar un resultado a quien sea
 * —una pantalla, un informe, otro agente— y se niega a dejar pasar una forma
 * incoherente.
 *
 * Existe porque el objeto se puede construir a mano saltándose las funciones de
 * arriba, y en cuanto eso sea posible alguien lo hará.
 */
export function validarResultado(r: ResultadoDeAccion): ResultadoDeAccion {
  exigir(
    (ESTADOS_DE_ACCION as readonly string[]).includes(r.estado),
    `estado desconocido: ${String(r.estado)}`,
  );
  exigir(Boolean(r.resumen?.trim()), "un resultado sin resumen no dice nada");

  if (afirmaAccionRealizada(r.estado)) {
    exigir(
      Boolean(r.evidencia?.referencia?.trim() && r.evidencia?.origen?.trim()),
      `${r.estado} sin evidencia: no se puede afirmar una accion sin constancia`,
    );
    if (r.estado === "VERIFIED") {
      exigir(
        Boolean(r.evidencia?.comprobacionPosterior?.trim()),
        "VERIFIED sin comprobacion posterior",
      );
    }
  } else {
    // La otra direccion importa igual: evidencia colgando de un estado sin
    // efecto se lee como prueba de algo que no ocurrio.
    exigir(
      !r.evidencia,
      `${r.estado} no puede llevar evidencia: no ha ocurrido nada que evidenciar`,
    );
    exigir(Boolean(r.motivo?.trim()), `${r.estado} necesita decir por que se quedo ahi`);
  }
  return r;
}

/** Texto para una persona. Nunca dice "hecho" si no lo está. */
export function comoTextoHonesto(r: ResultadoDeAccion): string {
  switch (r.estado) {
    case "PROPOSED":
      return `Propuesta (no ejecutada): ${r.resumen}`;
    case "SIMULATED":
      return `Simulación, sin efecto real: ${r.resumen}${r.motivo ? ` — ${r.motivo}` : ""}`;
    case "READY_FOR_APPROVAL":
      return `Preparado, pendiente de aprobación: ${r.resumen}${r.motivo ? ` — ${r.motivo}` : ""}`;
    case "EXECUTED":
      return `Ejecutado: ${r.resumen} (${r.evidencia?.origen}: ${r.evidencia?.referencia})`;
    case "VERIFIED":
      return `Ejecutado y verificado: ${r.resumen} (${r.evidencia?.origen}: ${r.evidencia?.referencia}; comprobado: ${r.evidencia?.comprobacionPosterior})`;
  }
}
