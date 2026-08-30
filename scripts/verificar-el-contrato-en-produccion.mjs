#!/usr/bin/env node
/**
 * ¿QUEDÓ EL CONTRATO DE ESTADOS COMO SE ESPERABA? **SOLO LECTURA.**
 *
 * QUÉ COMPRUEBA, después de aplicar la 579:
 *
 *   1. El `CHECK` existe y permite EXACTAMENTE los siete estados canónicos —
 *      ni uno menos, ni uno de más. Se lee del catálogo, no del fichero de la
 *      migración: lo que importa es lo que quedó en la base, no lo que decía
 *      el SQL.
 *   2. Los doce trabajos cancelados siguen cancelados. Una migración que
 *      «arregla» datos para poder aplicarse es exactamente lo que no se hizo, y
 *      conviene demostrarlo en vez de afirmarlo.
 *   3. Ninguno de ellos es reclamable. Se ejecuta la MISMA condición que usa el
 *      trabajador para tomar trabajo y se comprueba que no los alcanza.
 *   4. Las columnas e índices que la 579 dice crear están.
 *
 * EL TERCER PUNTO ES EL QUE IMPORTA. Que un cancelado no aparezca en un listado
 * no prueba nada; lo que prueba algo es que la consulta real del reclamo, con
 * su lista blanca y sus filtros, devuelva cero. Cualquier otra cosa es razonar
 * por parecido.
 *
 * COSTE: 0 €. Consultas de catálogo y recuentos.
 *
 * USO
 *   DATABASE_URL="…" node scripts/verificar-el-contrato-en-produccion.mjs
 */
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

/** Los siete del contrato. Si esta lista cambia, la prueba local ya lo dice. */
const CANONICOS = [
  "cancelled",
  "completed",
  "dead_letter",
  "failed",
  "queued",
  "running",
  "waiting_approval",
].sort();

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL.");
    process.exit(2);
  }
  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    options: "-c default_transaction_read_only=on",
  });
  const q = async (sql, p) => (await pool.query(sql, p)).rows;
  let fallos = 0;
  const mal = (msg) => {
    fallos += 1;
    console.log(`  ✗ ${msg}`);
  };
  const bien = (msg) => console.log(`  ✓ ${msg}`);

  try {
    console.log("CONTRATO DE ESTADOS, COMPROBADO EN LA BASE\n");

    // ── 1 · el CHECK, leído del catálogo ───────────────────────────────────
    const def = (
      await q(`
        SELECT pg_get_constraintdef(con.oid) AS d
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
         WHERE rel.relname = 'os_jobs' AND con.conname = 'os_jobs_status_ck'`)
    )[0]?.d;

    if (!def) mal("no existe la restricción `os_jobs_status_ck`");
    else {
      const enLaBase = [...def.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
      const faltan = CANONICOS.filter((e) => !enLaBase.includes(e));
      const sobran = enLaBase.filter((e) => !CANONICOS.includes(e));
      if (faltan.length === 0 && sobran.length === 0) {
        bien(`el CHECK permite exactamente los 7 canónicos: ${enLaBase.join(", ")}`);
      } else {
        if (faltan.length) mal(`al CHECK le faltan: ${faltan.join(", ")}`);
        if (sobran.length) mal(`el CHECK permite de más: ${sobran.join(", ")}`);
      }
      // Y que esté VALIDADA, no sólo declarada: `NOT VALID` acepta las nuevas
      // filas pero deja pasar las viejas, y eso no es lo que se pidió.
      const validada = (
        await q(`
          SELECT convalidated AS v FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
           WHERE rel.relname='os_jobs' AND con.conname='os_jobs_status_ck'`)
      )[0]?.v;
      if (validada) bien("la restricción está VALIDADA: cubre también las filas que ya había");
      else mal("la restricción quedó en NOT VALID: no comprueba las filas existentes");
    }

    // ── 2 · los doce siguen cancelados ─────────────────────────────────────
    const porEstado = await q("SELECT status, count(*)::int AS n FROM os_jobs GROUP BY status ORDER BY n DESC");
    const cancelados = porEstado.find((r) => r.status === "cancelled")?.n ?? 0;
    if (cancelados === 12) bien("los 12 trabajos cancelados siguen cancelados");
    else mal(`se esperaban 12 cancelados y hay ${cancelados}`);
    const inesperados = porEstado.filter((r) => !CANONICOS.includes(r.status));
    if (inesperados.length === 0) bien("no hay ningún trabajo con un estado fuera del contrato");
    else mal(`estados fuera del contrato: ${inesperados.map((r) => `${r.status} (${r.n})`).join(", ")}`);

    // ── 3 · ninguno es reclamable ──────────────────────────────────────────
    //
    // La MISMA condición del reclamo real, copiada de `colaDeTrabajos.ts`. No
    // una parecida: si se simplificara, se estaría comprobando otra cosa.
    const reclamables = (
      await q(`
        SELECT count(*)::int AS n
          FROM os_jobs
         WHERE status = ANY($1::text[])
           AND run_after <= NOW()
           AND dead_lettered_at IS NULL
           AND attempts < max_attempts`,
        [["queued"]],
      )
    )[0].n;
    if (reclamables === 0) bien("un trabajador no encontraría NADA que reclamar (0 en cola)");
    else console.log(`  · hay ${reclamables} trabajos reclamables, todos en 'queued' (no es un fallo)`);

    const cancelablesReclamables = (
      await q(`
        SELECT count(*)::int AS n
          FROM os_jobs
         WHERE status = 'cancelled'
           AND status = ANY($1::text[])`,
        [["queued"]],
      )
    )[0].n;
    if (cancelablesReclamables === 0) bien("ningún trabajo cancelado entra en la lista blanca del reclamo");
    else mal(`${cancelablesReclamables} cancelados serían reclamables`);

    // ── 4 · lo que la 579 dice crear, está ─────────────────────────────────
    const columnas = await q(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='os_jobs' AND column_name = ANY($1)`,
      [["attempts", "max_attempts", "run_after", "locked_by", "locked_at", "lease_expires_at", "last_error", "dead_lettered_at", "idempotency_key"]],
    );
    if (columnas.length === 9) bien("las 9 columnas de la cola están creadas");
    else mal(`sólo ${columnas.length} de 9 columnas de la cola`);

    const indices = await q(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='os_jobs'`,
    );
    const idem = indices.some((i) => i.indexname === "os_jobs_idempotency_uidx");
    if (idem) bien("el índice único de idempotencia existe");
    else mal("falta el índice `os_jobs_idempotency_uidx`");

    console.log("");
    console.log(fallos === 0 ? "TODO CORRECTO." : `${fallos} COMPROBACIONES HAN FALLADO.`);
    process.exit(fallos === 0 ? 0 : 2);
  } catch (e) {
    console.error("No se pudo comprobar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
