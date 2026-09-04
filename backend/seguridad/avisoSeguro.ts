/**
 * Contar que algo ha fallado sin contar de paso una credencial.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * Un mensaje de error no es texto neutro. `connect ECONNREFUSED
 * postgresql://usuario:CLAVE@host:5432/db` es un error de conexión perfectamente
 * normal, y lleva dentro la contraseña de la base de datos.
 *
 * Esto ya pasó en este repositorio: el aviso del bucle de aprendizaje truncaba
 * el error a 120 caracteres «por si acaso», y un DSN con credenciales cabe de
 * sobra en 120 caracteres. Lo cazó su propia prueba.
 *
 * Se midió después: TREINTA Y UN módulos en camino de producción registran el
 * error crudo. No es que estén mal escritos — es que nadie tenía a mano una
 * forma corta de hacerlo bien.
 *
 * ── POR QUÉ REDACTAR Y NO TRUNCAR ───────────────────────────────────────────
 *
 * Truncar no protege: sólo esconde la mitad del secreto y deja la otra. Y a
 * cambio pierde el final del mensaje, que suele ser la parte útil.
 *
 * ── POR QUÉ NO SE TRAGA EL ERROR ────────────────────────────────────────────
 *
 * Un fallo que no se cuenta es indistinguible de que no haya pasado nada. Esto
 * NO silencia: escribe lo mismo, sin lo que no debe salir.
 */
import { redactar } from "./formaDeUnSecreto.mjs";

/** Cuánto se conserva del mensaje. Suficiente para reconocer el fallo. */
const TOPE = 400;

/**
 * El mensaje de un error, ya redactado y acotado.
 *
 * Acepta cualquier cosa porque un `catch` recibe cualquier cosa: un `Error`, un
 * string, un objeto de una librería, `undefined`. Suponer que siempre es un
 * `Error` es cómo un `catch` acaba lanzando su propio fallo.
 */
export function mensajeSeguro(e: unknown): string {
  const crudo =
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : e && typeof e === "object"
          ? String((e as { message?: unknown }).message ?? JSON.stringify(e))
          : String(e ?? "desconocido");
  return String(redactar(crudo)).slice(0, TOPE);
}

/**
 * Deja constancia de un fallo sin filtrar lo que lleve dentro.
 *
 * @param donde  quién está avisando, entre corchetes en el registro.
 * @param que    qué se estaba intentando, en una frase.
 */
export function avisoSeguro(donde: string, que: string, e: unknown): void {
  console.warn(`[${donde}] ${que}: ${mensajeSeguro(e)}`);
}

/** Igual, para lo que sí es un error del que hay que enterarse. */
export function errorSeguro(donde: string, que: string, e: unknown): void {
  console.error(`[${donde}] ${que}: ${mensajeSeguro(e)}`);
}
