/**
 * Declaraciones para `formaDeUnSecreto.mjs`.
 *
 * Sin esto, quien lo importa desde TypeScript recibe `any` y pierde toda
 * comprobacion — que en un modulo cuyo trabajo es decidir si algo es un secreto
 * es justo lo que no conviene.
 */

/** ¿El NOMBRE de esta variable sugiere que guarda algo que no debe imprimirse? */
export function esNombreSensible(nombre: string): boolean;

/** Sustituye por marcadores todo lo que TENGA FORMA de secreto dentro de un texto. */
export function redactar(texto: string): string;
