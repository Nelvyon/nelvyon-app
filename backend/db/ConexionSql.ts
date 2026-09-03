/**
 * Lo UNICO que casi todo el codigo necesita de una conexion: poder consultar.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────────
 *
 * Este repositorio tiene DOS conexiones, y la diferencia importa:
 *
 *   `DbClient`      la de las peticiones. Tras el cutover apuntara a
 *                   `nelvyon_web_app`, que NO salta RLS.
 *   `DbJobsClient`  la del trabajo entre inquilinos. Usa `nelvyon_web_jobs`,
 *                   que SI salta RLS, y por eso su aislamiento depende del
 *                   `WHERE` que escriba cada consulta.
 *
 * Una funcion que anota `db: DbClient` esta diciendo mas de lo que necesita:
 * no usa nada de esa CLASE, solo `query`. Y ese exceso tiene un precio medido:
 * el webhook de Stripe no podia migrarse a la conexion correcta porque el tipo
 * se propagaba por toda la cadena de cobro — 19 sitios, y de ahi a
 * `dunningService` y a `resolveUserEmailLocale`.
 *
 * Declarar la FORMA en vez de la clase desacopla la cadena de cual le toque.
 * Ambos clientes la satisfacen por estructura, sin heredar de nada, y un doble
 * de prueba tambien: `{ query: vi.fn() }` vale sin fingir ser un `DbClient`.
 *
 * ── LO QUE NO HACE ──────────────────────────────────────────────────────────
 *
 * NO decide cual conexion se usa. Eso lo decide quien construye, y es una
 * decision de seguridad, no de tipos: una ruta entre inquilinos pasa
 * `DbJobsClient`; una ruta de peticion pasa `DbClient`. El guardian
 * `test_las_rutas_entre_inquilinos_usan_la_conexion_correcta` vigila esa
 * eleccion; este fichero solo deja de estorbarla.
 */
export type ConexionSql = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};
