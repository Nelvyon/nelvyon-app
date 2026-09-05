/**
 * Tipos de `por-que-se-salta-esta-prueba.mjs`, que es JavaScript y lo lee una
 * prueba en TypeScript.
 *
 * Sin esta declaracion la prueba no compilaba (TS7016). Se declara lo que el
 * script exporta de verdad: si cambia alli y no aqui, la prueba deja de
 * compilar, que es exactamente lo que tiene que pasar.
 */

/** En que categoria cae la razon por la que una prueba se salta. */
export type ClaseDeSalto = string;

/** Un `skip` encontrado, con lo que hace falta para juzgarlo. */
export type Salto = {
  fichero: string;
  linea: number;
  /** `describe.skip`, `it.skip`, un alias condicional… */
  forma: string;
  /** La condicion literal, vacia si el salto es incondicional. */
  condicion: string;
  clase: ClaseDeSalto;
};

/** Los ficheros de prueba del arbol, en rutas relativas a la raiz. */
export declare function ficherosDePrueba(raiz?: string): string[];

/** En que categoria cae una condicion de salto. */
export declare function clasificar(condicion: string): ClaseDeSalto;

/** A que apunta un nombre de variable dentro del mismo fichero. */
export declare function resolverNombre(
  texto: string,
  nombre: string,
  profundidad?: number,
): string;

/** Los saltos que hay en un fichero de prueba. */
export declare function saltosDe(rel: string, texto: string): Salto[];
