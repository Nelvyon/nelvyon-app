/**
 * Tipos de `rechazos-que-se-tragan.mjs`, que es JavaScript y lo lee una prueba
 * en TypeScript.
 *
 * Sin esta declaracion la prueba no compilaba (TS7016). Se declara lo que el
 * script exporta de verdad: si cambia alli y no aqui, la prueba deja de
 * compilar, que es exactamente lo que tiene que pasar.
 */

/** Cuanto importa un rechazo tragado. */
export type FuerzaDelHallazgo = "ALTA" | "MEDIA" | "BAJA";

/** Un fallo que se traga en silencio, con lo que hace falta para juzgarlo. */
export type RechazoTragado = {
  fichero: string;
  linea: number;
  /** `catch vacio`, `.catch(() => {})`… */
  forma: string;
  fuerza: FuerzaDelHallazgo;
  /** Si lo que se traga puede ocultar algo que importa. */
  sensible: boolean;
  /** La llamada o mencion que lo delata, si la hay. */
  porQue: string | null;
};

/** Los ficheros de codigo que el barrido revisa, relativos a la raiz. */
export declare function ficherosDeCodigo(raiz?: string): string[];

/** Los rechazos tragados que hay en un fichero. */
export declare function hallazgosEnFichero(rel: string, texto: string): RechazoTragado[];
