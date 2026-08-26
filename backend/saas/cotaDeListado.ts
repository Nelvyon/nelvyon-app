/**
 * La cota de un listado.
 *
 * Un listado sin cota es correcto el primer mes y es un incidente el sexto. Está
 * MEDIDO en `unListadoSinCotaCreceConElCliente.pg.test.ts`: una secuencia con
 * 5 000 inscripciones devuelve 5 000 filas y **1 821 KiB** en una sola respuesta.
 * Con 50 000 son dieciocho megabytes: memoria en el proceso, un `JSON.stringify`
 * que bloquea el bucle de eventos mientras dura, y un navegador que no sabe qué
 * hacer con ello.
 *
 * Tres decisiones, y las tres importan:
 *
 *   1. **La cota se aplica en SQL**, no en JavaScript. Cortar en el proceso
 *      significa que PostgreSQL ya ha leído las filas, las ha serializado y las
 *      ha mandado por la red: el trabajo caro ya está hecho. `LIMIT` es lo único
 *      que lo evita.
 *
 *   2. **Después de ordenar.** `ORDER BY ... LIMIT` devuelve las N más
 *      recientes; `LIMIT` sin orden devuelve N cualesquiera. La diferencia entre
 *      acotar y estropear.
 *
 *   3. **El valor por defecto es generoso.** Una cota corta de más rompe casos
 *      legítimos y lo hace de forma intermitente, que es la avería más cara de
 *      diagnosticar. Quinientas filas cubren cualquier listado que una persona
 *      vaya a leer, y quien necesite más lo pide explícitamente.
 */

/** Cota por defecto. Generosa a propósito: ver el punto 3 de arriba. */
export const COTA_DE_LISTADO_POR_DEFECTO = 500;

/** Techo absoluto. Ni siquiera la configuración puede pedir más. */
export const COTA_DE_LISTADO_MAXIMA = 10_000;

/**
 * Cuántas filas devuelve un listado.
 *
 * @param pedida Lo que pide quien llama, si es que pide algo.
 */
export function cotaDeListado(pedida?: number | null): number {
  const deEntorno = Number.parseInt(process.env.NELVYON_LISTADO_MAX ?? "", 10);
  const base = Number.isInteger(deEntorno) && deEntorno > 0
    ? deEntorno
    : COTA_DE_LISTADO_POR_DEFECTO;
  const n = Number.isInteger(pedida) && (pedida as number) > 0 ? (pedida as number) : base;
  return Math.min(Math.max(1, n), COTA_DE_LISTADO_MAXIMA);
}
