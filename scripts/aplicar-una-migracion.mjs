/**
 * Aplica UNA migracion, con la misma semantica que `migrate-pg.mjs`.
 *
 * POR QUE EXISTE. `migrate-pg.mjs` aplica todas las pendientes de una tirada.
 * Para una escritura en produccion autorizada migracion a migracion —aplicar,
 * verificar, aplicar, verificar— hace falta poder pedir exactamente una.
 *
 * QUE HACE IGUAL QUE `migrate-pg.mjs`, a proposito:
 *
 *   · lee el fichero tal cual, sin trocearlo;
 *   · lo manda en UNA sola sentencia, que en el protocolo simple de PostgreSQL
 *     va dentro de una transaccion implicita: si algo falla, no queda nada a
 *     medias;
 *   · anota el nombre en `_migrations` SOLO si termino bien.
 *
 * QUE NO HACE, tambien a proposito:
 *
 *   · NO tiene `MIGRATE_TOLERATE`. Ese interruptor se traga errores como
 *     «already exists» y anota la migracion como aplicada igual. Es exactamente
 *     lo que dejo la 507 anotada sin haber ejecutado 55 de sus sentencias. Aqui
 *     un fallo es un fallo: se para y se dice cual.
 *   · NO salta el orden. Si hay una migracion anterior pendiente, se niega: una
 *     migracion aplicada fuera de orden puede encontrarse el esquema que no
 *     esperaba.
 *
 * USO:  node scripts/aplicar-una-migracion.mjs 590_lo_que_sea.sql
 *
 * COSTE EXTERNO: 0 EUR mas alla del propio almacenamiento incremental.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const fichero = process.argv[2];
if (!fichero) {
  console.error(JSON.stringify({ ok: false, error: "falta el nombre de la migracion" }));
  process.exit(2);
}

const CANDIDATOS = ["DATABASE_PUBLIC_URL", "POSTGRES_PUBLIC_URL", "DATABASE_URL", "POSTGRES_URL"];
const nombreVar = CANDIDATOS.find((n) => (process.env[n] ?? "").trim().length > 0);
if (!nombreVar) {
  console.error(JSON.stringify({ ok: false, error: `sin DSN: ${CANDIDATOS.join(", ")}` }));
  process.exit(2);
}

const dir = path.resolve(process.cwd(), "backend/db/migrations");
const ruta = path.join(dir, fichero);
if (!fs.existsSync(ruta)) {
  console.error(JSON.stringify({ ok: false, error: `no existe ${ruta}` }));
  process.exit(2);
}
const sql = fs.readFileSync(ruta, "utf8");

/** El destino sin credenciales: para saber DONDE se va a escribir. */
function destino(dsn) {
  try {
    const u = new URL(dsn);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(dsn ilegible)";
  }
}

const cli = new pg.Client({
  connectionString: process.env[nombreVar],
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  statement_timeout: 120_000,
});

const avisos = [];
cli.on("notice", (m) => {
  if (m?.message) avisos.push(m.message);
});

const salida = { migracion: fichero, destino: destino(process.env[nombreVar]), ok: false };

try {
  await cli.connect();

  await cli.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )`);

  const yaEsta = await cli.query("SELECT 1 FROM _migrations WHERE name = $1", [fichero]);
  if (yaEsta.rowCount > 0) {
    salida.ok = true;
    salida.yaAplicada = true;
    salida.nota = "ya figuraba en el ledger; no se ha ejecutado nada";
    console.log(JSON.stringify(salida, null, 2));
    await cli.end();
    process.exit(0);
  }

  // EL ORDEN IMPORTA. Cualquier migracion anterior pendiente se declara y se para.
  const todas = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const anteriores = todas.slice(0, todas.indexOf(fichero));
  const aplicadas = new Set(
    (await cli.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
  );
  const pendientesAntes = anteriores.filter((f) => !aplicadas.has(f));
  if (pendientesAntes.length > 0) {
    salida.error = `hay migraciones anteriores pendientes: ${pendientesAntes.join(", ")}`;
    console.error(JSON.stringify(salida, null, 2));
    await cli.end();
    process.exit(1);
  }

  const t0 = Date.now();
  await cli.query(sql);
  salida.duracionMs = Date.now() - t0;

  await cli.query("INSERT INTO _migrations (name) VALUES ($1)", [fichero]);
  salida.ok = true;
  salida.avisos = avisos;
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
  salida.avisos = avisos;
  console.error(JSON.stringify(salida, null, 2));
  await cli.end().catch(() => {});
  process.exit(1);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
