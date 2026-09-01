/**
 * ALCANCE REAL DEL BLOQUE DE INDICES DE LA 591. SOLO LECTURA.
 *
 * POR QUE ESTA COMPROBACION EXISTE. El segundo bloque de la 591 no esta acotado
 * a las 46 tablas del primero: recorre TODA tabla con `user_id`, con RLS y sin
 * indice que empiece por `user_id`. Despues del primer bloque eso incluye las
 * 46... y cualquier OTRA que ya tuviera RLS y le faltara el indice.
 *
 * Importa porque `CREATE INDEX` sin `CONCURRENTLY` toma un bloqueo ACCESS
 * EXCLUSIVE: sobre una tabla vacia es instantaneo, sobre una tabla con millones
 * de filas para las escrituras mientras dura.
 *
 * Esto mide exactamente cuantas serian y cuantas filas tienen, ANTES de escribir.
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
  statement_timeout: 60_000,
});

const salida = { ok: true };

try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  // Las que YA tienen RLS, tienen `user_id` y NO tienen indice por `user_id`.
  // Estas recibirian un indice ADEMAS de las 46, porque el bloque no distingue.
  const yaConRls = await q(
    `SELECT c.relname AS tabla,
            c.reltuples::bigint AS filas_estimadas,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS tamano
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped
      WHERE c.relkind = 'r'
        AND c.relrowsecurity
        AND left(c.relname, 5) <> 'cert_'
        AND NOT EXISTS (
          SELECT 1 FROM pg_index i
            JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
           WHERE i.indrelid = c.oid AND ia.attname = 'user_id'
        )
      ORDER BY c.reltuples DESC`,
  );

  // El recuento real de las que salgan, para no fiarse de la estimacion.
  for (const t of yaConRls) {
    t.filas_reales = Number((await q(`SELECT count(*)::int AS n FROM public."${t.tabla}"`))[0].n);
  }

  salida.yaConRlsSinIndice = yaConRls;
  salida.cuantasExtra = yaConRls.length;
  salida.filasExtraTotales = yaConRls.reduce((a, t) => a + t.filas_reales, 0);

  // La tabla mas grande de toda la base, para saber que se estaria arriesgando
  // en el peor caso si el filtro fallara.
  salida.masGrandes = await q(
    `SELECT c.relname AS tabla, c.reltuples::bigint AS filas_estimadas,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS tamano
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 5`,
  );

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
