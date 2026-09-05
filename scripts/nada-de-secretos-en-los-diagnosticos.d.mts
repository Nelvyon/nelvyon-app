/**
 * Tipos de `nada-de-secretos-en-los-diagnosticos.mjs`, que es JavaScript y lo
 * lee una prueba en TypeScript.
 *
 * Sin esta declaracion la prueba no compilaba (TS7016). Se declara lo que el
 * script exporta de verdad: si cambia alli y no aqui, la prueba deja de
 * compilar, que es exactamente lo que tiene que pasar.
 */

/** Un secreto detectado en una linea, con el motivo por el que lo es. */
export type HallazgoDeSecreto = {
  /** Que clase de fuga es. */
  forma: string;
  /** El trozo concreto que la delata. */
  detalle: string;
};

/** Los trozos de una linea que son codigo y no prosa. */
export declare function fragmentosDeCodigo(linea: string): string[];

/** Lo que parece un secreto dentro de una linea. */
export declare function hallazgosEnLinea(linea: string): HallazgoDeSecreto[];

/** Los ficheros que el barrido revisa, en rutas relativas a la raiz. */
export declare function ficherosAAuditar(raiz?: string): string[];
