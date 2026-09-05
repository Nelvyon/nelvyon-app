/**
 * Un `DbClient` de mentira que ADEMAS encaja con la firma de verdad.
 *
 * ── EL PROBLEMA QUE RESUELVE ────────────────────────────────────────────────
 *
 * `DbClient.query` es generico: `query<T>(sql, params?): Promise<T[]>` devuelve
 * lo que pida quien llama. Treinta y dos ficheros de prueba lo doblaban asi:
 *
 *     query: vi.fn(async () => filas[n++] ?? [])
 *
 * Eso declara CERO parametros y devuelve `Fila[]`, no `T[]`. Doscientos
 * veintiseis errores de tipos salian de esa sola linea repetida:
 *
 *   · 178 × TS2322 — el doble no encaja con `Pick<DbClient, "query">`;
 *   ·  48 × TS2493 — `query.mock.calls[0][0]` indexa una tupla vacia, porque un
 *                    espia sin parametros declarados registra llamadas vacias.
 *
 * Y el fallo de fondo era peor que un error de compilacion: un doble que no
 * declara sus parametros no comprueba NADA sobre como se le llama. Se podia
 * cambiar el orden de `sql` y `params` en el producto y ninguna prueba chistaba.
 *
 * ── POR QUE ESTA CONVERSION Y NO OTRA ───────────────────────────────────────
 *
 * `as T[]` aparece una vez, aqui, y es honesta: un doble NO PUEDE saber que tipo
 * pidio quien llama —esa es la definicion de generico— asi que en algun punto
 * hay que decirlo. Se dice una vez, con nombre y explicacion, en lugar de
 * treinta y dos veces sin ninguna.
 *
 * No hay `as unknown as`, ni `any`, ni `@ts-expect-error`: `sql` y `params` van
 * tipados de verdad, y por eso ahora una prueba SI se entera si el producto
 * cambia como llama a la base de datos.
 *
 * ── POR QUE DEVUELVE `.mock` ────────────────────────────────────────────────
 *
 * `vi.fn` colapsa el generico a `unknown`, asi que el espia no puede SER el
 * doble. Pero las pruebas ya escritas comprueban las llamadas de dos maneras:
 * `db.query.mock.calls[...]` y `expect(db.query).toHaveBeenCalledWith(...)`.
 *
 * Por eso se copia el espia ENTERO y no solo su `.mock`: lo segundo dejaba el
 * doble sin `_isMockFunction` y vitest no lo reconocia como espia, asi que
 * `toHaveBeenCalledWith` habria dejado de funcionar en cuatro ficheros. Con el
 * espia completo, las dos formas siguen valiendo y no hay que reescribir
 * ninguna asercion — que es donde vive lo que de verdad comprueban.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { vi } from "vitest";

/** Una fila tal y como la devuelve la base: columnas sin tipar. */
export type Fila = Record<string, unknown>;

/**
 * @param respuestas  una tanda de filas por cada `query` que se espere, en orden.
 *                    Agotada la lista, devuelve vacio — que es lo que hace una
 *                    consulta que no encuentra nada.
 */
export function consultaFalsa(respuestas: Fila[][] = []) {
  let turno = 0;
  const espia = vi.fn((_sql: string, _params?: unknown[]) => {});
  const query = async <T,>(sql: string, params?: unknown[]): Promise<T[]> => {
    espia(sql, params);
    return (respuestas[turno++] ?? []) as T[];
  };
  return Object.assign(query, espia);
}

/**
 * Igual, pero decidiendo la respuesta a partir del SQL.
 *
 * Algunas pruebas no necesitan «la primera consulta devuelve esto, la segunda
 * aquello» sino «cuando pregunten por X, contesta Y». Devolver `undefined` deja
 * que decida el valor por defecto.
 */
export function consultaFalsaCon(
  responder: (sql: string, params: unknown[]) => Fila[] | undefined,
  porDefecto: Fila[] = [],
) {
  const espia = vi.fn((_sql: string, _params?: unknown[]) => {});
  const query = async <T,>(sql: string, params?: unknown[]): Promise<T[]> => {
    espia(sql, params);
    return (responder(sql, params ?? []) ?? porDefecto) as T[];
  };
  return Object.assign(query, espia);
}
