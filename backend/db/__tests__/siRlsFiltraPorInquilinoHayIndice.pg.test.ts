/**
 * SI RLS FILTRA POR INQUILINO, TIENE QUE HABER ÍNDICE.
 *
 * EL RAZONAMIENTO, que es estructural y no de rendimiento.
 *
 * Una tabla con Row Level Security y una política `workspace_id =
 * current_tenant_id()` obliga a PostgreSQL a añadir ese filtro a TODA consulta
 * que la toque. No hay ninguna lectura que no filtre por inquilino, ni la puede
 * haber: eso es lo que la política significa.
 *
 * Si además no hay ningún índice que empiece por `workspace_id`, entonces cada
 * lectura —para responder por un cliente— recorre las filas de todos.
 *
 * De ahí que esto sea una regla y no una recomendación:
 *
 *     RLS por inquilino  ⟹  índice que empiece por inquilino.
 *
 * POR QUÉ NO SE VIO ANTES. En desarrollo las tablas están casi vacías, y con
 * tablas vacías el escaneo secuencial ES lo correcto: forzar un índice sería
 * más lento. El defecto sólo se nota con volumen, y cuando hay volumen ya
 * duele. Medido sobre 200.000 filas y 500 inquilinos, la diferencia es de 9,88
 * ms a 0,14 ms — 73 veces.
 *
 * LO QUE ESTA PRUEBA PROTEGE. Se encontraron 34 tablas así y la migración 585
 * las arregló. Lo valioso no es ese arreglo: es que la número 35 no llegue a
 * producción. El inventario SALE DEL CATÁLOGO de PostgreSQL, así que una tabla
 * nueva entra sola en la comprobación sin que nadie se acuerde de añadirla.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

let pool: pg.Pool;

conBase("si RLS filtra por inquilino, tiene que haber índice", () => {
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("ninguna tabla con RLS por inquilino se queda sin índice por inquilino", async () => {
    const { rows } = await pool.query<{ tabla: string }>(`
      SELECT c.table_name AS tabla
        FROM information_schema.columns c
        JOIN pg_class pc ON pc.relname = c.table_name
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
       WHERE c.table_schema = 'public'
         AND c.column_name = 'workspace_id'
         AND pc.relrowsecurity
         AND NOT EXISTS (
           SELECT 1
             FROM pg_index i
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
            WHERE i.indrelid = pc.oid AND a.attname = 'workspace_id'
         )
         -- Las mesas de certificacion no cuentan. Varias pruebas de RLS crean su
         -- propia tabla cert_algo, con politicas de verdad y dos filas, y la
         -- dejan puesta; vitest corre los ficheros en paralelo contra la misma
         -- base, asi que esta comprobacion las encontraba y se quejaba con razon
         -- —no tienen indice— de algo que no le incumbe. Se vio con
         -- cert_cutover_rls, que crea elCutoverDelRolDelLadoWeb.pg.test.ts.
         --
         -- Es la peor clase de fallo: el que no esta donde te manda a mirar.
         --
         -- Se compara con left(...) y no con LIKE porque el guion bajo es
         -- comodin en LIKE y escaparlo dentro de una plantilla de JavaScript no
         -- sobrevive. Y no da igual el atajo: certificates y
         -- certificate_templates SI son tablas de producto.
         AND left(c.table_name, 5) <> 'cert_'
       ORDER BY 1`);

    expect(
      rows.map((r) => r.tabla),
      "Estas tablas tienen RLS por inquilino y ningún índice que empiece por " +
      "workspace_id. Cada lectura recorre las filas de TODOS los clientes para " +
      "responder por uno. Añádelas a una migración como la 585.",
    ).toEqual([]);
  });

  it("EL CONTROL POSITIVO: la comprobación sabe encontrar tablas con RLS", async () => {
    // Sin esto, una consulta mal escrita devolvería cero filas siempre y la
    // prueba de arriba pasaría para siempre sin mirar nada. Un guardián que no
    // mira es peor que ninguno, porque además tranquiliza.
    const { rows } = await pool.query<{ n: string }>(`
      SELECT count(*) AS n
        FROM information_schema.columns c
        JOIN pg_class pc ON pc.relname = c.table_name
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
       WHERE c.table_schema = 'public'
         AND c.column_name = 'workspace_id'
         AND pc.relrowsecurity`);

    expect(
      Number(rows[0].n),
      "cero tablas con RLS por inquilino: o la base está vacía o la consulta no mira donde cree",
    ).toBeGreaterThan(50);
  });

  it("el índice que se creó sirve para lo que se creó", async () => {
    // No basta con que EXISTA un índice: tiene que empezar por workspace_id.
    // Uno que lo lleve en segunda posición no ayuda a filtrar por inquilino, y
    // contarlo como válido sería darse por satisfecho con la apariencia.
    const { rows } = await pool.query<{ tabla: string; primera: string }>(`
      SELECT pc.relname AS tabla, a.attname AS primera
        FROM pg_index i
        JOIN pg_class pc ON pc.oid = i.indrelid
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
       WHERE ic.relname LIKE '%\\_ws\\_idx'
       ORDER BY 1`);

    expect(rows.length, "no se creó ningún índice _ws_idx").toBeGreaterThan(0);

    // CUALQUIER columna de inquilino vale, no sólo `workspace_id` exacto.
    // La primera versión de esta prueba suspendía a `partner_rebilling_ledger`
    // y `workspaces` por empezar respectivamente por `partner_workspace_id` y
    // `parent_workspace_id` — que son columnas de inquilino perfectamente
    // legítimas, de otra relación. La regla era más estricta que la verdad, y
    // una regla así acaba desactivada por quien la sufre.
    const malos = rows.filter((r) => !/workspace_id$/.test(r.primera));
    expect(
      malos.map((r) => `${r.tabla} (empieza por ${r.primera})`),
      "un índice llamado _ws_idx que no empieza por una columna de inquilino no filtra por inquilino",
    ).toEqual([]);
  });
});
