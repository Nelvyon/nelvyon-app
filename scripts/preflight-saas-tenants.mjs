/**
 * Por que `saas_tenants` aparece desprotegida en produccion. SOLO LECTURA.
 *
 * No estaba entre las 47 de la 591 porque el barrido que las encontro se hizo
 * contra la base LOCAL, y alli no salia. Esto mide la diferencia.
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
  statement_timeout: 30_000,
});

const salida = { ok: true };
try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  salida.tabla = (
    await q(
      `SELECT c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
              pg_get_userbyid(c.relowner) AS propietario,
              (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS politicas
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE c.relkind = 'r' AND c.relname = 'saas_tenants'`,
    )
  )[0];

  salida.columnas = (
    await q(
      `SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS tipo
         FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
          AND NOT a.attisdropped
        WHERE c.relname = 'saas_tenants' AND c.relkind = 'r' ORDER BY a.attnum`,
    )
  ).map((r) => `${r.attname}:${r.tipo}`);

  salida.filas = Number((await q("SELECT count(*)::int AS n FROM saas_tenants"))[0].n);

  salida.grants = await q(
    `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privilegios
       FROM information_schema.table_privileges
      WHERE table_schema = 'public' AND table_name = 'saas_tenants'
      GROUP BY grantee ORDER BY grantee`,
  );

  salida.indices = (
    await q(
      `SELECT i.relname AS indice, pg_get_indexdef(i.oid) AS definicion
         FROM pg_class c JOIN pg_index x ON x.indrelid = c.oid
         JOIN pg_class i ON i.oid = x.indexrelid
        WHERE c.relname = 'saas_tenants'`,
    )
  ).map((r) => r.definicion);

  // Quien la usa: es la fuente de `nelvyon_current_saas_tenant_uuid`, la funcion
  // de la que dependen 145 politicas de OTRAS tablas.
  salida.laUsaLaFuncion = Number(
    (
      await q(
        `SELECT count(*)::int AS n FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
          WHERE p.proname = 'nelvyon_current_saas_tenant_uuid'
            AND pg_get_functiondef(p.oid) LIKE '%saas_tenants%'`,
      )
    )[0].n,
  );

  salida.politicasQueDependenDeEsaFuncion = Number(
    (
      await q(
        `SELECT count(*)::int AS n FROM pg_policies
          WHERE coalesce(qual,'') LIKE '%nelvyon_current_saas_tenant_uuid%'
             OR coalesce(with_check,'') LIKE '%nelvyon_current_saas_tenant_uuid%'`,
      )
    )[0].n,
  );

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
