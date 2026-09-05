/**
 * Tipos de `duenos-sin-su-workspace.mjs`, que es JavaScript y lo lee una prueba
 * en TypeScript.
 *
 * Sin esta declaracion la prueba no compilaba (TS7016). Se declara lo que el
 * script exporta de verdad: si cambia alli y no aqui, la prueba deja de
 * compilar, que es lo que tiene que pasar.
 */

/** La consulta que encuentra duenos sin pertenencia a su propio espacio. */
export declare const SQL_DUENOS_SIN_PERTENENCIA: string;
