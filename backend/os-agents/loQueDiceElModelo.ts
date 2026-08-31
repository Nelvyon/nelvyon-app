/**
 * Leer un si o un no de lo que devuelve un modelo, sin regalar ninguno.
 *
 * ── POR QUE ESTO NO ES `Boolean(x)` ─────────────────────────────────────────
 *
 * En JavaScript `Boolean("false")` es `true`. Tambien `Boolean("no")`,
 * `Boolean("0")`, `Boolean([])` y `Boolean({})`: cualquier cosa que no sea
 * cadena vacia, cero, `null` o `undefined`.
 *
 * Y los modelos devuelven booleanos como cadena constantemente — es de los
 * desajustes mas comunes al pedir JSON. Asi que `Boolean(respuesta.passed)`
 * convertia un `"passed": "false"` en un aprobado.
 *
 * Paso de verdad en dos sitios:
 *
 *   QualityEvaluatorService   `passed` cortaba el bucle de mejora, asi que un
 *                             `"false"` entregaba el output sin mejorar, con
 *                             un 40 sobre 100 y marcado como bueno.
 *   auditlog/shared           `anomalyDetected` al reves: un `"false"` levantaba
 *                             una alarma que el modelo no habia dado. Un
 *                             detector que grita lobo ensena a ignorarlo.
 *
 * ── POR QUE EL CONJUNTO ES ESTRECHO ─────────────────────────────────────────
 *
 * Solo `true`/`false` de verdad y las cadenas `"true"`, `"false"`, `"1"`, `"0"`.
 * Ni `"yes"`, ni `"si"`, ni `"y"`.
 *
 * No es purismo: es que la laxitud, en una puerta, apunta siempre al mismo
 * lado. Aceptar mas formas de decir «si» solo puede abrir puertas; no reconocer
 * un «yes» devuelve `undefined`, y quien llama lo trata como «no sabemos», que
 * en una aprobacion significa no aprobar y en una alarma significa no alertar.
 * Las dos son la respuesta prudente.
 *
 * El conjunto sale de `IntakeFormService`, que ya lo tenia bien resuelto en
 * privado. Aqui solo se saca a un sitio comun para que deje de haber tres
 * lecturas distintas de la misma cosa.
 *
 * COSTE EXTERNO: 0 EUR.
 */

/**
 * `true`, `false`, o `undefined` cuando el valor no dice ninguna de las dos.
 *
 * Devolver `undefined` en vez de `false` es lo que permite a quien llama
 * distinguir «ha dicho que no» de «no se ha entendido». Son cosas distintas y
 * a veces se responden distinto.
 */
export function siONo(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

/**
 * ¿Ha dicho que SI, explicitamente?
 *
 * Lo que no se entiende cuenta como que no. Es la forma corta para las puertas,
 * donde la duda y el no acaban en el mismo sitio.
 */
export function esUnSi(v: unknown): boolean {
  return siONo(v) === true;
}
