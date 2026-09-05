/**
 * Tipos de `responden-los-dominios.mjs`, que es JavaScript y lo lee una prueba
 * en TypeScript.
 *
 * Sin esta declaracion la prueba no compilaba (TS7016). Se declara lo que el
 * script exporta de verdad: si cambia alli y no aqui, la prueba deja de
 * compilar, que es exactamente lo que tiene que pasar.
 */

/** En que estado esta un host. Solo los dos primeros cuentan como que sirve. */
export type EstadoDeHost =
  | "SIRVE"
  | "REDIRIGE_AL_CANONICO"
  | "REDIRIGE_A_OTRO_SITIO"
  | "NO_DADO_DE_ALTA_EN_RAILWAY"
  | "NO_RESPONDE"
  | "ROTO";

/** Lo que se observo al llamar a un host. */
export type RespuestaDeHost = {
  code: number;
  redirigeA?: string | null;
  error?: string | null;
  /** Railway responde 404 con esta cabecera cuando el dominio no esta dado de alta. */
  fallbackDeRailway?: boolean;
};

export type VeredictoDeHost = {
  estado: EstadoDeHost;
  porQue: string;
};

/** Los hosts que el proyecto declara servir. */
export declare function hostsDeclarados(fuente?: string): string[];

/** Si un host sirve, y por que. */
export declare function veredicto(r: RespuestaDeHost, canonico?: string): VeredictoDeHost;
