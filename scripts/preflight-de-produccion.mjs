#!/usr/bin/env node
/**
 * PREFLIGHT DE PRODUCCIÓN. **NO ESCRIBE NADA.**
 *
 * QUÉ CONTESTA. Antes de tocar producción hay que saber exactamente en qué
 * estado está, y «exactamente» no es lo que dice el último informe: es lo que
 * dice la base ahora mismo. Este script mide:
 *
 *   1. Qué migraciones tiene aplicadas, y cuáles del repositorio faltan.
 *   2. Si alguna migración ya aplicada ha cambiado en el repositorio DESPUÉS
 *      de aplicarse. Eso es lo más peligroso que puede haber: la base cree
 *      tener una cosa y el fichero dice otra, y nadie se entera hasta que algo
 *      lee una columna que nunca se creó.
 *   3. Qué objetos crearían las migraciones pendientes y cuáles ya existen —
 *      porque `CREATE TABLE IF NOT EXISTS` sobre una tabla con otra forma no
 *      falla: no hace nada, en silencio.
 *   4. Tamaño de las tablas que las pendientes van a tocar, para saber si
 *      alguna operación va a bloquear algo grande.
 *   5. Estado de RLS y de la cola.
 *
 * LA GARANTÍA DE QUE NO ESCRIBE ES DEL MOTOR, NO DEL AUTOR. La conexión se abre
 * con `default_transaction_read_only=on`: un `INSERT` accidental no fallaría en
 * la revisión de código, fallaría en PostgreSQL. Confiar en que el SQL está
 * bien escrito es exactamente el nivel de confianza que no se le da a algo que
 * corre contra la base de clientes reales.
 *
 * COSTE. Sólo lee catálogos del sistema y recuentos: kilobytes. No vuelca datos
 * de ninguna tabla, no crea nada, no arranca nada. Clasificación:
 * FREE_WITHIN_EXISTING_PLAN.
 *
 * PRIVACIDAD. No imprime ni un correo, ni un identificador de cliente, ni una
 * fila. Sólo nombres de objetos del esquema y recuentos.
 *
 * USO
 *   DATABASE_URL="<...>" node scripts/preflight-de-produccion.mjs
 *
 * SALIDA
 *   0  se pudo medir todo
 *   2  no se pudo medir (sin cadena, sin acceso). Nunca 0 con dudas.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

const DIR_MIG = path.join(RAIZ, "backend", "db", "migrations");

/** Huella de una migración: lo que permite ver si cambió tras aplicarse. */
function huella(fichero) {
  const sql = fs.readFileSync(path.join(DIR_MIG, fichero), "utf8").replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16);
}

/**
 * Qué objetos declara crear un fichero de migración.
 *
 * Es análisis de texto, no un parser de SQL, y se dice: sirve para saber qué
 * mirar, no para decidir. Lo que decide es si el objeto existe en la base.
 */
