/**
 * LA PREGUNTA INVERSA, EN PRODUCCION. SOLO LECTURA.
 *
 * POR QUE HAY QUE HACERLA AQUI Y NO EN LOCAL. La migracion 567 aplica RLS en
 * masa pero SALTA las tablas que tienen filas:
 *
 *     IF tiene_filas THEN … '567: % tiene filas; pertenece a otro lote' … CONTINUE
 *
 * Fue una decision prudente en su momento —no tocar tablas pobladas en un
 * barrido automatico— y el «otro lote» nunca llego.
 *
 * El efecto secundario es que ESTE DEFECTO SOLO EXISTE EN PRODUCCION. En una
 * base local recien migrada todas esas tablas estan vacias, asi que la 567 SI
 * las cubre y la auditoria local las ve protegidas. La unica forma de saber
 * cuales quedaron fuera es preguntarselo a produccion.
 *
 * NO ESCRIBE NADA. Transaccion `READ ONLY`.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";

const CANDIDATOS = ["DATABASE_PUBLIC_URL", "POSTGRES_PUBLIC_URL", "DATABASE_URL", "POSTGRES_URL"];
const nombre = CANDIDATOS.find((n) => (process.env[n] ?? "").trim().length > 0);
if (!nombre) {
  console.error(JSON.stringify({ ok: false, error: "sin DSN" }));
  process.exit(2);
}

const cli = new pg.Client({
  connectionString: process.env[nombre],
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  statement_timeout: 120_000,
});

const salida = { ok: true };

try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  // Toda tabla con columna de dueño, SIN RLS, legible por un rol de aplicacion.
  const abiertas = await q(
    `SELECT t.table_name AS tabla,
            (SELECT string_agg(DISTINCT c.column_name, '+' ORDER BY c.column_name)
               FROM information_schema.columns c
              WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                AND c.column_name IN ('user_id','tenant_id','workspace_id')) AS columnas,
            (SELECT string_agg(DISTINCT tp.grantee, ',' ORDER BY tp.grantee)
               FROM information_schema.table_privileges tp
              WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name
                AND tp.privilege_type = 'SELECT'
                AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs')) AS lee
       FROM information_schema.tables t
       JOIN pg_class pc ON pc.relname = t.table_name
       JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        AND NOT pc.relrowsecurity
        AND left(t.table_name, 5) <> 'cert_'
        AND EXISTS (SELECT 1 FROM information_schema.columns c
                     WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                       AND c.column_name IN ('user_id','tenant_id','workspace_id'))
        AND EXISTS (SELECT 1 FROM information_schema.table_privileges tp
                     WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name
                       AND tp.privilege_type = 'SELECT'
                       AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs'))
      ORDER BY 1`,
  );

  // Cuantas filas tiene cada una: lo que decide si es deuda o fuga viva.
  for (const a of abiertas) {
    a.filas = Number((await q(`SELECT count(*)::int AS n FROM public."${a.tabla}"`))[0].n);
    const cols = await q(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
          AND (column_name LIKE '%token%' OR column_name LIKE '%secret%'
            OR column_name LIKE '%password%' OR column_name LIKE '%_key%'
            OR column_name LIKE 'key_%' OR column_name LIKE '%auth%'
            OR column_name IN ('email','phone','ip_address'))
        ORDER BY 1`,
      [a.tabla],
    );
    a.columnasSensibles = cols.map((c) => c.column_name);
  }

  salida.abiertas = abiertas;
  salida.total = abiertas.length;
  salida.conDatos = abiertas.filter((a) => a.filas > 0);
  salida.vacias = abiertas.filter((a) => a.filas === 0).map((a) => a.tabla);
  salida.filasExpuestas = abiertas.reduce((s, a) => s + a.filas, 0);

  // El total protegido, para tener el denominador.
  salida.denominador = {
    tablasTotales: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
        )
      )[0].n,
    ),
    conRls: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
            WHERE c.relkind = 'r' AND c.relrowsecurity`,
        )
      )[0].n,
    ),
  };

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
