/**
 * Una fixture completa con unos pocos campos cambiados.
 *
 * ── POR QUE NO `{ ...base, ...ajustes }` ────────────────────────────────────
 *
 * Es lo que hacia media docena de fixtures, y no compila. Al esparcir un
 * `Partial<T>`, TypeScript no distingue «esta clave no viene» de «esta clave
 * viene valiendo undefined», asi que TODO campo ajustable pasa a admitir
 * `undefined` y el resultado deja de ser un `T` completo.
 *
 * Y la distincion importa de verdad, no solo para el compilador: pasar
 * `{ estado: undefined }` no deberia dejar sin estado a una fila que lo exige.
 * Aqui un `undefined` explicito NO pisa el valor base, que es lo que cualquiera
 * espera de una funcion llamada «con estos ajustes».
 *
 * COSTE EXTERNO: 0 EUR.
 */
export function conAjustes<T extends object>(base: T, ajustes: Partial<T> = {}): T {
  const salida: T = { ...base };
  for (const [clave, valor] of Object.entries(ajustes)) {
    // Un ajuste ausente no borra nada; solo se aplica lo que trae valor.
    if (valor !== undefined) {
      (salida as Record<string, unknown>)[clave] = valor;
    }
  }
  return salida;
}
