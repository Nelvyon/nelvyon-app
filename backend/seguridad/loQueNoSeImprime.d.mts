/**
 * Tipos de `loQueNoSeImprime.mjs`.
 *
 * EL MÓDULO ESTÁ EN `.mjs` A PROPÓSITO: lo importan tanto TypeScript
 * —`colaDeTrabajos.ts`, `LlmClient.ts`— como los 197 scripts de diagnóstico,
 * que son `.mjs` y no pasan por el compilador. Un módulo en `.ts` obligaría a
 * mantener una copia paralela para los scripts, y dos copias de una defensa
 * acaban divergiendo justo cuando importa.
 *
 * Este fichero es lo que le faltaba para que el lado TypeScript no lo vea como
 * `any`. Sin él, `redactar(x)` compilaba sin comprobar nada, que es lo contrario
 * de lo que se pretende con un módulo de seguridad.
 */

/** Sensibilidad deducida del NOMBRE de una variable. */
export function esNombreSensible(nombre: string): boolean;

/**
 * Huella no reversible, para comparar dos valores sin conocer ninguno.
 * Devuelve `"vacio"` o `"demasiado_corto_para_huella"` cuando no procede.
 */
export function huella(valor: string): string;

export interface OpcionesDeDescripcion {
  /** Cuántos caracteres finales mostrar. Exige `porQue`. */
  ultimosCaracteres?: number;
  /** La razón, escrita. Sin ella, `describir` lanza. */
  porQue?: string;
}

/** Describe una variable sin revelarla. Lanza si se pide cola sin razón. */
export function describir(
  nombre: string,
  valor: unknown,
  opciones?: OpcionesDeDescripcion,
): string;

/** Describe un mapa entero sin imprimir ninguna variable sensible. */
export function describirTodas(mapa: Record<string, unknown>): string[];

/**
 * Quita de un texto lo que tenga FORMA de secreto.
 *
 * Es una red para lo que uno no escribió —una traza, un error de proveedor— y
 * no sustituye a `describir`. Sólo reemplaza subcadenas con forma de secreto:
 * un texto sin ellas sale idéntico.
 */
export function redactar(texto: string): string;

/** Un `console.log` que pasa por `redactar` antes de escribir. */
export function imprimirSeguro(...trozos: unknown[]): void;
