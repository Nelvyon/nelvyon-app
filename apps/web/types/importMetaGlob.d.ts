/**
 * `import.meta.glob`, que lo aporta Vite y no TypeScript.
 *
 * Vitest corre sobre Vite, asi que en ejecucion existe. Pero sus tipos viven en
 * `vite/client`, dentro de `apps/web/node_modules`, y un fichero de prueba en
 * `backend/` busca hacia arriba desde ahi y no lo encuentra — el mismo motivo
 * por el que `vitest`, `stripe` y `@sentry/nextjs` estan en `paths`.
 *
 * Se declara solo la forma que se usa. Es preferible a arrastrar todos los
 * tipos de cliente de Vite a un programa que no compila para el navegador.
 */
interface ImportMeta {
  /**
   * Los modulos que casan con el patron, cada uno como una funcion que lo
   * importa cuando se le llama.
   *
   * @param patron  ruta relativa AL FICHERO QUE LLAMA, resuelta en compilacion.
   */
  glob<T = unknown>(patron: string): Record<string, () => Promise<T>>;
}
