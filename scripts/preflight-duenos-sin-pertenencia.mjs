/**
 * Los workspaces cuyo DUEÑO no tiene fila de pertenencia. SOLO LECTURA.
 *
 * NO INSERTA NADA. Solo mide, para poder redactar la sentencia y que Daniel la
 * autorice aparte.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";
const C = ["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n = C.find((x) => (process.env[x] ?? "").trim().length > 0);
const cli = new pg.Client({ connectionString: process.env[n], ssl: { rejectUnauthorized: false }, statement_timeout: 60_000 });
const out = { ok: true };
try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (s, p) => (await cli.query(s, p)).rows;

  out.workspaces = Number((await q(`SELECT count(*)::int AS n FROM workspaces`))[0].n);
  out.pertenencias = Number((await q(`SELECT count(*)::int AS n FROM workspace_members`))[0].n);

  out.duenosSinPertenencia = await q(
    `SELECT w.id AS workspace_id, w.name, w.slug, w.status, w.plan,
            length(w.user_id) AS largo_user_id,
            left(w.user_id, 8) AS user_id_prefijo
       FROM workspaces w
      WHERE NOT EXISTS (
        SELECT 1 FROM workspace_members m
         WHERE m.workspace_id = w.id AND m.user_id = w.user_id
      )
      ORDER BY w.id`,
  );

  // El rol y el estado que tendria la fila nueva, segun lo que ya se usa.
  out.rolesExistentes = await q(
    `SELECT role, status, count(*)::int AS n FROM workspace_members
      GROUP BY role, status ORDER BY n DESC`,
  );
  out.restricciones = (
    await q(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'workspace_members'::regclass ORDER BY conname`,
    )
  ).map((r) => `${r.conname}: ${r.def}`);
  out.indicesUnicos = (
    await q(
      `SELECT pg_get_indexdef(i.oid) AS def FROM pg_class c
         JOIN pg_index x ON x.indrelid = c.oid JOIN pg_class i ON i.oid = x.indexrelid
        WHERE c.relname = 'workspace_members' AND x.indisunique`,
    )
  ).map((r) => r.def);
  out.columnas = (
    await q(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='workspace_members' ORDER BY ordinal_position`,
    )
  ).map((r) => `${r.column_name}:${r.data_type}${r.is_nullable === "NO" ? "!" : ""}`);

  await cli.query("ROLLBACK");
} catch (e) { out.ok = false; out.error = e instanceof Error ? e.message : String(e); }
finally { await cli.end().catch(() => {}); }
console.log(JSON.stringify(out, null, 2));
