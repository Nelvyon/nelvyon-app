/**
 * Una migración que NO debe aplicarse sola, aunque esté pendiente.
 *
 * ── LA INCIDENCIA QUE LO ORIGINA ────────────────────────────────────────────
 *
 * La 598 se ejecutó en producción contra una instrucción expresa de no
 * ejecutarla. No hubo mala suerte ni una condición de carrera: el migrador
 * aplica TODO lo pendiente, y la 598 estaba pendiente. Yo había escrito en su
 * cabecera «espera al cutover», como si un comentario pudiera detener a un
 * migrador.
 *
 * Ese es el fallo que esto cierra, y conviene nombrarlo bien: **un comentario no
 * es una puerta**. Una intención que sólo vive en la prosa de un fichero no
 * protege nada — la ejecuta la primera máquina que pase por ahí.
 *
 * ── POR QUÉ NO BASTABA LA PUERTA QUE YA HABÍA ───────────────────────────────
 *
 * `evaluateProdMigrateGate` es una puerta GLOBAL: decide si se aplica *todo* lo
 * pendiente o *nada*. Sirve para «no migres producción sin permiso» y no sirve
 * para «esta de aquí, no». En cuanto la ventana se abre para una migración, se
 * abre para todas las que compartan el push.
 *
 * ── CÓMO SE MARCA ──────────────────────────────────────────────────────────
 *
 * Con una línea dentro del propio `.sql`:
 *
 *     -- NELVYON:MIGRACION_MANUAL
 *
 * Va en el fichero y no en una lista aparte a propósito: una lista externa se
 * queda desactualizada, y el día que alguien renombre la migración la lista
 * apunta a un fichero que ya no existe mientras el fichero real corre suelto.
 *
 * ── FALLA CERRADO ───────────────────────────────────────────────────────────
 *
 * Marcada y sin aprobación explícita → **no se ejecuta**. No es que se avise: es
 * que no corre. Para aplicarla hay que nombrarla, entera y exacta:
 *
 *     NELVYON_MIGRACION_MANUAL_APROBADA=598_quitar_al_rol_de_trabajos_lo_que_no_usa.sql
 *
 * Se admite más de una separándolas por comas. Un nombre que no case con nada
 * NO abre nada: no hay comodines, ni prefijos, ni «la última».
 *
 * ── SE SALTA, NO BLOQUEA ────────────────────────────────────────────────────
 *
 * Una migración retenida se OMITE y el resto sigue. Bloquear el despliegue
 * sería peor: una migración de cutover puede pasarse semanas en el repositorio
 * esperando su momento, y durante esas semanas nadie podría desplegar nada.
 *
 * Eso obliga a una regla al escribirlas: **una migración manual no puede tener
 * descendientes que dependan de ella**. Son terminales por naturaleza —un
 * cutover, una retirada— y por eso la omisión es segura. Si alguna vez hiciera
 * falta una con dependientes, el sitio correcto sería bloquear, no omitir; hoy
 * no existe ese caso y no se construye maquinaria para un caso que no está.
 */

/** La marca que retiene una migración. Va dentro del propio SQL. */
export const MARCA_MANUAL = "NELVYON:MIGRACION_MANUAL";

/** ¿Este SQL declara que no debe aplicarse solo? */
export function estaRetenida(sql: string): boolean {
  return sql.includes(MARCA_MANUAL);
}

/**
 * Los nombres que alguien ha aprobado a mano, exactos.
 *
 * Se comparan enteros: ni prefijos ni comodines. Aprobar «598» a secas no
 * aprueba nada, que es lo que se quiere — el operador tiene que haber mirado
 * QUÉ fichero está soltando.
 */
export function nombresAprobados(valor: string | undefined): Set<string> {
  return new Set(
    (valor ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0),
  );
}

/**
 * ¿Se puede aplicar esta migración?
 *
 * Sin marca, sí: la mayoría son normales. Con marca, sólo si alguien la nombró.
 */
export function sePuedeAplicar(
  fichero: string,
  sql: string,
  aprobadas: Set<string>,
): { aplicar: boolean; motivo: string } {
  if (!estaRetenida(sql)) return { aplicar: true, motivo: "normal" };
  if (aprobadas.has(fichero)) {
    return { aplicar: true, motivo: `manual, aprobada por nombre exacto` };
  }
  return {
    aplicar: false,
    motivo:
      `RETENIDA: lleva ${MARCA_MANUAL} y nadie la ha nombrado. ` +
      `Para aplicarla: NELVYON_MIGRACION_MANUAL_APROBADA=${fichero}`,
  };
}