function objetosQueCrea(fichero) {
  const bruto = fs.readFileSync(path.join(DIR_MIG, fichero), "utf8");
  /**
   * LOS COMENTARIOS SE QUITAN ANTES DE BUSCAR NADA.
   *
   * La primera versión de esto marcó como peligrosas cuatro migraciones cuyo
   * único `DROP TABLE` estaba dentro del comentario que documenta la vuelta
   * atrás. Un detector que grita cuando no pasa nada enseña a no hacerle caso,
   * y a partir de ahí el aviso que sí importa se lee igual que los otros.
   */
  const sql = bruto
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  const tablas = [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z0-9_."]+)/gi)].map((m) =>
    m[1].replace(/"/g, "").replace(/^public\./, ""),
  );
  const columnas = [
    ...sql.matchAll(/ALTER TABLE\s+([a-z0-9_."]+)[\s\S]{0,80}?ADD COLUMN(?:\s+IF NOT EXISTS)?\s+([a-z0-9_]+)/gi),
  ].map((m) => `${m[1].replace(/"/g, "").replace(/^public\./, "")}.${m[2]}`);
  const indices = [...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF NOT EXISTS)?\s+([a-z0-9_]+)/gi)].map(
    (m) => m[1],
  );
  const peligrosas = [];
  if (/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i.test(sql)) peligrosas.push("DROP");
  if (/\bALTER\s+COLUMN\b[\s\S]{0,60}\bTYPE\b/i.test(sql)) peligrosas.push("ALTER TYPE");
  if (/\bUPDATE\s+[a-z0-9_."]+\s+SET\b/i.test(sql)) peligrosas.push("UPDATE masivo");
  if (/\bDELETE\s+FROM\b/i.test(sql)) peligrosas.push("DELETE");
  if (/\bNOT NULL\b/i.test(sql) && /ADD COLUMN/i.test(sql)) peligrosas.push("NOT NULL en columna nueva");
  return {
    tablas: [...new Set(tablas)],
    columnas: [...new Set(columnas)],
    indices: [...new Set(indices)],
    peligrosas: [...new Set(peligrosas)],
  };
}

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL. No se ha consultado nada.");
    process.exit(2);
  }

  /**
   * El proxy TCP de Railway rechaza conexiones de vez en cuando.
   *
   * Se reintenta tres veces con espera creciente. NO es tapar un problema: no
   * hay nada que arreglar en nuestro lado, y un informe que a veces sale y a
   * veces no obliga a repetirlo a mano, que es cuando se deja de mirar.
   */
  const conReintento = async (fn) => {
    let ultimo;
    for (let i = 0; i < 3; i += 1) {
      try {
        return await fn();
      } catch (e) {
        ultimo = e;
        if (!/ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(String(e.message))) throw e;
        console.error(`  (reintento ${i + 1}/3 tras ${e.code ?? e.message})`);
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw ultimo;
  };

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    statement_timeout: 60_000,
    // La garantía la impone PostgreSQL, no la revisión de código.
    options: "-c default_transaction_read_only=on",
  });
  const q = async (sql, params) => (await pool.query(sql, params)).rows;

  try {
    const host = new URL(dsn.replace(/^postgresql\+asyncpg:/, "postgresql:")).hostname;
    console.log(`objetivo: ${host}`);
    console.log("modo:     SOLO LECTURA (impuesto por PostgreSQL)\n");

    // ── 0 · que de verdad no se puede escribir ────────────────────────────
    let escrituraBloqueada = false;
    try {
      await pool.query("CREATE TEMP TABLE _preflight_no_deberia_existir (x int)");
    } catch (e) {
      escrituraBloqueada = /read-only|solo lectura/i.test(String(e.message));
    }
    console.log(
      `escritura bloqueada por el motor: ${escrituraBloqueada ? "SÍ" : "NO — SE ABORTA"}`,
    );
    if (!escrituraBloqueada) {
      console.error("\nLa conexión NO es de solo lectura. No se sigue.");
      process.exit(2);
    }
    console.log("");

    // ── 1 · el libro de migraciones ───────────────────────────────────────
    const hayLibro = (await conReintento(() => q("SELECT to_regclass('public._migrations')::text AS t")))[0]?.t != null;
    const aplicadas = hayLibro
      ? new Set((await q("SELECT name FROM _migrations")).map((r) => r.name))
      : new Set();
    const enRepo = fs
      .readdirSync(DIR_MIG)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const pendientes = enRepo.filter((f) => !aplicadas.has(f));
    const fantasmas = [...aplicadas].filter((f) => !enRepo.includes(f)).sort();

    console.log("── MIGRACIONES ──────────────────────────────────────────────");
    console.log(`  libro de migraciones: ${hayLibro ? "existe" : "NO EXISTE"}`);
    console.log(`  en el repositorio:    ${enRepo.length}`);
    console.log(`  aplicadas:            ${aplicadas.size}`);
    console.log(`  PENDIENTES:           ${pendientes.length}`);
    // LO QUE ESTE LIBRO NO PUEDE CONTESTAR, y conviene decirlo en voz alta:
    // `_migrations` guarda NOMBRES, no huellas. Si una migración ya aplicada
    // cambia de contenido en el repositorio, la base sigue diciendo que la
    // tiene y nadie puede saber que ya no es la misma. Las huellas de las
    // pendientes se imprimen abajo para poder compararlas después de aplicar.
    console.log("  el libro guarda nombres, NO huellas: una migración aplicada que");
    console.log("  cambie de contenido no se puede detectar desde la base.");
    if (fantasmas.length > 0) {
      console.log(`  aplicadas que YA NO ESTÁN en el repositorio: ${fantasmas.length}`);
      for (const f of fantasmas.slice(0, 10)) console.log(`     · ${f}`);
    }
    console.log("");
    for (const f of pendientes) console.log(`  pendiente · ${f}  [${huella(f)}]`);
    console.log("");

    // ── 2 · lo que crearían las pendientes, y si ya está ──────────────────
    console.log("── LO QUE CREARÍAN LAS PENDIENTES ───────────────────────────");
    const yaExisteTabla = async (t) =>
      (await q("SELECT to_regclass($1)::text AS t", [`public.${t}`]))[0]?.t != null;
    const yaExisteColumna = async (t, c) =>
      (
        await q(
          `SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
          [t, c],
        )
      ).length > 0;
    const yaExisteIndice = async (i) =>
      (await q(`SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=$1`, [i])).length > 0;

    const colisiones = [];
    const riesgos = [];
    let tablasNuevas = 0;
    let columnasNuevas = 0;
    for (const f of pendientes) {
      const o = objetosQueCrea(f);
      const chocaT = [];
      for (const t of o.tablas) {
        if (await yaExisteTabla(t)) chocaT.push(t);
        else tablasNuevas += 1;
      }
      const chocaC = [];
      for (const c of o.columnas) {
        const [t, col] = c.split(".");
        if (await yaExisteColumna(t, col)) chocaC.push(c);
        else columnasNuevas += 1;
      }
      const chocaI = [];
      for (const i of o.indices) if (await yaExisteIndice(i)) chocaI.push(i);

      if (chocaT.length || chocaC.length || chocaI.length) {
        colisiones.push({ f, chocaT, chocaC, chocaI });
      }
      if (o.peligrosas.length > 0) riesgos.push({ f, que: o.peligrosas });
    }
    console.log(`  tablas nuevas:   ${tablasNuevas}`);
    console.log(`  columnas nuevas: ${columnasNuevas}`);
    console.log("");
    if (colisiones.length === 0) {
      console.log("  ningún objeto de las pendientes existe ya. Nada que se cree en silencio.");
    } else {
      console.log(`  OBJETOS QUE YA EXISTEN (${colisiones.length} migraciones):`);
      console.log("  `CREATE ... IF NOT EXISTS` sobre algo que ya está NO falla: no hace nada.");
      console.log("  Si la forma no coincide, la base se queda distinta de lo que dice el fichero.");
      for (const c of colisiones) {
        console.log(`   · ${c.f}`);
        if (c.chocaT.length) console.log(`       tablas:   ${c.chocaT.join(", ")}`);
        if (c.chocaC.length) console.log(`       columnas: ${c.chocaC.join(", ")}`);
        if (c.chocaI.length) console.log(`       índices:  ${c.chocaI.join(", ")}`);
      }
    }
    console.log("");
    if (riesgos.length > 0) {
      console.log("  OPERACIONES QUE MERECEN MIRARSE ANTES:");
      for (const r of riesgos) console.log(`   · ${r.f}: ${r.que.join(", ")}`);
      console.log("");
    }

    // ── 3 · tamaño de lo que se va a tocar ────────────────────────────────
    console.log("── TAMAÑO DE LAS TABLAS QUE TOCAN LAS PENDIENTES ────────────");
    const tocadas = new Set();
    for (const f of pendientes) {
      const o = objetosQueCrea(f);
      for (const t of o.tablas) tocadas.add(t);
      for (const c of o.columnas) tocadas.add(c.split(".")[0]);
    }
    const grandes = await q(
      `SELECT s.relname AS tabla, s.n_live_tup AS filas,
              pg_size_pretty(pg_total_relation_size(s.relid)) AS tamano
         FROM pg_stat_user_tables s
        WHERE s.schemaname = 'public' AND s.relname = ANY($1)
        ORDER BY s.n_live_tup DESC LIMIT 15`,
      [[...tocadas]],
    );
    if (grandes.length === 0) console.log("  ninguna de las tablas que tocan existe todavía.");
    for (const g of grandes) {
      console.log(`  ${String(g.filas).padStart(9)} filas · ${String(g.tamano).padStart(10)} · ${g.tabla}`);
    }
    console.log("");

    // ── 4 · estado general del esquema ────────────────────────────────────
    console.log("── ESTADO DEL ESQUEMA ───────────────────────────────────────");
    const tablas = (await q(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'`,
    ))[0].n;
    const conRls = (await q(
      `SELECT count(*)::int AS n FROM pg_class c
         JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity`,
    ))[0].n;
    const politicas = (await q(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`))[0].n;
    const indices = (await q(`SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public'`))[0].n;
    console.log(`  tablas:            ${tablas}`);
    console.log(`  con RLS activada:  ${conRls}`);
    console.log(`  políticas RLS:     ${politicas}`);
    console.log(`  índices:           ${indices}`);
    const version = (await q("SELECT version() AS v"))[0].v;
    console.log(`  PostgreSQL:        ${version.split(" ").slice(0, 2).join(" ")}`);
    console.log("");

    // ── 5 · la cola y los trabajos parados ────────────────────────────────
    if (await yaExisteTabla("os_jobs")) {
      console.log("── LA COLA ──────────────────────────────────────────────────");
      const est = await q(
        `SELECT status, count(*)::int AS n,
                min(created_at)::date::text AS mas_antiguo
           FROM os_jobs GROUP BY status ORDER BY n DESC`,
      );
      for (const e of est) {
        console.log(`  ${String(e.n).padStart(5)} · ${String(e.status).padEnd(12)} (el más antiguo: ${e.mas_antiguo})`);
      }
      console.log("");
    }

    // ── 6 · bloqueos vivos ────────────────────────────────────────────────
    const bloqueos = (await q(
      `SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted`,
    ))[0].n;
    const conexiones = (await q(
      `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()`,
    ))[0].n;
    const idleTx = (await q(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database() AND state = 'idle in transaction'`,
    ))[0].n;
    console.log("── AHORA MISMO ──────────────────────────────────────────────");
    console.log(`  conexiones abiertas:            ${conexiones}`);
    console.log(`  bloqueos sin conceder:          ${bloqueos}`);
    console.log(`  transacciones abiertas y ociosas: ${idleTx}`);
    if (idleTx > 0) {
      console.log("  ATENCIÓN: una transacción ociosa retiene bloqueos y hará esperar a un ALTER TABLE.");
    }
    console.log("");

    console.log("── VEREDICTO ────────────────────────────────────────────────");
    const problemas = [];
    if (!hayLibro) problemas.push("no hay libro de migraciones: no se sabe qué está aplicado");
    if (fantasmas.length > 0) problemas.push(`${fantasmas.length} migraciones aplicadas ya no están en el repositorio`);
    if (colisiones.length > 0) problemas.push(`${colisiones.length} migraciones pendientes tocan objetos que ya existen`);
    if (idleTx > 0) problemas.push("hay transacciones ociosas que pueden bloquear un ALTER");
    if (problemas.length === 0) {
      console.log("  Sin sorpresas. Las pendientes crean cosas que no están.");
    } else {
      for (const p of problemas) console.log(`  · ${p}`);
    }
    console.log("");
  } catch (e) {
    console.error("\nNo se pudo medir:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
